import { encryptWithPublicKey, Encrypted } from 'eth-crypto'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

import { test as authTest } from './auth.fixture'
import { TEST_DATA_PATH } from '../helpers/constants'

interface ParticipantData {
  address: string
  privateKey: string
}

interface TestData {
  walletAddress: string
  privateKey: string
  participants: ParticipantData[]
}

interface ExistingAccount {
  address: string
  internal_pub_key: string
  [key: string]: unknown
}

interface MeetingFixtureParams {
  title?: string
  provider?: string
  durationMinutes?: number
}

/**
 * Simple string hash function for creating private info hashes.
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return hash.toString(16)
}

/**
 * Build encrypted participant mapping for the meeting creation API.
 */
async function buildParticipantMapping(
  accountAddress: string,
  publicKey: string,
  meetingId: string,
  slotId: string,
  allSlotIds: string[],
  privateInfo: Record<string, unknown>,
  type: string,
  timezone: string
): Promise<Record<string, unknown>> {
  const privateInfoComplete = JSON.stringify({
    ...privateInfo,
    related_slot_ids: allSlotIds.filter(id => id !== slotId),
  })

  const encrypted: Encrypted = await encryptWithPublicKey(
    publicKey,
    privateInfoComplete
  )

  return {
    account_address: accountAddress,
    meeting_id: meetingId,
    name: '',
    privateInfo: encrypted,
    privateInfoHash: simpleHash(privateInfoComplete),
    slot_id: slotId,
    status: type === 'SCHEDULER' ? 'Accepted' : 'Pending',
    timeZone: timezone,
    type,
    mappingType: 'ADD',
  }
}

/**
 * Create a meeting via the API with encrypted participant data.
 */
async function createMeetingViaAPI(
  request: import('@playwright/test').APIRequestContext,
  params: MeetingFixtureParams = {}
) {
  const {
    title = 'E2E Test Meeting',
    provider = 'JITSI',
    durationMinutes = 30,
  } = params

  // Load test data
  const testData: TestData = JSON.parse(
    fs.readFileSync(TEST_DATA_PATH, 'utf-8')
  )
  const schedulerAddress = testData.walletAddress

  // Fetch scheduler's existing account to get their public key
  const existingResponse = await request.post('/api/accounts/existing', {
    data: {
      addresses: [schedulerAddress],
      fullInformation: true,
    },
  })

  if (existingResponse.status() !== 200) {
    throw new Error(
      `Failed to fetch existing accounts: ${await existingResponse.text()}`
    )
  }

  const existingAccounts = (await existingResponse.json()) as ExistingAccount[]
  const schedulerAccount = existingAccounts.find(
    a => a.address.toLowerCase() === schedulerAddress.toLowerCase()
  )
  if (!schedulerAccount?.internal_pub_key) {
    throw new Error(
      `Scheduler account not found or missing public key: ${schedulerAddress}`
    )
  }

  const meetingId = uuidv4()
  const slotId = uuidv4()
  const allSlotIds = [slotId]

  // Schedule meeting 2 hours from now to avoid edge cases near midnight
  const start = new Date(Date.now() + 2 * 60 * 60_000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  const meetingUrl =
    provider === 'JITSI'
      ? `https://meet.jit.si/meetwith-${meetingId}`
      : `https://meet.example.com/${meetingId}`

  const privateInfo = {
    change_history_paths: [],
    content: '',
    created_at: new Date().toISOString(),
    meeting_id: meetingId,
    meeting_url: meetingUrl,
    participants: [
      {
        account_address: schedulerAddress,
        slot_id: slotId,
        type: 'SCHEDULER',
      },
    ],
    permissions: [],
    provider,
    recurrence: 'NONE',
    related_slot_ids: [],
    reminders: [],
    title,
    rrule: [],
  }

  const serverPubKey =
    process.env.NEXT_PUBLIC_SERVER_PUB_KEY || schedulerAccount.internal_pub_key

  // Build participant mapping for the scheduler
  const participantMapping = await buildParticipantMapping(
    schedulerAddress,
    schedulerAccount.internal_pub_key,
    meetingId,
    slotId,
    allSlotIds,
    privateInfo,
    'SCHEDULER',
    'UTC'
  )

  // Build encrypted metadata for the conference meeting
  const basePrivateInfoComplete = JSON.stringify({
    ...privateInfo,
    related_slot_ids: allSlotIds,
  })
  const encryptedMetadata: Encrypted = await encryptWithPublicKey(
    serverPubKey,
    basePrivateInfoComplete
  )

  const meetingRequest = {
    type: 'CUSTOM',
    participants_mapping: [participantMapping],
    meetingTypeId: '',
    start: start.toISOString(),
    end: end.toISOString(),
    meetingProvider: provider,
    content: '',
    title,
    meeting_url: meetingUrl,
    meeting_id: meetingId,
    meetingReminders: [],
    meetingRepeat: 'NONE',
    allSlotIds,
    meetingPermissions: [],
    ignoreOwnerAvailability: false,
    encrypted_metadata: encryptedMetadata,
    rrule: [],
    version: 1,
  }

  const response = await request.post('/api/secure/meetings', {
    data: meetingRequest,
  })

  if (response.status() !== 200) {
    throw new Error(
      `Meeting creation failed: ${response.status()} ${await response.text()}`
    )
  }

  const result = await response.json()
  return { meetingId, slotId, result }
}

/**
 * Extends the authenticated test fixture with a pre-created meeting.
 * Creates a test meeting via API in beforeEach and returns the slot ID.
 */
export const test = authTest.extend<{
  meetingSlotId: string
  createMeeting: (
    params?: MeetingFixtureParams
  ) => Promise<{ meetingId: string; slotId: string; result: unknown }>
}>({
  meetingSlotId: [
    async ({ request }, use) => {
      const { slotId } = await createMeetingViaAPI(request)
      await use(slotId)
    },
    { scope: 'test' },
  ],
  createMeeting: [
    async ({ request }, use) => {
      await use((params?: MeetingFixtureParams) =>
        createMeetingViaAPI(request, params)
      )
    },
    { scope: 'test' },
  ],
})

export { expect } from '@playwright/test'
