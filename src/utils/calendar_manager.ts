import {
  format,
  getDate,
  getHours,
  getMinutes,
  getMonth,
  getYear,
} from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import { Encrypted, encryptWithPublicKey } from 'eth-crypto'
import { Attendee, createEvent, EventAttributes, ReturnObject } from 'ics'
import { v4 as uuidv4 } from 'uuid'

import { Account, DayAvailability, MeetingType } from '@/types/Account'
import {
  CreationRequestParticipantMapping,
  DBSlot,
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
  createHuddleRoom,
  fetchContentFromIPFSFromBrowser,
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
import { getContentFromEncrypted, simpleHash } from './cryptography'
import {
  InvalidURL,
  MeetingCancelForbiddenError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingWithYourselfError,
  TimeNotAvailableError,
} from './errors'
import { getSlugFromText } from './generic_utils'
import { CalendarServiceHelper } from './services/calendar.helper'
import { getSignature } from './storage'
import { isProAccount } from './subscription_manager'
import { ellipsizeAddress, getAccountDisplayName } from './user_manager'
import { isValidEmail, isValidUrl } from './validations'

export const sanitizeParticipants = (
  participants: ParticipantInfo[]
): ParticipantInfo[] => {
  const sanitized: ParticipantInfo[] = []

  for (const participant of participants) {
    let added = false
    if (
      sanitized.some(
        p =>
          (p.account_address &&
            p.account_address?.toLowerCase() ===
              participant.account_address?.toLowerCase()) ||
          (p.guest_email && p.guest_email === participant.guest_email)
      )
    ) {
      added = true
    }
    if (participant.account_address) {
      const elementsByAddress = participants.filter(
        p =>
          p.account_address?.toLowerCase() ===
          participant.account_address?.toLowerCase()
      )
      if (elementsByAddress.length > 1) {
        const toPickIfScheduler = elementsByAddress.filter(
          p =>
            p.account_address?.toLowerCase() ===
              participant.account_address?.toLowerCase() &&
            p.type === ParticipantType.Scheduler
        )

        if (!added && toPickIfScheduler[0]) {
          sanitized.push(toPickIfScheduler[0])
          added = true
        }

        const toPick = elementsByAddress.filter(
          p =>
            p.account_address?.toLowerCase() ===
              participant.account_address?.toLowerCase() && p.name
        )

        if (!added && toPick[0] && toPick[0].name) {
          sanitized.push(toPick[0])
          added = true
        }
      }
    }

    if (participant.guest_email) {
      const elementsByEmail = participants.filter(
        p => p.guest_email === participant.guest_email
      )

      if (elementsByEmail.length > 1) {
        const toPickIfScheduler = elementsByEmail.filter(
          p =>
            p.guest_email === participant.guest_email &&
            p.type === ParticipantType.Scheduler
        )
        if (!added && toPickIfScheduler[0]) {
          sanitized.push(toPickIfScheduler[0])
          added = true
        }

        const toPick = elementsByEmail.filter(
          p => p.guest_email === participant.guest_email && p.name
        )
        if (!added && toPick[0] && toPick[0].name) {
          sanitized.push(toPick[0])
          added = true
        }
      }
    }
    !added && sanitized.push(participant)
  }

  return sanitized
}

const mapRelatedSlots = async (
  meeting: MeetingDecrypted,
  currentAccountAddress: string
) => {
  const accountSlot: { [account: string]: string } = {}
  accountSlot[currentAccountAddress] = meeting.id
  for (const slotId of meeting.related_slot_ids) {
    if (slotId !== meeting.id) {
      const slot = await getMeeting(slotId)
      accountSlot[slot.account_address] = slotId
    }
  }
  return accountSlot
}

const loadMeetingAccountAddresses = async (
  currentAccountAddress: string,
  meeting: MeetingDecrypted
): Promise<string[]> => {
  // also make sure that the version of every related db slot is also in sync
  // and that there is a change already going on
  // TODO: change to one fetch all in batch
  const otherSlots = []
  for (const slotId of meeting.related_slot_ids) {
    const otherSlot = await getMeeting(slotId)
    otherSlots.push(otherSlot)
  }

  return [
    currentAccountAddress.toLowerCase(),
    ...otherSlots.map(it => it.account_address.toLowerCase()),
  ]
}

const buildMeetingData = async (
  schedulingType: SchedulingType,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  participants: ParticipantInfo[],
  participantsToKeep: {
    [accountOrEmail: string]: string
  },
  currentAccount?: Account | null,
  meetingContent?: string,
  meetingUrl?: string
) => {
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

  const allAccounts: Account[] = await getExistingAccounts(
    participants.filter(p => p.account_address).map(p => p.account_address!)
  )

  for (const account of allAccounts) {
    const participant = participants.filter(
      p => p.account_address?.toLowerCase() === account.address.toLowerCase()
    )

    for (const p of participant) {
      p.name = getAccountDisplayName(account)
      p.status = p.status || ParticipationStatus.Pending
      p.type = p.type || ParticipantType.Invitee
      p.slot_id = uuidv4()
    }
  }

  const sanitizedParticipants = sanitizeParticipants(participants)

  //Ensure all slot_ids are filled given we are messing with this all around
  for (const participant of sanitizedParticipants) {
    participant.slot_id = participant.slot_id || uuidv4()
  }

  if (
    sanitizedParticipants.length === 1 &&
    sanitizedParticipants[0].account_address?.toLowerCase() ===
      currentAccount?.address.toLowerCase()
  ) {
    throw new MeetingWithYourselfError()
  } else if (sanitizedParticipants.length === 1) {
    throw new MeetingCreationError()
  }

  if (
    sanitizedParticipants.filter(p => p.type === ParticipantType.Scheduler)
      .length !== 1
  ) {
    throw new MeetingCreationError()
  }

  const privateInfo: IPFSMeetingInfo = {
    created_at: new Date(),
    participants: sanitizedParticipants,
    content: meetingContent,
    meeting_url: meetingUrl || (await createHuddleRoom()).url,
    change_history_paths: [],
    related_slot_ids: [],
  }

  // first pass to make sure that we are keeping the existing slot id
  for (const participant of sanitizedParticipants) {
    const existingSlotId = participantsToKeep[participant.account_address || '']
    participant.slot_id = existingSlotId || participant.slot_id
  }

  const allSlotIds = sanitizedParticipants.map(it => it.slot_id)
  const participantsMappings = []

  for (const participant of sanitizedParticipants) {
    // we use participant key if it is an actual participant, otherwise, it is a
    // guest and have not a PK yet, so we encode data using our pk.
    const encodingKey =
      allAccounts.filter(
        account =>
          account.address.toLowerCase() ===
          participant.account_address?.toLowerCase()
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
      name: participant.name || '',
      guest_email: participant.guest_email,
      status: ParticipationStatus.Pending,
      mappingType: !!participantsToKeep[
        participant.account_address || participant.guest_email || ''
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
  currentAccountAddress: string,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  signature: string,
  participants: ParticipantInfo[],
  content?: string
): Promise<MeetingDecrypted> => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const currentAccount = await getAccount(currentAccountAddress)

  const existingDBSlot = await getMeeting(decryptedMeeting.id)
  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    currentAccount,
    signature
  )

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingDBSlot.version) {
    throw new MeetingChangeConflictError()
  }

  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    currentAccount.address,
    existingMeeting!
  )

  // those are the users that we need to remove the slots
  const toRemove = diff(
    existingMeetingAccounts,
    participants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase())
  )

  // those are the users that we need to replace the slot contents
  const toKeep = intersec(existingMeetingAccounts, [
    currentAccountAddress.toLowerCase(),
    ...participants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase()),
  ])

  const accountSlotMap = await mapRelatedSlots(
    existingMeeting!,
    currentAccountAddress
  )

  const oldGuests = decryptedMeeting.participants.filter(p => p.guest_email)

  const guests = participants
    .filter(p => p.guest_email)
    .map(p => p.guest_email!)

  // those are the guests that must receive an update email
  const guestsToKeep = intersec(
    oldGuests.map(p => p.guest_email!),
    guests
  )

  // those are the guests that must receive a cancel email
  const guestsToRemoveEmails = diff(
    oldGuests.map(p => p.guest_email!),
    guests
  )

  const guestsToRemove = oldGuests.filter(p =>
    guestsToRemoveEmails.includes(p.guest_email!)
  )

  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    meetingTypeId,
    startTime,
    endTime,
    participants,
    [...toKeep, ...guestsToKeep].reduce<any>((acc, it) => {
      acc[it] = accountSlotMap[it]
      return acc
    }, {}),
    currentAccount,
    content,
    decryptedMeeting.meeting_url
  )
  const payload = {
    ...meetingData,
    slotsToRemove: toRemove.map(it => accountSlotMap[it]),
    guestsToRemove,
    version: decryptedMeeting.version + 1,
  }

  // Fetch the updated data one last time
  const slot: DBSlotEnhanced = await apiUpdateMeeting(
    decryptedMeeting.id,
    payload
  )
  return (await decryptMeeting(slot, currentAccount))!
}

/**
 *
 * @param owner
 * @param decryptedMeeting
 * @param signature
 * @returns
 */
const cancelMeeting = async (
  currentAccountAddress: string,
  decryptedMeeting: MeetingDecrypted
) => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const signature = getSignature(currentAccountAddress)!

  const ownerAccount = await getAccount(currentAccountAddress)

  const existingDBSlot = await getMeeting(decryptedMeeting.id)
  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    ownerAccount,
    signature
  )

  // Only the owner or scheduler of the meeting can cancel it
  const meetingOwner = existingMeeting!.participants.find(
    user => user.type === ParticipantType.Owner
  )
  const meetingScheduler = existingMeeting!.participants.find(
    user => user.type === ParticipantType.Scheduler
  )
  if (
    meetingOwner?.account_address !== currentAccountAddress &&
    meetingScheduler?.account_address !== currentAccountAddress
  ) {
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
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  participants: ParticipantInfo[],
  currentAccount?: Account | null,
  meetingContent?: string,
  meetingUrl?: string
): Promise<MeetingDecrypted> => {
  const meeting = await buildMeetingData(
    schedulingType,
    meetingTypeId,
    startTime,
    endTime,
    participants,
    {},
    currentAccount,
    meetingContent,
    meetingUrl
  )

  const owner = meeting.participants_mapping.filter(
    p => p.type === ParticipantType.Owner
  )[0]

  if (
    !owner || // scheduling from dashbaord
    (
      await isSlotFreeApiCall(
        owner.account_address!,
        startTime,
        endTime,
        meetingTypeId
      )
    ).isFree
  ) {
    try {
      let slot: DBSlotEnhanced
      if (schedulingType === SchedulingType.GUEST) {
        slot = await scheduleMeetingAsGuest(meeting)
      } else {
        slot = await apiScheduleMeeting(meeting)
      }

      if (currentAccount) {
        return (await decryptMeeting(slot, currentAccount))!
      }

      return {
        id: slot.id!,
        ...meeting,
        created_at: meeting.start,
        participants: meeting.participants_mapping,
        content: meeting.content,
        meeting_url: meeting.meeting_url,
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
): Promise<MeetingDecrypted | null> => {
  const content = await getContentFromEncrypted(
    account!,
    signature || getSignature(account!.address)!,
    meeting.meeting_info_encrypted
  )

  if (!content) return null

  const meetingInfo = JSON.parse(content) as IPFSMeetingInfo
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

const decodeMeeting = async (
  meeting: DBSlot,
  currentAccount: Account
): Promise<MeetingDecrypted | null> => {
  const meetingInfoEncrypted = (await fetchContentFromIPFSFromBrowser(
    meeting.meeting_info_file_path
  )) as Encrypted
  if (meetingInfoEncrypted) {
    const decryptedMeeting = await decryptMeeting(
      {
        ...meeting,
        meeting_info_encrypted: meetingInfoEncrypted,
      },
      currentAccount
    )

    return decryptedMeeting
  }
  return null
}

const allSlots = generateAllSlots()

export {
  allSlots,
  cancelMeeting,
  dateToHumanReadable,
  decodeMeeting,
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
