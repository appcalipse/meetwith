import { Encrypted, encryptWithPublicKey } from 'eth-crypto'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'
import { Account } from '../../src/types/Account'
import {
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  ParticipantMappingType,
  SchedulingType,
} from '../../src/types/Meeting'
import {
  ParticipantType,
  ParticipationStatus,
} from '../../src/types/ParticipantInfo'
import {
  MeetingCreationRequest,
  RequestParticipantMapping,
} from '../../src/types/Requests'
import { MeetingPermissions } from '../../src/utils/constants/schedule'
import { TEST_DATA_PATH } from '../helpers/constants'
import { test as authTest } from './auth.fixture'

interface ParticipantData {
  address: string
  privateKey: string
}

interface TestData {
  walletAddress: string
  privateKey: string
  participants: ParticipantData[]
}

interface ExistingAccount extends Account {}

interface MeetingFixtureParams {
  title?: string
  provider?: MeetingProvider
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
  privateInfo: MeetingInfo,
  type: ParticipantType,
  timezone: string
): Promise<RequestParticipantMapping> {
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
    status:
      type === 'scheduler'
        ? ParticipationStatus.Accepted
        : ParticipationStatus.Pending,
    timeZone: timezone,
    type,
    mappingType: ParticipantMappingType.ADD,
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
    provider = MeetingProvider.JITSI_MEET,
    durationMinutes = 30,
  } = params

  // Load test data
  const testData: TestData = JSON.parse(
    fs.readFileSync(TEST_DATA_PATH, 'utf-8')
  )
  const schedulerAddress = testData.walletAddress
  const allAddresses = [
    schedulerAddress,
    ...testData.participants.map(p => p.address),
  ]

  // Fetch existing accounts for all participants to get their public keys
  const existingResponse = await request.post('/api/accounts/existing', {
    data: {
      addresses: allAddresses,
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

  // Schedule meeting 2 hours from now to avoid edge cases near midnight
  const start = new Date(Date.now() + 2 * 60 * 60_000)
  start.setMinutes(0, 0, 0)
  const end = new Date(start.getTime() + durationMinutes * 60_000)

  const meetingUrl =
    provider === 'jitsi-meet'
      ? `https://meet.jit.si/meetwith-${meetingId}`
      : `https://meet.example.com/${meetingId}`

  // Define all participants
  const participantsList = [
    {
      account_address: schedulerAddress,
      type: ParticipantType.Scheduler,
      slot_id: slotId,
      status: ParticipationStatus.Accepted,
      name: schedulerAccount?.preferences?.name,
    },
    ...testData.participants.map(p => {
      const account = existingAccounts.find(
        a => a.address.toLowerCase() === p.address.toLowerCase()
      )
      return {
        account_address: p.address,
        type: ParticipantType.Invitee,
        slot_id: uuidv4(),
        status: ParticipationStatus.Pending,
        name: account?.preferences?.name,
      }
    }),
  ]

  const allSlotIds = participantsList.map(p => p.slot_id)

  const privateInfo: MeetingInfo = {
    change_history_paths: [],
    content: '',
    meeting_id: meetingId,
    meeting_url: meetingUrl,
    created_at: new Date(),
    participants: participantsList.map(p => ({
      ...p,
      meeting_id: meetingId,
    })),
    permissions: [
      MeetingPermissions.SEE_GUEST_LIST,
      MeetingPermissions.INVITE_GUESTS,
      MeetingPermissions.EDIT_MEETING,
    ],
    provider,
    recurrence: MeetingRepeat['NO_REPEAT'],
    related_slot_ids: [],
    reminders: [],
    title,
    rrule: [],
  }

  const serverPubKey =
    process.env.NEXT_PUBLIC_SERVER_PUB_KEY || schedulerAccount.internal_pub_key

  // Build participant mappings for all participants
  const participantMappings = await Promise.all(
    participantsList.map(async p => {
      const account = existingAccounts.find(
        a => a.address.toLowerCase() === p.account_address.toLowerCase()
      )
      if (!account?.internal_pub_key) {
        throw new Error(
          `Account not found or missing public key: ${p.account_address}`
        )
      }
      return buildParticipantMapping(
        p.account_address,
        account.internal_pub_key,
        meetingId,
        p.slot_id,
        allSlotIds,
        privateInfo,
        p.type,
        'UTC'
      )
    })
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

  const meetingRequest: MeetingCreationRequest = {
    participants_mapping: participantMappings,
    meetingTypeId: '',
    start: start,
    end: end,
    meetingProvider: provider,
    content: '',
    title,
    meeting_url: meetingUrl,
    meeting_id: meetingId,
    meetingReminders: [],
    meetingRepeat: MeetingRepeat['NO_REPEAT'],
    allSlotIds,
    meetingPermissions: [
      MeetingPermissions.SEE_GUEST_LIST,
      MeetingPermissions.INVITE_GUESTS,
      MeetingPermissions.EDIT_MEETING,
    ],
    ignoreOwnerAvailability: false,
    encrypted_metadata: encryptedMetadata,
    rrule: [],
    version: 1,
    type: SchedulingType.REGULAR,
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
