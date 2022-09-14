import {
  format,
  getDate,
  getHours,
  getMinutes,
  getMonth,
  getYear,
} from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import {
  decryptWithPrivateKey,
  Encrypted,
  encryptWithPublicKey,
} from 'eth-crypto'
import { Attendee, createEvent, EventAttributes, ReturnObject } from 'ics'
import { v4 as uuidv4 } from 'uuid'

import { Account, DayAvailability, MeetingType } from '@/types/Account'
import {
  CreationRequestParticipantMapping,
  DBSlotEnhanced,
  IPFSMeetingInfo,
  MeetingCreationRequest,
  MeetingDecrypted,
  ParticipantInfo,
  ParticipantMappingType,
  ParticipantType,
  ParticipationStatus,
  SchedulingType,
} from '@/types/Meeting'
import { Plan } from '@/types/Subscription'
import {
  cancelMeeting as apiCancelMeeting,
  getAccount,
  getExistingAccounts,
  getMeeting,
  isSlotFreeApiCall,
  scheduleMeeting as apiScheduleMeeting,
  scheduleMeetingAsGuest,
  updateMeeting as apiUpdateMeeting,
} from '@/utils/api_helper'

import { diff, intersec } from './collections'
import { appUrl, NO_REPLY_EMAIL } from './constants'
import { decryptContent, simpleHash } from './cryptography'
import {
  InvalidURL,
  MeetingCancelForbiddenError,
  MeetingChangeConflictError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from './errors'
import { getSlugFromText } from './generic_utils'
import { generateMeetingUrl } from './meeting_call_helper'
import { CalendarServiceHelper } from './services/calendar.helper'
import { getSignature } from './storage'
import { isProAccount } from './subscription_manager'
import { ellipsizeAddress, getAccountDisplayName } from './user_manager'
import { isValidEmail, isValidUrl } from './validations'

export interface GuestParticipant {
  name: string
  email: string
  scheduler: boolean
}

const mapRelatedSlots = async (meeting: MeetingDecrypted) => {
  const accountSlot: { [account: string]: string } = {}
  for (const slotId of meeting.related_slot_ids) {
    const slot = await getMeeting(slotId)
    accountSlot[slot.account_address] = slotId
  }
  return accountSlot
}

const loadMeetingAccounts = async (
  owner: string,
  meeting: MeetingDecrypted
) => {
  // also make sure that the version of every related db slot is also in sync
  // and that there is a change already going on
  // TODO: change to one fetch all in batch
  const otherSlots = []
  for (const slotId of meeting.related_slot_ids) {
    const otherSlot = await getMeeting(slotId)
    otherSlots.push(otherSlot)
  }

  return [owner, ...otherSlots.map(it => it.account_address)]
}

const buildMeetingData = async (
  schedulingType: SchedulingType,
  target_account_address: string,
  extra_participants: string[],
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  source_account_address?: string,
  guests?: GuestParticipant[],
  sourceName?: string,
  targetName?: string,
  meetingContent?: string,
  meetingUrl?: string,
  participantsMapping?: {
    toAdd: string[]
    toKeep: {
      [account: string]: string
    }
  }
) => {
  if (
    source_account_address === target_account_address &&
    extra_participants.length == 0 &&
    guests?.length == 0
  ) {
    throw new MeetingWithYourselfError()
  }

  if (meetingUrl) {
    if (isValidEmail(meetingUrl)) {
      throw new InvalidURL()
    }
    if (!isValidUrl(meetingUrl)) {
      meetingUrl = `https://${meetingUrl}`
      if (!isValidUrl(meetingUrl)) {
        throw new InvalidURL()
      }
    }
  }

  const allAccounts: Account[] = await getExistingAccounts([
    source_account_address ? source_account_address : '',
    target_account_address,
    ...extra_participants,
  ])
  const participants: ParticipantInfo[] = []

  for (const account of allAccounts) {
    const participant: ParticipantInfo = {
      type:
        account.address === target_account_address
          ? ParticipantType.Owner
          : account.address === source_account_address
          ? ParticipantType.Scheduler
          : ParticipantType.Invitee,
      account_address: account.address,
      status:
        account.address == source_account_address
          ? ParticipationStatus.Accepted
          : ParticipationStatus.Pending,
      slot_id: uuidv4(),
      name:
        account.address === source_account_address
          ? sourceName || getAccountDisplayName(account)
          : getAccountDisplayName(account),
      guest_email: '',
    }
    participants.push(participant)
  }

  const invitedAccounts = extra_participants.filter(
    participant =>
      !allAccounts
        .map(account => account.address.toLowerCase())
        .includes(participant.toLowerCase())
  )

  for (const account of invitedAccounts) {
    const participant: ParticipantInfo = {
      type: ParticipantType.Invitee,
      account_address: account,
      status: ParticipationStatus.Pending,
      slot_id: uuidv4(),
    }

    participants.push(participant)
  }

  if (guests) {
    for (const guest of guests) {
      const participant: ParticipantInfo = {
        type: !!guest.scheduler
          ? ParticipantType.Scheduler
          : ParticipantType.Invitee,
        status: !!guest.scheduler
          ? ParticipationStatus.Accepted
          : ParticipationStatus.Pending,
        guest_email: guest.email,
        name: guest.name,
        slot_id: uuidv4(),
      }

      participants.push(participant)
    }
  }

  const privateInfo: IPFSMeetingInfo = {
    created_at: new Date(),
    participants: participants,
    content: meetingContent,
    meeting_url: meetingUrl || (await generateMeetingUrl()),
    change_history_paths: [],
    related_slot_ids: [],
  }

  // first pass to make sure that we are keeping the existing slot id
  for (const participant of participants) {
    const existingSlotId =
      participantsMapping?.toKeep[participant.account_address || '']
    participant.slot_id = existingSlotId || participant.slot_id
  }

  const allSlotIds = participants.map(it => it.slot_id)
  const participantsMappings = []
  for (const participant of participants) {
    // we use participant key if it is an actual participant, otherwise, it is a
    // guest and have not a PK yet, so we encode data using our pk.
    const encodingKey =
      allAccounts.filter(
        account => account.address == participant.account_address
      )[0]?.internal_pub_key || process.env.NEXT_PUBLIC_SERVER_PUB_KEY!

    const privateInfoComplete = JSON.stringify({
      ...privateInfo,
      // we need to store the other related slots in other to update the meeting later
      related_slot_ids: allSlotIds.filter(id => id !== participant.slot_id),
    } as IPFSMeetingInfo)

    const participantMapping: CreationRequestParticipantMapping = {
      account_address: participant.account_address || '',
      // this is the actual slot id for this participant, we choose it before creation
      slot_id: participant.slot_id,
      type: participant.type,
      privateInfo: await encryptWithPublicKey(encodingKey, privateInfoComplete),
      // store a hash of the original data in order to be able to determine in the
      // future if the user is th
      privateInfoHash: simpleHash(privateInfoComplete),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      name: sourceName || '',
      guest_email: participant.guest_email,
      status: ParticipationStatus.Pending,
      mappingType: !!participantsMapping?.toKeep[
        participant.account_address || ''
      ]
        ? ParticipantMappingType.KEEP
        : ParticipantMappingType.ADD,
    }

    participantsMappings.push(participantMapping)
  }

  const meeting: MeetingCreationRequest = {
    type: schedulingType,
    start: startTime,
    end: endTime,
    participants_mapping: participantsMappings,
    meetingTypeId,
    meeting_url: privateInfo['meeting_url'],
    content: privateInfo['content'],
  }

  return meeting
}

/**
 *
 * @param owner
 * @param meetingTypeId
 * @param startTime
 * @param endTime
 * @param decryptedMeeting
 * @param signature
 * @param participants
 * @returns
 */
const updateMeeting = async (
  owner: string,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  signature: string,
  participants: string[]
) => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const ownerAccount = await getAccount(owner)

  const existingDBSlot = await getMeeting(decryptedMeeting.id)
  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    ownerAccount,
    signature
  )

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingDBSlot.version) {
    throw new MeetingChangeConflictError()
  }

  const existingMeetingAccounts = await loadMeetingAccounts(
    owner,
    existingMeeting
  )

  // those are the users that we need to remove the slots
  const toRemove = diff(existingMeetingAccounts, participants)

  // those are the users that we need to create new slots
  const toAdd = diff(participants, existingMeetingAccounts)

  // those are the users that we need to replace the slot contents
  const toKeep = intersec(existingMeetingAccounts, participants)
  const accountSlotMap = await mapRelatedSlots(existingMeeting)
  accountSlotMap[owner] = existingMeeting.id

  const targetAccount = decryptedMeeting.participants.find(
    it => it.type == ParticipantType.Owner
  )
  const sourceAccount = decryptedMeeting.participants.find(
    it => it.type == ParticipantType.Scheduler
  )
  const otherAccounts = decryptedMeeting.participants.filter(
    it => it.type == ParticipantType.Invitee
  )

  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    targetAccount!.account_address!,
    otherAccounts.map(it => it.account_address!),
    meetingTypeId,
    startTime,
    endTime,
    sourceAccount?.account_address,
    undefined,
    undefined,
    undefined,
    decryptedMeeting.content,
    decryptedMeeting.meeting_url,
    {
      toAdd,
      toKeep: toKeep.reduce<any>((acc, it) => {
        acc[it] = accountSlotMap[it]
        return acc
      }, {}),
    }
  )
  const payload = {
    ...meetingData,
    slotsToRemove: toRemove.map(it => accountSlotMap[it]),
    version: decryptedMeeting.version + 1,
  }

  // Fetch the updated data one last time
  const slot: DBSlotEnhanced = await apiUpdateMeeting(
    decryptedMeeting.id,
    payload
  )
  return await decryptMeeting(slot, ownerAccount)
}

/**
 *
 * @param owner
 * @param decryptedMeeting
 * @param signature
 * @returns
 */
const cancelMeeting = async (
  owner: string,
  decryptedMeeting: MeetingDecrypted
) => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const signature = getSignature(owner)!

  const ownerAccount = await getAccount(owner)

  const existingDBSlot = await getMeeting(decryptedMeeting.id)
  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    ownerAccount,
    signature
  )

  // for now, only the owner of the meeting can cancel it
  const meetingOwner = existingMeeting.participants.find(
    user => user.type === ParticipantType.Owner
  )
  if (meetingOwner?.account_address !== owner) {
    throw new MeetingCancelForbiddenError()
  }

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingDBSlot.version) {
    throw new MeetingChangeConflictError()
  }

  // Fetch the updated data one last time
  await apiCancelMeeting(decryptedMeeting)

  return
}

const scheduleMeeting = async (
  schedulingType: SchedulingType,
  target_account_address: string,
  extra_participants: string[],
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  source_account_address?: string,
  guests?: GuestParticipant[],
  sourceName?: string,
  targetName?: string,
  meetingContent?: string,
  meetingUrl?: string
): Promise<MeetingDecrypted> => {
  if (
    source_account_address === target_account_address &&
    extra_participants.length == 0
  ) {
    throw new MeetingWithYourselfError()
  }

  if (
    source_account_address === target_account_address ||
    (
      await isSlotFreeApiCall(
        target_account_address,
        startTime,
        endTime,
        meetingTypeId
      )
    ).isFree
  ) {
    const meeting = await buildMeetingData(
      schedulingType,
      target_account_address,
      extra_participants,
      meetingTypeId,
      startTime,
      endTime,
      source_account_address,
      guests,
      sourceName,
      targetName,
      meetingContent,
      meetingUrl
    )

    try {
      let slot: DBSlotEnhanced
      if (schedulingType === SchedulingType.GUEST) {
        slot = await scheduleMeetingAsGuest(meeting)
      } else {
        slot = await apiScheduleMeeting(meeting)
      }

      if (source_account_address) {
        const schedulerAccount = await getAccount(source_account_address!)
        return await decryptMeeting(slot, schedulerAccount)
      }

      return {
        id: slot.id!,
        ...meeting,
        created_at: meeting.start,
        participants: [],
        content: '',
        meeting_url: '',
        start: meeting.start,
        end: meeting.end,
        meeting_info_file_path: slot.meeting_info_file_path,
        related_slot_ids: [],
        version: 0,
      }
    } catch (error: any) {
      throw error
    }
  } else {
    throw new TimeNotAvailableError()
  }
}

const generateIcs = (
  meeting: MeetingDecrypted,
  ownerAddress: string
): ReturnObject => {
  let url = meeting.meeting_url.trim()
  if (!isValidUrl(url)) {
    url = 'https://meetwithwallet.xyz'
  }
  const event: EventAttributes = {
    uid: meeting.id,
    start: [
      getYear(meeting.start),
      getMonth(meeting.start) + 1,
      getDate(meeting.start),
      getHours(meeting.start),
      getMinutes(meeting.start),
    ],
    end: [
      getYear(meeting.end),
      getMonth(meeting.end) + 1,
      getDate(meeting.end),
      getHours(meeting.end),
      getMinutes(meeting.end),
    ],
    title: CalendarServiceHelper.getMeetingTitle(
      ownerAddress,
      meeting.participants
    ),
    description: CalendarServiceHelper.getMeetingSummary(
      meeting.content,
      meeting.meeting_url
    ),
    url,
    location: meeting.meeting_url,
    created: [
      getYear(meeting.created_at!),
      getMonth(meeting.created_at!) + 1,
      getDate(meeting.created_at!),
      getHours(meeting.created_at!),
      getMinutes(meeting.created_at!),
    ],
    organizer: {
      // required by some services
      name: 'Meet with Wallet',
      email: NO_REPLY_EMAIL,
    },
    status: 'CONFIRMED',
  }
  event.attendees = []

  for (const participant of meeting.participants) {
    const attendee: Attendee = {
      name: participant.name || participant.account_address,
      email:
        participant.guest_email ||
        noNoReplyEmailForAccount(participant.account_address!),
      rsvp: participant.status === ParticipationStatus.Accepted,
      partstat: participantStatusToICSStatus(participant.status),
      role: 'REQ-PARTICIPANT',
    }

    if (participant.account_address) {
      attendee.dir = getCalendarRegularUrl(participant.account_address!)
    }

    event.attendees.push(attendee)
  }

  return createEvent(event)
}

const participantStatusToICSStatus = (status: ParticipationStatus) => {
  switch (status) {
    case ParticipationStatus.Accepted:
      return 'ACCEPTED'
    case ParticipationStatus.Rejected:
      return 'DECLINED'
    default:
      return 'NEEDS-ACTION'
  }
}

const decryptMeeting = async (
  meeting: DBSlotEnhanced,
  account: Account,
  signature?: string
): Promise<MeetingDecrypted> => {
  const meetingInfo = JSON.parse(
    await getContentFromEncrypted(
      account!,
      signature || getSignature(account!.address)!,
      meeting.meeting_info_encrypted
    )
  ) as IPFSMeetingInfo

  return {
    id: meeting.id!,
    ...meeting,
    created_at: meeting.created_at!,
    participants: meetingInfo.participants,
    content: meetingInfo.content,
    meeting_url: meetingInfo.meeting_url,
    related_slot_ids: meetingInfo.related_slot_ids,
    start: new Date(meeting.start),
    end: new Date(meeting.end),
    meeting_info_file_path: meeting.meeting_info_file_path,
    version: meeting.version,
  }
}

const getContentFromEncrypted = async (
  account: Account,
  signature: string,
  encrypted: Encrypted
): Promise<string> => {
  try {
    const pvtKey = decryptContent(signature, account.encoded_signature)
    return await decryptWithPrivateKey(pvtKey, encrypted)
  } catch (error) {
    ;(window as any).location = '/logout'
    await new Promise<void>(resolve =>
      setTimeout(() => {
        resolve()
      }, 5000)
    ) //wait redirect
    return ''
  }
}

const generateDefaultAvailabilities = (): DayAvailability[] => {
  const availabilities = []
  for (let i = 0; i <= 6; i++) {
    availabilities.push({
      weekday: i,
      ranges: [defaultTimeRange()],
    })
  }
  return availabilities
}

const defaultTimeRange = () => {
  return { start: '09:00', end: '18:00' }
}

const durationToHumanReadable = (duration: number): string => {
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours} hour ${minutes} min`
    }
    return `${hours} hour`
  }
  return `${duration} min`
}

const dateToHumanReadable = (
  date: Date,
  timezone: string,
  includeTimezone: boolean
): string => {
  let result = `${format(utcToZonedTime(date, timezone), 'PPPPpp')}`
  if (includeTimezone) {
    result += ` - ${timezone}`
  }
  return result
}

const getAccountDomainUrl = (account: Account, ellipsize?: boolean): string => {
  if (isProAccount(account)) {
    return account.subscriptions.filter(sub => sub.plan_id === Plan.PRO)[0]
      .domain
  }
  return `address/${
    ellipsize ? ellipsizeAddress(account!.address) : account!.address
  }`
}

const getAccountCalendarUrl = (
  account: Account,
  ellipsize?: boolean
): string => {
  return `${appUrl}/${getAccountDomainUrl(account, ellipsize)}`
}

const getCalendarRegularUrl = (account_address: string) => {
  return `${appUrl}/address/${account_address}`
}

const generateDefaultMeetingType = (): MeetingType => {
  const title = '30 minutes meeting'
  const meetingType: MeetingType = {
    id: uuidv4(),
    title,
    url: getSlugFromText(title),
    duration: 30,
    minAdvanceTime: 60,
  }

  return meetingType
}

const generateAllSlots = () => {
  const allSlots: string[] = []
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 15) {
      allSlots.push(
        `${String(i).padStart(2, '0')}:${String(j).padStart(2, '0')}`
      )
    }
  }
  allSlots.push('24:00')
  return allSlots
}

const noNoReplyEmailForAccount = (account_address: string): string => {
  return `no_reply_${account_address}@meetwithwallet.xyz`
}

const allSlots = generateAllSlots()

export {
  allSlots,
  cancelMeeting,
  dateToHumanReadable,
  decryptMeeting,
  defaultTimeRange,
  durationToHumanReadable,
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  generateIcs,
  getAccountCalendarUrl,
  getAccountDomainUrl,
  noNoReplyEmailForAccount,
  scheduleMeeting,
  updateMeeting,
}
