import {
  format,
  getDate,
  getHours,
  getMinutes,
  getMonth,
  getWeekOfMonth,
  getYear,
} from 'date-fns'
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz'
import { Encrypted, encryptWithPublicKey } from 'eth-crypto'
import {
  Alarm,
  Attendee,
  createEvent,
  EventAttributes,
  ReturnObject,
} from 'ics'
import { v4 as uuidv4 } from 'uuid'

import { Account, DayAvailability, MeetingType } from '@/types/Account'
import { MeetingReminders } from '@/types/common'
import {
  DBSlot,
  ExtendedDBSlot,
  MeetingChangeType,
  MeetingDecrypted,
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  ParticipantMappingType,
  SchedulingType,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  MeetingCreationRequest,
  RequestParticipantMapping,
} from '@/types/Requests'
import {
  cancelMeeting as apiCancelMeeting,
  generateMeetingUrl,
  getAccount,
  getExistingAccounts,
  getMeeting,
  isSlotFreeApiCall,
  scheduleMeeting as apiScheduleMeeting,
  scheduleMeetingAsGuest,
  scheduleMeetingFromServer,
  syncMeeting,
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
import QueryKeys from './query_keys'
import { queryClient } from './react_query'
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
        const toPickIfScheduler = elementsByEmail.find(
          p =>
            p.guest_email === participant.guest_email &&
            p.type === ParticipantType.Scheduler
        )
        if (!added && toPickIfScheduler) {
          sanitized.push(toPickIfScheduler)
          added = true
        }

        const toPick = elementsByEmail.find(
          p => p.guest_email === participant.guest_email && p.name
        )
        if (!added && toPick && toPick.name) {
          sanitized.push(toPick)
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
      try {
        const slot = await getMeeting(slotId)
        accountSlot[slot.account_address] = slotId
      } catch (e) {
        // some slots might not be found if they belong to guests and were wrongly stored
      }
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
    try {
      const otherSlot = await getMeeting(slotId)
      otherSlots.push(otherSlot)
    } catch (e) {
      // some slots might not be found if they belong to guests and were wrongly stored
    }
  }

  return [
    currentAccountAddress.toLowerCase(),
    ...otherSlots.map(it => it.account_address.toLowerCase()),
  ]
}
const handleParticipants = async (
  participants: ParticipantInfo[],
  currentAccount?: Account | null
) => {
  const allAccounts: Account[] = await getExistingAccounts(
    participants.filter(p => p.account_address).map(p => p.account_address!)
  )

  for (const account of allAccounts) {
    const participant = participants.filter(
      p => p.account_address?.toLowerCase() === account.address.toLowerCase()
    )

    for (const p of participant) {
      p.name = p.name || getAccountDisplayName(account)
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
  return { sanitizedParticipants, allAccounts }
}
const buildMeetingData = async (
  schedulingType: SchedulingType,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  sanitizedParticipants: ParticipantInfo[],
  allAccounts: Account[],
  participantsToKeep: {
    [accountOrEmail: string]: string
  },
  meetingProvider: MeetingProvider,
  currentAccount?: Account | null,
  meetingContent?: string,
  meetingUrl = '',
  meetingId = '',
  meetingTitle = 'No Title',
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT
): Promise<MeetingCreationRequest> => {
  if (meetingProvider == MeetingProvider.CUSTOM && meetingUrl) {
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

  const privateInfo: MeetingInfo = {
    created_at: new Date(),
    participants: sanitizedParticipants,
    title: meetingTitle,
    content: meetingContent,
    meeting_url: meetingUrl,
    change_history_paths: [],
    related_slot_ids: [],
    meeting_id: meetingId,
    reminders: meetingReminders,
    provider: meetingProvider,
    recurrence: meetingRepeat,
  }

  // first pass to make sure that we are keeping the existing slot id
  for (const participant of sanitizedParticipants) {
    const existingSlotId = participantsToKeep[participant.account_address || '']
    participant.slot_id = existingSlotId || participant.slot_id
  }

  const allAccountSlotIds = sanitizedParticipants
    .filter(p => p.account_address)
    .map(it => it.slot_id)
    .filter(val => val !== undefined) as string[]

  const allSlotIds = sanitizedParticipants
    .map(it => it.slot_id!)
    .filter(val => val !== undefined)

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
      related_slot_ids: allAccountSlotIds.filter(
        id => id !== participant.slot_id
      ),
    } as MeetingInfo)

    const participantMapping: RequestParticipantMapping = {
      account_address: participant.account_address || '',
      // this is the actual slot id for this participant, we choose it before creation
      slot_id: participant.slot_id,
      type: participant.type,
      meeting_id: meetingId,
      privateInfo: await encryptWithPublicKey(encodingKey, privateInfoComplete),
      // store a hash of the original data in order to be able to determine in the
      // future if the user is th
      privateInfoHash: simpleHash(privateInfoComplete),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      name: participant.name || '',
      guest_email: participant.guest_email,
      status:
        participant.type === ParticipantType.Scheduler
          ? ParticipationStatus.Accepted
          : ParticipationStatus.Pending,
      mappingType: !!participantsToKeep[
        participant.account_address || participant.guest_email || ''
      ]
        ? ParticipantMappingType.KEEP
        : ParticipantMappingType.ADD,
    }

    participantsMappings.push(participantMapping)
  }

  return {
    type: schedulingType,
    start: startTime,
    end: endTime,
    meeting_id: meetingId,
    participants_mapping: participantsMappings,
    meetingTypeId,
    meeting_url: privateInfo['meeting_url'],
    content: privateInfo['content'],
    title: privateInfo['title'],
    meetingProvider,
    meetingReminders,
    meetingRepeat,
    allSlotIds,
  }
}

/**
 *
 * @param ignoreAvailabilities
 * @param currentAccountAddress
 * @param meetingTypeId
 * @param startTime
 * @param endTime
 * @param decryptedMeeting
 * @param signature
 * @param participants
 * @param content
 * @param meetingUrl
 * @param meetingProvider
 * @param meetingTitle
 * @param meetingReminders
 * @param meetingRepeat
 * @returns
 */
const updateMeeting = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  signature: string,
  participants: ParticipantInfo[],
  content: string,
  meetingUrl: string,
  meetingProvider: MeetingProvider,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT
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

  const rootMeetingId = existingMeeting?.meeting_id

  if (!ignoreAvailabilities) {
    const promises: Promise<void>[] = []

    participants
      .filter(p => p.account_address !== currentAccount?.address)
      .forEach(participant => {
        promises.push(
          new Promise<void>(async resolve => {
            if (
              !participant.account_address ||
              (
                await isSlotFreeApiCall(
                  participant.account_address,
                  startTime,
                  endTime,
                  meetingTypeId
                )
              ).isFree
            ) {
              resolve()
            }
            throw new TimeNotAvailableError()
          })
        )
      })
    await Promise.all(promises)
  }
  const participantData = await handleParticipants(participants, currentAccount)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    meetingTypeId,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<any>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingProvider,
    currentAccount,
    content,
    meetingUrl,
    rootMeetingId,
    meetingTitle,
    meetingReminders,
    meetingRepeat
  )
  const payload = {
    ...meetingData,
    slotsToRemove: toRemove.map(it => accountSlotMap[it]),
    guestsToRemove,
    version: decryptedMeeting.version + 1,
  }

  // Fetch the updated data one last time
  const slot: DBSlot = await apiUpdateMeeting(decryptedMeeting.id, payload)
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
): Promise<{ removed: string[] }> => {
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
  const response = await apiCancelMeeting(
    decryptedMeeting,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  return response
}

const scheduleMeeting = async (
  ignoreAvailabilities: boolean,
  schedulingType: SchedulingType,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  participants: ParticipantInfo[],
  meetingProvider: MeetingProvider,
  currentAccount?: Account | null,
  meetingContent?: string,
  meetingUrl?: string,
  emailToSendReminders?: string,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT
): Promise<MeetingDecrypted> => {
  const newMeetingId = uuidv4()
  const participantData = await handleParticipants(participants, currentAccount) // check participants before proceeding

  const meeting_url =
    meetingUrl ||
    (
      await generateMeetingUrl({
        meeting_id: newMeetingId,
        title: meetingTitle || 'No Title',
        end: endTime,
        start: startTime,
        meetingProvider,
        participants_mapping: participantData.sanitizedParticipants,
        accounts: participantData.allAccounts,
        content: meetingContent,
        meetingReminders,
        meetingRepeat,
      })
    ).url

  const meeting = await buildMeetingData(
    schedulingType,
    meetingTypeId,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    {},
    meetingProvider,
    currentAccount,
    meetingContent,
    meeting_url,
    newMeetingId,
    meetingTitle,
    meetingReminders,
    meetingRepeat
  )
  if (!ignoreAvailabilities) {
    const promises: Promise<boolean>[] = []
    participants
      .filter(p => p.account_address !== currentAccount?.address)
      .forEach(participant => {
        promises.push(
          new Promise<boolean>(async resolve => {
            if (
              !participant.account_address ||
              (
                await isSlotFreeApiCall(
                  participant.account_address,
                  startTime,
                  endTime,
                  meetingTypeId
                )
              ).isFree
            ) {
              resolve(true)
            }
            resolve(false)
          })
        )
      })
    const results = await Promise.all(promises)
    if (results.some(r => !r)) {
      throw new TimeNotAvailableError()
    }
  }
  try {
    let slot: DBSlot
    if (schedulingType === SchedulingType.GUEST) {
      slot = await scheduleMeetingAsGuest(meeting)
    } else if (schedulingType === SchedulingType.DISCORD) {
      slot = await scheduleMeetingFromServer(currentAccount!.address, meeting)
    } else {
      meeting.emailToSendReminders = emailToSendReminders
      slot = await apiScheduleMeeting(meeting)
    }
    if (currentAccount && schedulingType !== SchedulingType.DISCORD) {
      const meeting = (await decryptMeeting(slot, currentAccount))!
      return meeting
    }

    // Invalidate meetings cache and update meetings where required
    queryClient.invalidateQueries(
      QueryKeys.meetingsByAccount(currentAccount?.address?.toLowerCase())
    )
    queryClient.invalidateQueries(
      QueryKeys.busySlots({ id: currentAccount?.address?.toLowerCase() })
    )

    participants.forEach(p => {
      queryClient.invalidateQueries(
        QueryKeys.meetingsByAccount(p.account_address?.toLowerCase())
      )
      queryClient.invalidateQueries(
        QueryKeys.busySlots({
          id: p.account_address?.toLowerCase(),
        })
      )
    })
    return {
      id: slot.id!,
      ...meeting,
      created_at: meeting.start,
      participants: meeting.participants_mapping,
      content: meeting.content,
      title: meeting.title,
      meeting_id: newMeetingId,
      meeting_url: meeting.meeting_url,
      start: meeting.start,
      end: meeting.end,
      related_slot_ids: [],
      version: 0,
      meeting_info_encrypted: slot.meeting_info_encrypted,
    }
  } catch (error: any) {
    throw error
  }
}
const createAlarm = (indicator: MeetingReminders): Alarm => {
  switch (indicator) {
    case MeetingReminders['15_MINUTES_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { minutes: 15, before: true },
      }

    case MeetingReminders['30_MINUTES_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { minutes: 30, before: true },
      }

    case MeetingReminders['1_HOUR_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { hours: 1, before: true },
      }
    case MeetingReminders['1_DAY_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { days: 1, before: true },
      }
    case MeetingReminders['1_WEEK_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { weeks: 1, before: true },
      }
    case MeetingReminders['10_MINUTES_BEFORE']:
    default:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { minutes: 10, before: true },
      }
  }
}
const generateIcs = (
  meeting: MeetingDecrypted,
  ownerAddress: string,
  meetingStatus: MeetingChangeType,
  changeUrl?: string,
  removeAttendess?: boolean,
  destination?: { accountAddress: string; email: string },
  isPrivate?: boolean
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
    productId: '-//Meetwith//EN',
    end: [
      getYear(meeting.end),
      getMonth(meeting.end) + 1,
      getDate(meeting.end),
      getHours(meeting.end),
      getMinutes(meeting.end),
    ],
    title: CalendarServiceHelper.getMeetingTitle(
      ownerAddress,
      meeting.participants,
      meeting.title
    ),
    description: CalendarServiceHelper.getMeetingSummary(
      meeting.content,
      meeting.meeting_url,
      changeUrl
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
      name: 'Meetwith',
      email: NO_REPLY_EMAIL,
    },
    status:
      meetingStatus === MeetingChangeType.DELETE ? 'CANCELLED' : 'CONFIRMED',
  }
  if (!isPrivate) {
    event.method = 'REQUEST'
    event.transp = 'OPAQUE'
    event.classification = 'PUBLIC'
  }
  if (meeting.reminders) {
    event.alarms = meeting.reminders.map(createAlarm)
  }
  if (meeting.recurrence && meeting?.recurrence !== MeetingRepeat.NO_REPEAT) {
    let RRULE = `FREQ=${meeting.recurrence?.toUpperCase()};INTERVAL=1`
    const dayOfWeek = format(meeting.start, 'eeeeee').toUpperCase()
    const weekOfMonth = getWeekOfMonth(meeting.start)

    switch (meeting.recurrence) {
      case MeetingRepeat.WEEKLY:
        RRULE += `;BYDAY=${dayOfWeek}`
        break
      case MeetingRepeat.MONTHLY:
        RRULE += `;BYSETPOS=${weekOfMonth};BYDAY=${dayOfWeek}`
        break
    }
    event.recurrenceRule = RRULE
  }
  event.attendees = []
  if (!removeAttendess) {
    for (const participant of meeting.participants) {
      const attendee: Attendee = {
        name: participant.name || participant.account_address,
        email:
          participant.account_address &&
          destination &&
          destination.accountAddress === participant.account_address
            ? destination.email
            : participant.guest_email ||
              noNoReplyEmailForAccount(
                (participant.name || participant.account_address)!
              ),
        rsvp: participant.status === ParticipationStatus.Accepted,
        partstat: participantStatusToICSStatus(participant.status),
        role: 'REQ-PARTICIPANT',
      }

      if (participant.account_address) {
        attendee.dir = getCalendarRegularUrl(participant.account_address!)
      }

      event.attendees.push(attendee)
    }
  }

  const icsEvent = createEvent(event)
  return icsEvent
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
  meeting: ExtendedDBSlot,
  account: Account,
  signature?: string
): Promise<MeetingDecrypted | null> => {
  const content = await getContentFromEncrypted(
    account!,
    signature || getSignature(account!.address)!,
    meeting?.meeting_info_encrypted
  )
  if (!content) return null

  const meetingInfo = JSON.parse(content) as MeetingInfo
  if (
    meeting?.conferenceData &&
    meeting?.conferenceData.version === MeetingVersion.V2
  ) {
    if (
      meeting.conferenceData.slots.length !== meetingInfo.participants.length
    ) {
      void syncMeeting(meetingInfo)
      // Hide the removed participants from the UI while they're being removed from the backend
      meetingInfo.related_slot_ids = meetingInfo.related_slot_ids.filter(id =>
        meeting.conferenceData?.slots.includes(id)
      )
      meetingInfo.participants = meetingInfo.participants.filter(p =>
        meeting.conferenceData?.slots.includes(p.slot_id!)
      )
    }
  }
  return {
    id: meeting.id!,
    ...meeting,
    meeting_id: meetingInfo.meeting_id,
    created_at: meeting.created_at!,
    participants: meetingInfo.participants,
    content: meetingInfo.content,
    title: meetingInfo.title,
    meeting_url: meetingInfo.meeting_url,
    related_slot_ids: meetingInfo.related_slot_ids,
    start: new Date(meeting.start),
    end: new Date(meeting.end),
    version: meeting.version,
    reminders: meetingInfo.reminders,
    provider: meetingInfo?.provider,
    recurrence: meetingInfo?.recurrence,
  }
}

const generateDefaultAvailabilities = (): DayAvailability[] => {
  const availabilities: DayAvailability[] = []
  for (let i = 0; i <= 6; i++) {
    availabilities.push({
      weekday: i,
      ranges: i !== 0 && i !== 6 ? [defaultTimeRange()] : [],
    })
  }
  return availabilities
}

const generateEmptyAvailabilities = (): DayAvailability[] => {
  const availabilities: DayAvailability[] = []
  for (let i = 0; i <= 6; i++) {
    availabilities.push({
      weekday: i,
      ranges: [],
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

const dateToLocalizedRange = (
  start_date: Date,
  end_date: Date,
  timezone: string,
  includeTimezone?: boolean
): string => {
  const start = `${formatInTimeZone(
    start_date,
    timezone,
    'eeee, LLL d • p - '
  )}`
  let end = `${formatInTimeZone(end_date, timezone, 'p')}`
  if (includeTimezone) {
    end += ` (${timezone})`
  }

  return start + end
}

const getAccountDomainUrl = (account: Account, ellipsize?: boolean): string => {
  if (isProAccount(account)) {
    const domain = account.subscriptions?.find(
      sub => new Date(sub.expiry_time) > new Date()
    )?.domain
    if (domain) {
      return domain
    }
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
const sanitizeContent = (email: string): string => {
  return email.replace(/[^a-zA-Z0-9._%+-@]/g, '')
}
const noNoReplyEmailForAccount = (account_address: string): string => {
  const content = sanitizeContent(
    account_address.replaceAll(' ', '_').toLowerCase()
  )
  return `no_reply_${content}@meetwithwallet.xyz`
}

const decodeMeeting = async (
  meeting: DBSlot,
  currentAccount: Account
): Promise<MeetingDecrypted | null> => {
  const meetingInfoEncrypted = meeting.meeting_info_encrypted as Encrypted
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
const googleUrlParsedDate = (date: Date) =>
  formatInTimeZone(date.getTime(), 'UTC', "yyyyMMdd'T'HHmmSS'Z'")

const outLookUrlParsedDate = (date: Date) =>
  formatInTimeZone(date, 'UTC', "yyyy-MM-dd:HH:mm:SS'Z'")
const generateGoogleCalendarUrl = (
  start?: Date | number,
  end?: Date | number,
  title?: string,
  content?: string,
  meeting_url?: string,
  timezone?: string,
  participants?: MeetingDecrypted['participants']
) => {
  let baseUrl = 'https://calendar.google.com/calendar/r/eventedit?sf=true'
  if (start && end) {
    baseUrl += `&dates=${googleUrlParsedDate(
      new Date(start)
    )}%2F${googleUrlParsedDate(new Date(end))}`
  }
  if (title) {
    baseUrl += `&text=${title}`
  }
  if (content || meeting_url) {
    baseUrl += `&details=${CalendarServiceHelper.getMeetingSummary(
      content,
      meeting_url,
      `${appUrl}/dashboard/meetings`
    )}`
  }
  if (timezone) {
    baseUrl += `&ctz=${timezone}`
  }
  if (participants) {
    baseUrl += `&add=${participants
      ?.map(val => val.guest_email)
      ?.filter(val => !!val)
      ?.join(',')}`
  }
  return baseUrl
}
const generateOffice365CalendarUrl = (
  start?: Date | number,
  end?: Date | number,
  title?: string,
  content?: string,
  meeting_url?: string,
  timezone?: string,
  participants?: MeetingDecrypted['participants']
) => {
  let baseUrl =
    'https://outlook.office.com/calendar/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&online=true'
  if (start) {
    baseUrl += `&startdt=${outLookUrlParsedDate(new Date(start))}`
  }
  if (end) {
    baseUrl += `&enddt=${outLookUrlParsedDate(new Date(end))}`
  }
  if (title) {
    baseUrl += `&subject=${title}`
  }
  if (content || meeting_url) {
    baseUrl += `&body=${CalendarServiceHelper.getMeetingSummary(
      content,
      meeting_url,
      `${appUrl}/dashboard/meetings`
    )}`
  }
  if (participants) {
    baseUrl += `&to=${participants
      ?.map(val => val.guest_email)
      ?.filter(val => !!val)
      ?.join(',')}`
  }
  return baseUrl
}
const allSlots = generateAllSlots()

const selectDefaultProvider = (providers?: Array<MeetingProvider>) => {
  switch (true) {
    case providers?.includes(MeetingProvider.GOOGLE_MEET):
      return MeetingProvider.GOOGLE_MEET
    case providers?.includes(MeetingProvider.ZOOM):
      return MeetingProvider.ZOOM
    case providers?.includes(MeetingProvider.JITSI_MEET):
      return MeetingProvider.JITSI_MEET
    default:
      return MeetingProvider.HUDDLE
  }
}
export {
  allSlots,
  cancelMeeting,
  dateToHumanReadable,
  dateToLocalizedRange,
  decodeMeeting,
  decryptMeeting,
  defaultTimeRange,
  durationToHumanReadable,
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  generateEmptyAvailabilities,
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
  getAccountCalendarUrl,
  getAccountDomainUrl,
  googleUrlParsedDate,
  noNoReplyEmailForAccount,
  outLookUrlParsedDate,
  scheduleMeeting,
  selectDefaultProvider,
  updateMeeting,
}
