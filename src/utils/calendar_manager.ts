import { format, getWeekOfMonth } from 'date-fns'
import { formatInTimeZone, utcToZonedTime } from 'date-fns-tz'
import { Encrypted, encryptWithPublicKey } from 'eth-crypto'
import {
  Alarm,
  Attendee,
  createEvent,
  EventAttributes,
  ReturnObject,
} from 'ics'
import { DateTime } from 'luxon'
import { Frequency, Options, RRule, rrulestr, Weekday } from 'rrule'
import { v4 as uuidv4 } from 'uuid'

import { Account, DayAvailability } from '@/types/Account'
import { MeetingReminders, RecurringStatus } from '@/types/common'
import { Intents } from '@/types/Dashboard'
import {
  ConferenceMeeting,
  DBSlot,
  ExtendedDBSlot,
  ExtendedSlotInstance,
  ExtendedSlotSeries,
  GuestSlot,
  isDBSlot,
  isSlotInstance,
  isSlotSeries,
  MeetingChangeType,
  MeetingDecrypted,
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  ParticipantMappingType,
  SchedulingType,
  SlotInstance,
  SlotSeries,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import {
  MeetingCreationRequest,
  MeetingInstanceUpdateRequest,
  MeetingSeriesUpdateRequest,
  RequestParticipantMapping,
} from '@/types/Requests'
import { Address } from '@/types/Transactions'
import {
  cancelMeeting as apiCancelMeeting,
  cancelMeetingInstance as apiCancelMeetingInstance,
  apiCancelMeetingSeries,
  scheduleMeeting as apiScheduleMeeting,
  scheduleMeetingSeries as apiScheduleMeetingSeries,
  apiUpdateMeeting,
  updateMeetingAsGuest as apiUpdateMeetingAsGuest,
  apiUpdateMeetingInstance,
  apiUpdateMeetingSeries,
  conferenceGuestMeetingCancel,
  decodeMeetingGuest,
  generateMeetingUrl,
  getAccount,
  getAccountPrimaryCalendarEmail,
  getExistingAccounts,
  getGuestSlotById,
  getMeeting,
  getMeetingGuest,
  getSlotByMeetingId,
  getSlotInstanceById,
  getSlotSeries,
  getSlotsByIds,
  isSlotFreeApiCall,
  parsedDecryptedParticipants,
  scheduleMeetingAsGuest,
  scheduleMeetingFromServer,
  syncMeeting,
} from '@/utils/api_helper'

import { diff, intersec } from './collections'
import { appUrl, NO_REPLY_EMAIL } from './constants'
import { NO_MEETING_TYPE, SessionType } from './constants/meeting-types'
import { MeetingPermissions } from './constants/schedule'
import {
  getContentFromEncrypted,
  getContentFromEncryptedPublic,
  simpleHash,
} from './cryptography'
import { checkHasSameScheduleTime } from './date_helper'
import {
  DecryptionFailedError,
  GuestListModificationDenied,
  GuestRescheduleForbiddenError,
  InvalidURL,
  MeetingCancelForbiddenError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingDetailsModificationDenied,
  MeetingNotFoundError,
  MeetingWithYourselfError,
  MultipleSchedulersError,
  TimeNotAvailableError,
} from './errors'
import {
  canAccountAccessPermission,
  getSlugFromText,
  isAccountSchedulerOrOwner,
} from './generic_utils'
import QueryKeys from './query_keys'
import { queryClient } from './react_query'
import { CalendarServiceHelper } from './services/calendar.helper'
import { getSignature } from './storage'
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
  meeting: MeetingInfo & { id: string; user_type?: 'account' | 'guest' },
  currentAccountAddress?: string,
  isSlotSeries?: boolean
) => {
  const accountSlot: { [account: string]: string } = {}
  for (const slotId of meeting.related_slot_ids) {
    try {
      let slot
      if (isSlotSeries) {
        slot = await getSlotSeries(slotId.split('_')?.[0])
      } else {
        if (slotId.includes('_')) {
          slot = await getSlotInstanceById(slotId)
        } else {
          slot = await getMeeting(slotId)
        }
      }
      accountSlot[(slot?.account_address || slot?.guest_email)!] = slotId
    } catch (_e) {
      // some slots might not be found if they belong to guests and were wrongly stored
      try {
        const guestSlot = await getGuestSlotById(slotId)
        if (guestSlot?.guest_email) {
          accountSlot[guestSlot.guest_email] = slotId
        }
      } catch (_e) {}
    }
  }
  return accountSlot
}

const loadMeetingAccountAddresses = async (
  meeting: MeetingInfo,
  currentAccountAddress?: string,
  isSlotSeries?: boolean
): Promise<string[]> => {
  // also make sure that the version of every related db slot is also in sync
  // and that there is a change already going on
  // TODO: change to one fetch all in batch
  const slotsAccounts = []
  for (const slotId of meeting.related_slot_ids) {
    try {
      let otherSlot
      if (isSlotSeries) {
        otherSlot = await getSlotSeries(slotId.split('_')?.[0])
      } else {
        if (slotId.includes('_')) {
          otherSlot = await getSlotInstanceById(slotId)
        } else {
          otherSlot = await getMeeting(slotId)
        }
      }
      otherSlot?.account_address &&
        slotsAccounts.push(otherSlot?.account_address)
    } catch (_e) {
      // some slots might not be found if they belong to guests and were wrongly stored
    }
  }

  if (currentAccountAddress) {
    slotsAccounts.unshift(currentAccountAddress.toLowerCase())
  }

  return slotsAccounts
}

const handleParticipants = async (
  participants: ParticipantInfo[],
  currentAccount?: Account | null
) => {
  const allAccounts: Account[] = await getExistingAccounts(
    participants.filter(p => p.account_address).map(p => p.account_address!)
  )
  for (const account of allAccounts) {
    const participant = participants.find(
      p => p.account_address?.toLowerCase() === account.address.toLowerCase()
    )
    if (participant) {
      participant.name = participant.name || getAccountDisplayName(account)
      participant.status = participant.status
      participant.type = participant.type || ParticipantType.Invitee
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
    throw new MultipleSchedulersError()
  }
  return { allAccounts, sanitizedParticipants }
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
  meetingContent?: string,
  meetingUrl = '',
  meetingId = '',
  meetingTitle = 'No Title',
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[],
  txHash?: Address | null,
  version?: number
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
  const rrule = handleRRULEForMeeting(meetingRepeat, startTime)
  const privateInfo: MeetingInfo = {
    change_history_paths: [],
    content: meetingContent,
    created_at: new Date(),
    meeting_id: meetingId,
    meeting_url: meetingUrl,
    participants: sanitizedParticipants,
    permissions: selectedPermissions,
    provider: meetingProvider,
    recurrence: meetingRepeat,
    related_slot_ids: [],
    reminders: meetingReminders,
    title: meetingTitle,
    rrule,
  }
  // first pass to make sure that we are keeping the existing slot id
  for (const participant of sanitizedParticipants) {
    const existingSlotId = participantsToKeep[participant.account_address || '']
    participant.slot_id = existingSlotId || participant.slot_id
  }

  const allSlotIds = sanitizedParticipants
    .map(it => it.slot_id!)
    .filter((val): val is string => val !== undefined)

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
    } as MeetingInfo)

    const participantMapping: RequestParticipantMapping = {
      account_address: participant.account_address || '',
      guest_email: participant.guest_email,
      mappingType: !!participantsToKeep[
        participant.account_address || participant.guest_email || ''
      ]
        ? ParticipantMappingType.KEEP
        : ParticipantMappingType.ADD,
      meeting_id: meetingId,
      name: participant.name || '',
      privateInfo: await encryptWithPublicKey(encodingKey, privateInfoComplete),
      // store a hash of the original data in order to be able to determine in the
      // future if the user is th
      privateInfoHash: simpleHash(privateInfoComplete),
      // this is the actual slot id for this participant, we choose it before creation
      slot_id: participant.slot_id,
      status:
        participant.status ||
        (participant.type === ParticipantType.Scheduler
          ? ParticipationStatus.Accepted
          : ParticipationStatus.Pending),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      type: participant.type,
    }

    participantsMappings.push(participantMapping)
  }
  const conferenceEncodingKey = process.env.NEXT_PUBLIC_SERVER_PUB_KEY!
  const basePrivateInfoComplete = JSON.stringify({
    ...privateInfo,
    // we need to store the other related slots in other to update the meeting later
    // for the base info, we store all slots
    related_slot_ids: allSlotIds,
  })
  const encrypted: Encrypted = await encryptWithPublicKey(
    conferenceEncodingKey,
    basePrivateInfoComplete
  )

  return {
    allSlotIds,
    content: privateInfo['content'],
    encrypted_metadata: encrypted,
    end: endTime,
    ignoreOwnerAvailability:
      participantsMappings.filter(
        mapping => mapping.type === ParticipantType.Owner
      ).length > 1,
    meeting_id: meetingId,
    meeting_url: privateInfo['meeting_url'],
    meetingPermissions: selectedPermissions,
    meetingProvider,
    meetingReminders,
    meetingRepeat,
    meetingTypeId,
    participants_mapping: participantsMappings,
    rrule,
    start: startTime,
    title: privateInfo['title'],
    txHash,
    type: schedulingType,
    version: version || 0,
  }
}

const updateMeetingAsGuest = async (
  slotId: string,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  participants: ParticipantInfo[],
  meetingProvider: MeetingProvider,
  meetingContent?: string,
  meetingUrl?: string,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[]
): Promise<MeetingDecrypted> => {
  const fullMeetingData = await getMeetingGuest(slotId)
  if (!fullMeetingData) {
    throw new Error('meeting data not found')
  }

  // Get all slots for this meeting from the database
  const allSlots = await getSlotsByIds(fullMeetingData.slots)

  // Find a slot that actually exists in the db
  const validSlot = allSlots.find(
    slot => slot.account_address && slot.account_address.trim() !== ''
  )
  if (!validSlot || !validSlot.id) {
    throw new Error('No valid slot found with account address')
  }

  const validSlotId = validSlot.id

  const currentVersion = validSlot.version

  const existingSlotIds = fullMeetingData.slots || []

  const existingParticipants: ParticipantInfo[] = []
  if (allSlots.length > 1) {
    throw new GuestRescheduleForbiddenError()
  }
  for (const slot of allSlots) {
    if (slot.account_address) {
      existingParticipants.push({
        account_address: slot.account_address,
        meeting_id: fullMeetingData.id || '',
        name: '', // Will be filled by handleParticipants
        slot_id: slot.id!,
        status: ParticipationStatus.Accepted,
        type: slot.role || ParticipantType.Owner,
      })
    }
  }

  // Combine existing participants with new participants
  const allParticipants = [...existingParticipants, ...participants]

  const participantsToKeep: { [participantKey: string]: string } = {}

  existingParticipants.forEach((participant, index) => {
    const participantKey =
      participant.account_address || participant.guest_email || ''

    // For account participants, find the actual slot that belongs to them
    if (participant.account_address) {
      const participantSlot = allSlots.find(
        slot => slot.account_address === participant.account_address
      )
      if (participantSlot && participantSlot.id) {
        participantsToKeep[participantKey] = participantSlot.id
      }
    }

    // Fallback logic for both account participants (if slot not found) and guests
    if (!participantsToKeep[participantKey] && index < existingSlotIds.length) {
      participantsToKeep[participantKey] = existingSlotIds[index]
    }
  })

  // Map existing guest participants to their slot IDs from the original meeting
  for (const participant of participants) {
    if (
      participant.guest_email &&
      participant.type === ParticipantType.Scheduler
    ) {
      participantsToKeep[participant.guest_email] = slotId
    }
  }

  // Build participant data for guests
  const participantData = await handleParticipants(allParticipants, undefined)

  for (const participant of participantData.sanitizedParticipants) {
    if (
      participant.guest_email &&
      participantsToKeep[participant.guest_email]
    ) {
      participant.slot_id = participantsToKeep[participant.guest_email]
    }
  }

  let finalMeetingUrl = meetingUrl || fullMeetingData.meeting_url || ''
  // If no meetingUrl is provided or the provider has changed, generate a new one (unless CUSTOM)
  if (
    (!meetingUrl && meetingProvider !== MeetingProvider.CUSTOM) ||
    (meetingProvider !== MeetingProvider.CUSTOM &&
      meetingProvider !== fullMeetingData.provider)
  ) {
    const generated = await generateMeetingUrl({
      accounts: participantData.allAccounts,
      content: meetingContent,
      end: endTime,
      meeting_id: fullMeetingData.id || '',
      meetingProvider,
      meetingReminders,
      meetingRepeat,
      participants_mapping: participantData.sanitizedParticipants,
      start: startTime,
      title: meetingTitle || fullMeetingData.title || 'No Title',
    })
    finalMeetingUrl = generated.url
  }

  const meetingData = await buildMeetingData(
    SchedulingType.GUEST,
    meetingTypeId,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    participantsToKeep,
    meetingProvider,
    meetingContent,
    finalMeetingUrl,
    fullMeetingData.id,
    meetingTitle,
    meetingReminders,
    meetingRepeat,
    selectedPermissions
  )

  const payload = {
    ...meetingData,
    guestsToRemove: [],
    slotsToRemove: [],
    version: currentVersion + 1,
  }

  const slot: DBSlot = await apiUpdateMeetingAsGuest(validSlotId, payload)

  return {
    content: meetingData.content,
    created_at: new Date(),
    end: meetingData.end,
    id: slot.id!,
    meeting_id: slot.id!,
    meeting_info_encrypted: slot.meeting_info_encrypted,
    meeting_url: meetingData.meeting_url,
    participants: meetingData.participants_mapping,
    related_slot_ids: meetingData.allSlotIds || [],
    start: meetingData.start,
    title: meetingData.title,
    version: slot.version,
    rrule: meetingData.rrule,
  }
}

/**
 * Updates a meeting with the provided parameters
 * @param ignoreAvailabilities - determine if we should check the availabilities of the participants
 * @param currentAccountAddress - the address of the current account
 * @param meetingTypeId - the id of the meeting type
 * @param startTime
 * @param endTime
 * @param decryptedMeeting
 * @param signature
 * @param participants
 * @param content
 * @param ocess.e
 * @param meetingProvider
 * @param meetingTitle
 * @param meetingReminders
 * @param meetingRepeat
 * @param selectedPermissions
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
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[]
): Promise<MeetingDecrypted> => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const currentAccount = await getAccount(currentAccountAddress)
  let existingMeeting: MeetingDecrypted | null = null
  if (decryptedMeeting.user_type === 'guest') {
    const existingDBSlot = await getSlotByMeetingId(decryptedMeeting.meeting_id)
    if (!existingDBSlot) {
      throw new MeetingChangeConflictError()
    }
    if (existingDBSlot?.user_type === 'guest') {
      existingMeeting = await decodeMeetingGuest(existingDBSlot)
    } else {
      existingMeeting = await decryptMeeting(
        existingDBSlot,
        currentAccount,
        signature
      )
    }
  } else {
    const existingDBSlot = await getMeeting(decryptedMeeting.id)
    existingMeeting = await decryptMeeting(
      existingDBSlot,
      currentAccount,
      signature
    )
  }

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
  }

  const canEditMeetingDetails = canAccountAccessPermission(
    existingMeeting?.permissions,
    existingMeeting?.participants,
    currentAccountAddress,
    MeetingPermissions.EDIT_MEETING
  )

  if (!canEditMeetingDetails) {
    const detailsChanged =
      existingMeeting.title !== meetingTitle ||
      existingMeeting.content !== content ||
      existingMeeting.meeting_url !== meetingUrl ||
      existingMeeting.provider !== meetingProvider ||
      JSON.stringify(
        existingMeeting.reminders?.slice().sort((a, b) => a - b)
      ) !== JSON.stringify(meetingReminders?.slice().sort((a, b) => a - b)) ||
      JSON.stringify(existingMeeting.permissions?.slice().sort()) !==
        JSON.stringify(selectedPermissions?.slice().sort()) ||
      new Date(existingMeeting.start).getTime() !==
        new Date(startTime).getTime() ||
      new Date(existingMeeting.end).getTime() !== new Date(endTime).getTime()

    if (detailsChanged) {
      throw new MeetingDetailsModificationDenied()
    }
    const canUpdateOtherGuests = canAccountAccessPermission(
      existingMeeting?.permissions,
      existingMeeting?.participants,
      currentAccountAddress,
      MeetingPermissions.INVITE_GUESTS
    )

    // Prevent non-schedulers from changing the number of participants:
    // If the acting user is NOT the scheduler and the number of participants has changed,
    // throw an error to block unauthorized modifications to the meeting's participant list.
    if (
      !canUpdateOtherGuests &&
      existingMeeting?.participants?.length !== participants.length
    ) {
      throw new GuestListModificationDenied()
    }
  }

  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    existingMeeting!,
    currentAccount.address
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
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingProvider,
    content,
    meetingUrl,
    rootMeetingId,
    meetingTitle,
    meetingReminders,
    meetingRepeat,
    selectedPermissions
  )
  const payload = {
    ...meetingData,
    guestsToRemove,
    ignoreOwnerAvailability: true,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: decryptedMeeting.version + 1,
  }

  const slotId = decryptedMeeting.id.split('_')[0]
  if (decryptedMeeting.user_type === 'guest') {
    const slot: DBSlot = await apiUpdateMeetingAsGuest(slotId, payload)
    return {
      content: meetingData.content,
      created_at: new Date(),
      end: meetingData.end,
      id: slot.id!,
      meeting_id: slot.id!,
      meeting_info_encrypted: slot.meeting_info_encrypted,
      meeting_url: meetingData.meeting_url,
      participants: meetingData.participants_mapping,
      related_slot_ids: meetingData.allSlotIds || [],
      start: meetingData.start,
      title: meetingData.title,
      version: slot.version,
      rrule: meetingData.rrule,
    }
  } else {
    const slot: DBSlot = await apiUpdateMeeting(slotId, payload)
    return (await decryptMeeting(slot, currentAccount))!
  }
}

// TODO: MAKE SURE TO HANDLE ALL EDGE CASES
const updateMeetingInstance = async (
  instanceId: string,
  currentAccountAddress: string,
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
  selectedPermissions?: MeetingPermissions[]
): Promise<MeetingDecrypted> => {
  // Sanity check
  if (!instanceId.includes('_')) {
    throw new MeetingChangeConflictError()
  }

  const [currentAccount, existingDBSlot] = await Promise.all([
    getAccount(currentAccountAddress),
    getSlotInstanceById(instanceId),
  ])

  if (!existingDBSlot) {
    throw new MeetingNotFoundError(instanceId)
  }

  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    currentAccount,
    signature
  )
  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
  }

  if (!existingMeeting?.participants) {
    throw new MeetingNotFoundError(instanceId)
  }

  const canEditMeetingDetails = canAccountAccessPermission(
    existingMeeting?.permissions,
    existingMeeting?.participants,
    currentAccountAddress,
    MeetingPermissions.EDIT_MEETING
  )

  if (!canEditMeetingDetails) {
    const detailsChanged =
      existingMeeting.title !== meetingTitle ||
      existingMeeting.content !== content ||
      existingMeeting.meeting_url !== meetingUrl ||
      existingMeeting.provider !== meetingProvider ||
      JSON.stringify(
        existingMeeting.reminders?.slice().sort((a, b) => a - b)
      ) !== JSON.stringify(meetingReminders?.slice().sort((a, b) => a - b)) ||
      JSON.stringify(existingMeeting.permissions?.slice().sort()) !==
        JSON.stringify(selectedPermissions?.slice().sort()) ||
      new Date(existingMeeting.start).getTime() !==
        new Date(startTime).getTime() ||
      new Date(existingMeeting.end).getTime() !== new Date(endTime).getTime()

    if (detailsChanged) {
      throw new MeetingDetailsModificationDenied()
    }
  }
  const canUpdateOtherGuests = canAccountAccessPermission(
    existingMeeting?.permissions,
    existingMeeting?.participants,
    currentAccountAddress,
    MeetingPermissions.INVITE_GUESTS
  )

  if (
    !canUpdateOtherGuests &&
    existingMeeting?.participants?.length !== participants.length
  ) {
    throw new GuestListModificationDenied()
  }

  const oldParticipantsParsing = await parsedDecryptedParticipants(
    instanceId,
    existingMeeting.participants
      .filter(p => !!p.slot_id)
      .map(p => ({
        account_address: p.account_address,
        guest_email: p.guest_email,
        slot_id: p.slot_id!,
      }))
  )
  const oldParticipantMap = new Map(
    oldParticipantsParsing.map(p => [
      p.account_address || p.guest_email,
      p.slot_id,
    ])
  )
  existingMeeting.related_slot_ids = oldParticipantsParsing.map(p => p.slot_id)

  existingMeeting.participants = existingMeeting.participants.map(
    participant => {
      const key = participant.account_address || participant.guest_email
      if (oldParticipantMap.has(key)) {
        return {
          ...participant,
          slot_id: oldParticipantMap.get(key),
        }
      }
      return participant
    }
  )
  participants = participants.map(participant => {
    const key = participant.account_address || participant.guest_email
    if (oldParticipantMap.has(key)) {
      return {
        ...participant,
        slot_id: oldParticipantMap.get(key),
      }
    }
    return participant
  })

  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    existingMeeting!,
    currentAccount.address
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
  const oldGuests = existingMeeting.participants.filter(p => p.guest_email)

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

  const participantData = await handleParticipants(participants, currentAccount)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    NO_MEETING_TYPE,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingProvider,
    content,
    meetingUrl,
    rootMeetingId,
    meetingTitle,
    meetingReminders,
    existingMeeting.recurrence,
    selectedPermissions
  )
  const payload: MeetingInstanceUpdateRequest = {
    ...meetingData,
    guestsToRemove,
    ignoreOwnerAvailability: true,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: existingMeeting.version + 1,
  }

  const slot: DBSlot = await apiUpdateMeetingInstance(instanceId, payload)
  return (await decryptMeeting(slot, currentAccount))!
}
const deleteMeetingInstance = async (
  instanceId: string,
  currentAccountAddress: string,
  decryptedMeeting: MeetingDecrypted,
  scheduler?: ParticipantInfo
) => {
  if (!instanceId.includes('_')) {
    throw new MeetingChangeConflictError()
  }
  const signature = getSignature(currentAccountAddress || '') || ''

  const [currentAccount, existingDBSlot] = await Promise.all([
    getAccount(currentAccountAddress),
    getSlotInstanceById(instanceId),
  ])

  if (!existingDBSlot) {
    throw new MeetingNotFoundError(instanceId)
  }

  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    currentAccount,
    signature
  )

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
  }
  const oldParticipantsParsing = await parsedDecryptedParticipants(
    instanceId,
    existingMeeting.participants
      .filter(p => !!p.slot_id)
      .map(p => ({
        account_address: p.account_address,
        guest_email: p.guest_email,
        slot_id: p.slot_id!,
      }))
  )
  const oldParticipantMap = new Map(
    oldParticipantsParsing.map(p => [
      p.account_address || p.guest_email,
      p.slot_id,
    ])
  )
  existingMeeting.related_slot_ids = oldParticipantsParsing.map(p => p.slot_id)

  existingMeeting.participants = existingMeeting.participants.map(
    participant => {
      const key = participant.account_address || participant.guest_email
      if (oldParticipantMap.has(key)) {
        return {
          ...participant,
          slot_id: oldParticipantMap.get(key),
        }
      }
      return participant
    }
  )
  let participants: ParticipantInfo[] = existingMeeting?.participants?.filter(
    val => val.account_address !== currentAccountAddress
  )
  if (scheduler) {
    if (participants.some(val => val.type === ParticipantType.Scheduler)) {
      throw new MultipleSchedulersError()
    }
    participants = participants.map(participant => {
      if (
        participant.account_address?.toLowerCase() ===
        scheduler.account_address?.toLowerCase()
      ) {
        return {
          ...participant,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        }
      }
      return participant
    })
  }
  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    existingMeeting!,
    currentAccount.address
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

  const participantData = await handleParticipants(participants, currentAccount)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    NO_MEETING_TYPE,
    existingMeeting.start,
    existingMeeting.end,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    existingMeeting?.provider || MeetingProvider.GOOGLE_MEET,
    existingMeeting?.content,
    existingMeeting?.meeting_url || '',
    rootMeetingId,
    existingMeeting?.title || '',
    existingMeeting?.reminders || [],
    existingMeeting?.recurrence || MeetingRepeat.NO_REPEAT
  )
  const payload: MeetingInstanceUpdateRequest = {
    ...meetingData,
    guestsToRemove,
    ignoreOwnerAvailability: true,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: existingMeeting.version + 1,
  }
  const slotId = existingMeeting.id.split('_')[0]

  // Fetch the updated data one last time
  const slot: DBSlot = await apiUpdateMeetingInstance(slotId, payload)
  return (await decryptMeeting(slot, currentAccount))!
}
const cancelMeetingSeries = async (
  currentInstanceId: string,
  currentAccountAddress: string
) => {
  if (!currentInstanceId.includes('_')) {
    throw new MeetingChangeConflictError()
  }
  const signature = getSignature(currentAccountAddress || '') || ''

  const [slotId] = currentInstanceId.split('_')

  const [currentAccount, existingDBSeries] = await Promise.all([
    getAccount(currentAccountAddress),
    getSlotSeries(slotId),
  ])

  if (!existingDBSeries) {
    throw new MeetingNotFoundError(currentInstanceId)
  }

  const meetingContent = await getContentFromEncrypted(
    currentAccount,
    signature || getSignature(currentAccount.address)!,
    existingDBSeries?.default_meeting_info_encrypted as Encrypted
  )
  if (!meetingContent) {
    throw new MeetingNotFoundError(currentInstanceId)
  }
  const meetingInfo = JSON.parse(meetingContent) as MeetingInfo
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    meetingInfo?.participants,
    currentAccountAddress
  )
  if (!isSchedulerOrOwner) {
    throw new MeetingCancelForbiddenError()
  }
  const response = await apiCancelMeetingSeries(
    slotId,
    meetingInfo,
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  return response
}
const updateMeetingConferenceGuest = async (
  ignoreAvailabilities: boolean,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  conferenceId: string,
  slotId: string,
  participants: ParticipantInfo[],
  content: string,
  meetingUrl: string,
  meetingProvider: MeetingProvider,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[]
): Promise<MeetingDecrypted> => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }
  const actorParticipant = decryptedMeeting.participants.find(
    p => p.slot_id === slotId
  )
  const canUpdateOtherGuests = canAccountAccessPermission(
    decryptedMeeting?.permissions,
    decryptedMeeting?.participants,
    actorParticipant?.guest_email || actorParticipant?.account_address,
    MeetingPermissions.INVITE_GUESTS
  )
  if (
    !canUpdateOtherGuests &&
    decryptedMeeting?.participants?.length !== participants.length
  ) {
    throw new GuestListModificationDenied()
  }

  const canEditMeetingDetails = canAccountAccessPermission(
    decryptedMeeting?.permissions,
    decryptedMeeting?.participants,
    actorParticipant?.guest_email || actorParticipant?.account_address,
    MeetingPermissions.EDIT_MEETING
  )

  if (
    !canEditMeetingDetails &&
    (decryptedMeeting?.title !== meetingTitle ||
      decryptedMeeting?.content !== content ||
      decryptedMeeting?.meeting_url !== meetingUrl ||
      decryptedMeeting?.provider !== meetingProvider ||
      decryptedMeeting?.reminders?.length !== meetingReminders?.length ||
      decryptedMeeting?.recurrence !== meetingRepeat ||
      decryptedMeeting?.permissions?.length !== selectedPermissions?.length ||
      new Date(decryptedMeeting?.start).getTime() !==
        new Date(startTime).getTime() ||
      new Date(decryptedMeeting?.end).getTime() !== new Date(endTime).getTime())
  ) {
    throw new MeetingDetailsModificationDenied()
  }

  const existingDBSlot = (await getSlotByMeetingId(
    conferenceId
  )) as GuestSlot | null
  if (!existingDBSlot) {
    throw new MeetingChangeConflictError()
  }
  const existingMeeting = await decryptMeetingGuest(existingDBSlot)

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingDBSlot.version) {
    throw new MeetingChangeConflictError()
  }

  const existingMeetingAccounts = await loadMeetingAccountAddresses(
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
    ...participants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase()),
  ])

  // Prevent non-schedulers from changing the number of participants:
  // If the acting user is NOT the scheduler and the number of participants has changed,
  // throw an error to block unauthorized modifications to the meeting's participant list.
  if (
    !canUpdateOtherGuests &&
    participants.length !== decryptedMeeting.participants.length
  ) {
    throw new MeetingChangeConflictError()
  }

  const accountSlotMap = await mapRelatedSlots(existingMeeting!)

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
      .filter(p => p.account_address)
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
  const participantData = await handleParticipants(participants)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    meetingTypeId,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingProvider,
    content,
    meetingUrl,
    rootMeetingId,
    meetingTitle,
    meetingReminders,
    meetingRepeat,
    selectedPermissions
  )

  const payload = {
    ...meetingData,
    guestsToRemove,
    slotsToRemove: toRemove.map(it => accountSlotMap[it]),
    version: decryptedMeeting.version + 1,
  }

  const slot: DBSlot = await apiUpdateMeetingAsGuest(slotId, payload)

  return {
    content: meetingData.content,
    created_at: new Date(),
    end: meetingData.end,
    id: slot.id!,
    meeting_id: slot.id!,
    meeting_info_encrypted: slot.meeting_info_encrypted,
    meeting_url: meetingData.meeting_url,
    participants: meetingData.participants_mapping,
    related_slot_ids: meetingData.allSlotIds || [],
    start: meetingData.start,
    title: meetingData.title,
    version: slot.version,
    rrule: meetingData.rrule,
  }
}

const cancelMeetingInstance = async (
  currentAccountAddress: string,
  instanceId: string,
  decryptedMeeting: MeetingDecrypted
): Promise<{ removed: string[] }> => {
  if (!instanceId.includes('_')) {
    throw new MeetingChangeConflictError()
  }

  const [currentAccount, existingDBSlot] = await Promise.all([
    getAccount(currentAccountAddress),
    getSlotInstanceById(instanceId),
  ])

  if (!existingDBSlot) {
    throw new MeetingNotFoundError(instanceId)
  }
  const signature = getSignature(currentAccountAddress)!

  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    currentAccount,
    signature
  )
  if (!existingMeeting) throw new MeetingNotFoundError(instanceId)
  const oldParticipantsParsing = await parsedDecryptedParticipants(
    instanceId,
    existingMeeting.participants
      .filter(p => !!p.slot_id)
      .map(p => ({
        account_address: p.account_address,
        guest_email: p.guest_email,
        slot_id: p.slot_id!,
      }))
  )
  const oldParticipantMap = new Map(
    oldParticipantsParsing.map(p => [
      p.account_address || p.guest_email,
      p.slot_id,
    ])
  )
  existingMeeting.related_slot_ids = oldParticipantsParsing.map(p => p.slot_id)

  existingMeeting.participants = existingMeeting.participants.map(
    participant => {
      const key = participant.account_address || participant.guest_email
      if (oldParticipantMap.has(key)) {
        return {
          ...participant,
          slot_id: oldParticipantMap.get(key),
        }
      }
      return participant
    }
  )
  const isMeetingOwners = existingMeeting?.participants.find(
    user => user.type === ParticipantType.Owner && user.slot_id === instanceId
  )
  const isMeetingScheduler = existingMeeting?.participants.find(
    user =>
      user.type === ParticipantType.Scheduler && user.slot_id === instanceId
  )

  if (!isMeetingOwners && !isMeetingScheduler) {
    throw new MeetingCancelForbiddenError()
  }

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
  }
  // Fetch the updated data one last time
  const response = await apiCancelMeetingInstance(
    {
      ...existingMeeting,
      id: instanceId,
      related_slot_ids: existingMeeting.participants
        .map(p => p.slot_id)
        .filter((s): s is string => !!s),
    },
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  return response
}
const updateMeetingSeries = async (
  currentInstanceId: string,
  currentAccountAddress: string,
  startTime: Date,
  endTime: Date,
  signature: string,
  participants: ParticipantInfo[],
  content: string,
  meetingUrl: string,
  meetingProvider: MeetingProvider,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  selectedPermissions?: MeetingPermissions[]
) => {
  participants = participants.map(p => ({
    ...p,
    slot_id: p.slot_id?.split('_')[0],
  }))
  if (!currentInstanceId.includes('_')) {
    throw new MeetingChangeConflictError()
  }
  const [slotId] = currentInstanceId.split('_')

  const [currentAccount, existingDBSeries] = await Promise.all([
    getAccount(currentAccountAddress),
    getSlotSeries(slotId),
  ])

  if (!existingDBSeries) {
    throw new MeetingNotFoundError(currentInstanceId)
  }

  const meetingContent = await getContentFromEncrypted(
    currentAccount,
    signature || getSignature(currentAccount.address)!,
    existingDBSeries?.default_meeting_info_encrypted as Encrypted
  )
  if (!meetingContent) {
    throw new MeetingNotFoundError(currentInstanceId)
  }
  const meetingInfo = JSON.parse(meetingContent) as MeetingInfo

  const canEditMeetingDetails = canAccountAccessPermission(
    meetingInfo?.permissions,
    meetingInfo?.participants,
    currentAccountAddress,
    MeetingPermissions.EDIT_MEETING
  )
  if (!canEditMeetingDetails) {
    const detailsChanged =
      meetingInfo.title !== meetingTitle ||
      meetingInfo.content !== content ||
      meetingInfo.meeting_url !== meetingUrl ||
      meetingInfo.provider !== meetingProvider ||
      JSON.stringify(meetingInfo.reminders?.slice().sort((a, b) => a - b)) !==
        JSON.stringify(meetingReminders?.slice().sort((a, b) => a - b)) ||
      JSON.stringify(meetingInfo.permissions?.slice().sort()) !==
        JSON.stringify(selectedPermissions?.slice().sort()) ||
      checkHasSameScheduleTime(
        new Date(existingDBSeries.template_start),
        startTime
      ) ||
      checkHasSameScheduleTime(new Date(existingDBSeries.template_end), endTime)
    if (detailsChanged) {
      throw new MeetingDetailsModificationDenied()
    }
    const canUpdateOtherGuests = canAccountAccessPermission(
      meetingInfo?.permissions,
      meetingInfo?.participants,
      currentAccountAddress,
      MeetingPermissions.INVITE_GUESTS
    )

    if (!canUpdateOtherGuests) {
      throw new GuestListModificationDenied()
    }
  }
  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    meetingInfo!,
    currentAccount.address,
    true
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
    { ...meetingInfo, id: slotId, user_type: 'account' }!,
    currentAccountAddress
  )

  const oldGuests = meetingInfo.participants.filter(p => p.guest_email)

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

  const rootMeetingId = existingDBSeries?.meeting_id

  const participantData = await handleParticipants(participants, currentAccount)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    NO_MEETING_TYPE,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingProvider,
    content,
    meetingUrl,
    rootMeetingId,
    meetingTitle,
    meetingReminders,
    meetingInfo.recurrence,
    selectedPermissions
  )
  const payload: MeetingSeriesUpdateRequest = {
    ...meetingData,
    guestsToRemove,
    ignoreOwnerAvailability: true,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    focus_instance_id: currentInstanceId,
  }
  const slot: DBSlot = await apiUpdateMeetingSeries(slotId, payload)
  return (await decryptMeeting(slot, currentAccount))!
}
const deleteMeetingSeries = async (
  currentInstanceId: string,
  currentAccountAddress: string,
  scheduler?: ParticipantInfo
) => {
  if (!currentInstanceId.includes('_')) {
    throw new MeetingChangeConflictError()
  }
  const [slotId] = currentInstanceId.split('_')

  const [currentAccount, existingDBSeries, existingSlotInstance] =
    await Promise.all([
      getAccount(currentAccountAddress),
      getSlotSeries(slotId),
      getSlotInstanceById(currentInstanceId),
    ])

  if (!existingDBSeries || !existingSlotInstance) {
    throw new MeetingNotFoundError(currentInstanceId)
  }

  const meetingContent = await getContentFromEncrypted(
    currentAccount,
    getSignature(currentAccount.address)!,
    existingDBSeries?.default_meeting_info_encrypted as Encrypted
  )
  if (!meetingContent) {
    throw new MeetingNotFoundError(currentInstanceId)
  }
  const meetingInfo = JSON.parse(meetingContent) as MeetingInfo

  let participants: ParticipantInfo[] = meetingInfo?.participants?.filter(
    val => val.account_address !== currentAccountAddress
  )
  if (scheduler) {
    if (participants.some(val => val.type === ParticipantType.Scheduler)) {
      throw new MultipleSchedulersError()
    }
    participants = participants.map(participant => {
      if (
        participant.account_address?.toLowerCase() ===
        scheduler.account_address?.toLowerCase()
      ) {
        return {
          ...participant,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        }
      }
      return participant
    })
  }
  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    meetingInfo!,
    currentAccount.address,
    true
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
    { ...meetingInfo, id: slotId, user_type: 'account' }!,
    currentAccountAddress
  )

  const oldGuests = meetingInfo.participants.filter(p => p.guest_email)

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

  const rootMeetingId = existingDBSeries?.meeting_id

  const participantData = await handleParticipants(participants, currentAccount)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    NO_MEETING_TYPE,
    new Date(existingSlotInstance.start),
    new Date(existingSlotInstance.end),
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingInfo.provider || MeetingProvider.GOOGLE_MEET,
    meetingInfo.content,
    meetingInfo.meeting_url,
    rootMeetingId,
    meetingInfo.title,
    meetingInfo.reminders,
    meetingInfo.recurrence,
    meetingInfo.permissions
  )
  const payload: MeetingSeriesUpdateRequest = {
    ...meetingData,
    guestsToRemove,
    ignoreOwnerAvailability: true,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    focus_instance_id: currentInstanceId,
  }
  const slot: DBSlot = await apiUpdateMeetingSeries(slotId, payload)
  return (await decryptMeeting(slot, currentAccount))!
}

const deleteMeeting = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId: string,
  decryptedMeeting: MeetingDecrypted,
  scheduler?: ParticipantInfo
): Promise<DBSlot> => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }
  const signature = getSignature(currentAccountAddress || '') || ''

  const currentAccount = await getAccount(currentAccountAddress)
  let existingMeeting: MeetingDecrypted | null = null
  if (decryptedMeeting.user_type === 'guest') {
    const existingDBSlot = await getSlotByMeetingId(decryptedMeeting.meeting_id)
    if (!existingDBSlot) {
      throw new MeetingChangeConflictError()
    }
    if (existingDBSlot?.user_type === 'guest') {
      existingMeeting = await decodeMeetingGuest(existingDBSlot)
    } else {
      existingMeeting = await decryptMeeting(
        existingDBSlot,
        currentAccount,
        signature
      )
    }
  } else {
    const existingDBSlot = await getMeeting(decryptedMeeting.id)
    existingMeeting = await decryptMeeting(
      existingDBSlot,
      currentAccount,
      signature
    )
  }

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
  }

  let participants: ParticipantInfo[] = decryptedMeeting?.participants?.filter(
    val => val.account_address !== currentAccountAddress
  )
  if (scheduler) {
    if (participants.some(val => val.type === ParticipantType.Scheduler)) {
      throw new MultipleSchedulersError()
    }
    participants = participants.map(participant => {
      if (
        participant.account_address?.toLowerCase() ===
        scheduler.account_address?.toLowerCase()
      ) {
        return {
          ...participant,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        }
      }
      return participant
    })
  }

  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    existingMeeting!,
    currentAccount.address
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
                  existingMeeting.start,
                  existingMeeting.end,
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
    existingMeeting.start,
    existingMeeting.end,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    existingMeeting?.provider || MeetingProvider.GOOGLE_MEET,
    existingMeeting?.content,
    existingMeeting?.meeting_url || '',
    rootMeetingId,
    existingMeeting?.title || '',
    existingMeeting?.reminders || [],
    existingMeeting?.recurrence || MeetingRepeat.NO_REPEAT
  )
  const payload = {
    ...meetingData,
    guestsToRemove,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: existingMeeting.version + 1,
  }
  const slotId = decryptedMeeting.id.split('_')[0]

  // Fetch the updated data one last time
  const slot: DBSlot = await apiUpdateMeeting(slotId, payload)
  return slot
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

  let existingMeeting: MeetingDecrypted | null = null
  if (decryptedMeeting.user_type === 'guest') {
    const existingDBSlot = await getSlotByMeetingId(decryptedMeeting.meeting_id)
    if (!existingDBSlot) {
      throw new MeetingChangeConflictError()
    }
    if (existingDBSlot?.user_type === 'guest') {
      existingMeeting = await decodeMeetingGuest(existingDBSlot)
    } else {
      existingMeeting = await decryptMeeting(
        existingDBSlot,
        ownerAccount,
        signature
      )
    }
  } else {
    const existingDBSlot = await getMeeting(decryptedMeeting.id)
    existingMeeting = await decryptMeeting(
      existingDBSlot,
      ownerAccount,
      signature
    )
  }

  const slotId = decryptedMeeting.id.split('_')[0]

  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    existingMeeting?.participants,
    currentAccountAddress
  )
  if (!isSchedulerOrOwner) {
    throw new MeetingCancelForbiddenError()
  }

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
  }
  // Fetch the updated data one last time
  const response = await apiCancelMeeting(
    {
      ...existingMeeting,
      id: slotId,
    },
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  return response
}
const cancelMeetingGuest = async (
  decryptedMeeting: MeetingDecrypted,
  reason?: string
): Promise<{ removed: string[] } | undefined> => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const existingDBSlot = (await getSlotByMeetingId(
    decryptedMeeting.meeting_id
  )) as GuestSlot | null
  if (!existingDBSlot) {
    throw new MeetingChangeConflictError()
  }
  const existingMeeting = await decodeMeetingGuest(existingDBSlot)

  // Only the owner or scheduler of the meeting can cancel it
  const meetingOwners = existingMeeting!.participants.filter(
    user => user.type === ParticipantType.Owner
  )
  const meetingScheduler = existingMeeting!.participants.find(
    user => user.type === ParticipantType.Scheduler
  )
  if (
    meetingOwners?.every(account => account.slot_id !== decryptedMeeting.id) &&
    meetingScheduler?.slot_id !== decryptedMeeting.id
  ) {
    throw new MeetingCancelForbiddenError()
  }

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingDBSlot.version) {
    throw new MeetingChangeConflictError()
  }
  const actorParticipant = decryptedMeeting.participants.find(
    p => p.slot_id === decryptedMeeting.id
  )
  // Fetch the updated data one last time
  const response = await conferenceGuestMeetingCancel(
    decryptedMeeting.meeting_id,
    {
      currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      guest_email: actorParticipant?.guest_email || '',
      meeting: {
        ...decryptedMeeting,
        related_slot_ids: decryptedMeeting.related_slot_ids.concat([
          decryptedMeeting.id,
        ]),
      },
      reason: reason || '',
    }
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
  selectedPermissions?: MeetingPermissions[],
  txHash?: Address | null
): Promise<MeetingDecrypted> => {
  const newMeetingId = uuidv4()
  const participantData = await handleParticipants(participants, currentAccount) // check participants before proceeding

  const meeting_url =
    meetingUrl ||
    (
      await generateMeetingUrl({
        accounts: participantData.allAccounts,
        content: meetingContent,
        end: endTime,
        meeting_id: newMeetingId,
        meetingProvider,
        meetingReminders,
        meetingRepeat: MeetingRepeat.NO_REPEAT,
        participants_mapping: participantData.sanitizedParticipants,
        start: startTime,
        title: meetingTitle || 'No Title',
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
    meetingContent,
    meeting_url,
    newMeetingId,
    meetingTitle,
    meetingReminders,
    MeetingRepeat.NO_REPEAT,
    selectedPermissions,
    txHash
  )
  if (!ignoreAvailabilities) {
    const promises: Promise<boolean>[] = participants
      .filter(p => p.account_address !== currentAccount?.address)
      .map(
        async participant =>
          !participant.account_address ||
          (
            await isSlotFreeApiCall(
              participant.account_address,
              startTime,
              endTime,
              meetingTypeId,
              txHash
            )
          ).isFree
      )

    try {
      const results = await Promise.all(promises)
      if (results.some(r => !r)) {
        throw new TimeNotAvailableError()
      }
    } catch (error) {
      throw error
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
      content: meeting.content,
      created_at: meeting.start,
      end: meeting.end,
      meeting_id: newMeetingId,
      meeting_info_encrypted: slot.meeting_info_encrypted,
      meeting_url: meeting.meeting_url,
      participants: meeting.participants_mapping,
      related_slot_ids: [],
      start: meeting.start,
      title: meeting.title,
      version: 0,
    }
  } catch (error: unknown) {
    throw error
  }
}
const scheduleRecurringMeeting = async (
  startTime: Date,
  endTime: Date,
  participants: ParticipantInfo[],
  meetingRepeat: MeetingRepeat,
  meetingProvider: MeetingProvider,
  currentAccount?: Account | null,
  meetingContent?: string,
  meetingUrl?: string,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  selectedPermissions?: MeetingPermissions[]
): Promise<MeetingDecrypted> => {
  const newMeetingId = uuidv4()
  const participantData = await handleParticipants(participants, currentAccount) // check participants before proceeding

  const meeting_url =
    meetingUrl ||
    (
      await generateMeetingUrl({
        accounts: participantData.allAccounts,
        content: meetingContent,
        end: endTime,
        meeting_id: newMeetingId,
        meetingProvider,
        meetingReminders,
        meetingRepeat,
        participants_mapping: participantData.sanitizedParticipants,
        start: startTime,
        title: meetingTitle || 'No Title',
      })
    ).url

  const meeting = await buildMeetingData(
    SchedulingType.REGULAR,
    NO_MEETING_TYPE,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    {},
    meetingProvider,
    meetingContent,
    meeting_url,
    newMeetingId,
    meetingTitle,
    meetingReminders,
    meetingRepeat,
    selectedPermissions
  )

  try {
    const slot: DBSlot = await apiScheduleMeetingSeries(meeting)

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
      content: meeting.content,
      created_at: meeting.start,
      end: meeting.end,
      meeting_id: newMeetingId,
      meeting_info_encrypted: slot.meeting_info_encrypted,
      meeting_url: meeting.meeting_url,
      participants: meeting.participants_mapping,
      related_slot_ids: [],
      start: meeting.start,
      title: meeting.title,
      version: 0,
    }
  } catch (error: unknown) {
    throw error
  }
}
export const createAlarm = (indicator: MeetingReminders): Alarm => {
  switch (indicator) {
    case MeetingReminders['15_MINUTES_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { before: true, minutes: 15 },
      }

    case MeetingReminders['30_MINUTES_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { before: true, minutes: 30 },
      }

    case MeetingReminders['1_HOUR_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { before: true, hours: 1 },
      }
    case MeetingReminders['1_DAY_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { before: true, days: 1 },
      }
    case MeetingReminders['1_WEEK_BEFORE']:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { before: true, weeks: 1 },
      }
    case MeetingReminders['10_MINUTES_BEFORE']:
    default:
      return {
        action: 'display',
        description: 'Reminder',
        trigger: { before: true, minutes: 10 },
      }
  }
}
const generateIcs = async (
  meeting: MeetingDecrypted,
  ownerAddress: string,
  meetingStatus: MeetingChangeType,
  changeUrl?: string,
  removeAttendess?: boolean,
  destination?: { accountAddress: string; email: string },
  isPrivate?: boolean
): Promise<ReturnObject> => {
  let url = meeting.meeting_url.trim()
  if (!isValidUrl(url)) {
    url = 'https://meetwith.xyz'
  }
  const start = DateTime.fromJSDate(new Date(meeting.start))
  const end = DateTime.fromJSDate(new Date(meeting.end))
  const created_at = DateTime.fromJSDate(new Date(meeting.created_at!))
  const event: EventAttributes = {
    created: [
      created_at.year,
      created_at.month,
      created_at.day,
      created_at.hour,
      created_at.minute,
    ],
    description: CalendarServiceHelper.getMeetingSummary(
      meeting.content,
      meeting.meeting_url,
      changeUrl
    ),
    end: [end.year, end.month, end.day, end.hour, end.minute],
    location: meeting.meeting_url,
    organizer: {
      email: NO_REPLY_EMAIL,
      name: 'Meetwith',
    },
    productId: '-//Meetwith//EN',
    start: [start.year, start.month, start.day, start.hour, start.minute],
    status:
      meetingStatus === MeetingChangeType.DELETE ? 'CANCELLED' : 'CONFIRMED',
    title: CalendarServiceHelper.getMeetingTitle(
      ownerAddress,
      meeting.participants,
      meeting.title
    ),
    uid: meeting.meeting_id.replaceAll('-', ''),
    url,
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
    const attendees = await Promise.all(
      meeting.participants.map(async participant => {
        const email =
          participant.account_address &&
          destination &&
          destination.accountAddress === participant.account_address
            ? destination.email
            : CalendarServiceHelper.sanitizeEmail(
                participant.guest_email ||
                  (await getAccountPrimaryCalendarEmail(
                    participant.account_address!
                  )) ||
                  ''
              )
        if (!email && !isValidEmail(email)) return null

        const attendee: Attendee = {
          email,
          name: participant.name || participant.account_address,
          partstat: participantStatusToICSStatus(participant.status),
          role: 'REQ-PARTICIPANT',
          rsvp: participant.status === ParticipationStatus.Accepted,
        }

        if (participant.account_address) {
          attendee.dir = getCalendarRegularUrl(participant.account_address!)
        }
        return attendee
      })
    )
    event.attendees.push(
      ...attendees.filter((attendee): attendee is Attendee => attendee !== null)
    )
  }

  const icsEvent = createEvent(event)
  return icsEvent
}
export const participantStatusToICSStatus = (status: ParticipationStatus) => {
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
  meeting: ExtendedDBSlot | ExtendedSlotInstance,
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
    'conferenceData' in meeting &&
    meeting?.conferenceData &&
    meeting?.conferenceData.version !== MeetingVersion.V1
  ) {
    if (
      meeting.conferenceData.slots.length !== meetingInfo.participants.length
    ) {
      void syncMeeting(meetingInfo, meeting.id!)
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
    content: meetingInfo.content,
    created_at: meeting.created_at!,
    end: new Date(meeting.end),
    meeting_id: meetingInfo.meeting_id,
    meeting_url: meetingInfo.meeting_url,
    participants: meetingInfo.participants,
    permissions: meetingInfo?.permissions,
    provider: meetingInfo?.provider,
    recurrence: meetingInfo?.recurrence,
    related_slot_ids: meetingInfo.related_slot_ids,
    reminders: meetingInfo.reminders,
    series_id: 'series_id' in meeting ? meeting?.series_id : null,
    start: new Date(meeting.start),
    title: meetingInfo.title,
    version: meeting.version,
    rrule: meetingInfo.rrule,
  }
}
// This functions runtime is for the server side only
const decryptMeetingGuest = async (
  meeting: DBSlot
): Promise<MeetingDecrypted | null> => {
  const content = await getContentFromEncryptedPublic(
    meeting?.meeting_info_encrypted
  )
  if (!content) return null

  const meetingInfo = JSON.parse(content) as MeetingInfo

  return {
    id: meeting.id!,
    ...meeting,
    content: meetingInfo.content,
    created_at: meeting.created_at!,
    end: new Date(meeting.end),
    meeting_id: meetingInfo.meeting_id,
    meeting_url: meetingInfo.meeting_url,
    participants: meetingInfo.participants,
    permissions: meetingInfo?.permissions,
    provider: meetingInfo?.provider,
    recurrence: meetingInfo?.recurrence,
    related_slot_ids: meetingInfo.related_slot_ids,
    reminders: meetingInfo.reminders,
    start: new Date(meeting.start),
    title: meetingInfo.title,
    version: meeting.version,
    rrule: meetingInfo.rrule,
  }
}
// This functions runtime is for the server side only
const decryptConferenceMeeting = async (
  meeting: ConferenceMeeting
): Promise<MeetingDecrypted | null> => {
  if (!meeting?.encrypted_metadata) return null
  const content = await getContentFromEncryptedPublic(
    meeting?.encrypted_metadata
  )
  if (!content) return null

  const meetingInfo = JSON.parse(content) as MeetingInfo

  return {
    content: meetingInfo.content,
    created_at: meeting.created_at!,
    end: new Date(meeting.end),
    id: meeting.id!,
    meeting_id: meetingInfo.meeting_id,
    meeting_info_encrypted: meeting.encrypted_metadata,
    meeting_url: meetingInfo.meeting_url,
    participants: meetingInfo.participants,
    permissions: meetingInfo?.permissions,
    provider: meetingInfo?.provider,
    recurrence: meetingInfo?.recurrence,
    related_slot_ids: meetingInfo.related_slot_ids,
    reminders: meetingInfo.reminders,
    start: new Date(meeting.start),
    title: meetingInfo.title,
    rrule: meetingInfo.rrule,
    version: -1, // Conference meetings do not have versioning
  }
}

const generateDefaultAvailabilities = (): DayAvailability[] => {
  const availabilities: DayAvailability[] = []
  for (let i = 0; i <= 6; i++) {
    availabilities.push({
      ranges: i !== 0 && i !== 6 ? [defaultTimeRange()] : [],
      weekday: i,
    })
  }
  return availabilities
}

const generateEmptyAvailabilities = (): DayAvailability[] => {
  const availabilities: DayAvailability[] = []
  for (let i = 0; i <= 6; i++) {
    availabilities.push({
      ranges: [defaultTimeRange()],
      weekday: i,
    })
  }
  return availabilities
}

const defaultTimeRange = () => {
  return { end: '18:00', start: '09:00' }
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
    result += ` (${timezone})`
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

const getAccountDomainUrl = (
  account?: Account | null,
  ellipsize?: boolean
): string => {
  if (!account?.subscriptions) {
    return `address/${
      ellipsize ? ellipsizeAddress(account?.address) : account?.address
    }`
  }

  const activeSubscription = account.subscriptions.find(
    sub => new Date(sub.expiry_time) > new Date() && sub.domain
  )

  if (activeSubscription?.domain) {
    return activeSubscription.domain
  }

  return `address/${
    ellipsize ? ellipsizeAddress(account?.address) : account?.address
  }`
}

const getAccountCalendarUrl = (
  account?: Account,
  ellipsize?: boolean
): string => {
  return `${appUrl}/${getAccountDomainUrl(account, ellipsize)}`
}

export const getCalendarRegularUrl = (account_address: string) => {
  return `${appUrl}/address/${account_address}`
}

export const getOwnerPublicUrl = async (
  ownerAccountAddress: string
): Promise<string> => {
  try {
    const ownerAccount = await getAccount(ownerAccountAddress)
    return getAccountCalendarUrl(ownerAccount)
  } catch (_error) {
    // Fallback if account not found
    return `${appUrl}/address/${ownerAccountAddress}`
  }
}

const generateDefaultMeetingType = (account_owner_address: string) => {
  const title = '30 minutes meeting'
  const meetingType = {
    account_owner_address,
    duration_minutes: 30,
    min_notice_minutes: 60,
    slug: getSlugFromText(title),
    title,
    type: SessionType.FREE,
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
  return `no_reply_${content}@meetwith.xyz`
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
const generateGoogleCalendarUrl = async (
  meeting_id: string,
  account_owner_address: string,
  start?: Date | number,
  end?: Date | number,
  title?: string,
  content?: string,
  meeting_url?: string,
  timezone?: string,
  participants?: MeetingDecrypted['participants'],
  recurrence = MeetingRepeat.NO_REPEAT
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
    const changeUrl = `${appUrl}/dashboard/schedule?conferenceId=${meeting_id}&intent=${Intents.UPDATE_MEETING}`
    baseUrl += `&details=${CalendarServiceHelper.getMeetingSummary(
      content,
      meeting_url,
      changeUrl
    )}`
  }
  if (timezone) {
    baseUrl += `&ctz=${timezone}`
  }
  if (participants) {
    const attendees = await Promise.all(
      participants.map(async participant => {
        if (participant.account_address === account_owner_address) return null
        const email =
          participant.guest_email ||
          (await getAccountPrimaryCalendarEmail(participant.account_address!))
        return email
      })
    )
    baseUrl += `&to=${attendees.filter(val => !!val).join(',')}`
  }
  if (recurrence != MeetingRepeat.NO_REPEAT) {
    let rrule = `RRULE:FREQ=${recurrence.toUpperCase()};INTERVAL=1`
    const dayOfWeek = format(new Date(start!), 'eeeeee').toUpperCase()
    const weekOfMonth = getWeekOfMonth(new Date(start!))

    switch (recurrence) {
      case MeetingRepeat.WEEKLY:
        rrule += `;BYDAY=${dayOfWeek}`
        break
      case MeetingRepeat.MONTHLY:
        rrule += `;BYSETPOS=${weekOfMonth};BYDAY=${dayOfWeek}`
        break
    }
    baseUrl += `&recur=${rrule}`
  }
  return baseUrl
}
const generateOffice365CalendarUrl = async (
  meeting_id: string,
  account_owner_address: string,
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
    const changeUrl = `${appUrl}/dashboard/schedule?conferenceId=${meeting_id}&intent=${Intents.UPDATE_MEETING}`
    baseUrl += `&body=${CalendarServiceHelper.getMeetingSummary(
      content,
      meeting_url,
      changeUrl
    )}`
  }
  if (participants) {
    const attendees = await Promise.all(
      participants.map(async participant => {
        if (participant.account_address === account_owner_address) return null
        const email =
          participant.guest_email ||
          (await getAccountPrimaryCalendarEmail(participant.account_address!))
        return email
      })
    )
    baseUrl += `&to=${attendees.filter(val => !!val).join(',')}`
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

const handleRRULEForMeeting = (recurrence: MeetingRepeat, start: Date) => {
  if (recurrence === MeetingRepeat.NO_REPEAT) return []

  const freqMap: Record<
    MeetingRepeat.DAILY | MeetingRepeat.WEEKLY | MeetingRepeat.MONTHLY,
    Frequency
  > = {
    [MeetingRepeat.DAILY]: RRule.DAILY,
    [MeetingRepeat.WEEKLY]: RRule.WEEKLY,
    [MeetingRepeat.MONTHLY]: RRule.MONTHLY,
  }

  const options: Partial<Options> = {
    freq: freqMap[recurrence],
    interval: 1,
    dtstart: start,
  }

  // rrule library auto-handles BYDAY for weekly (uses dtstart's weekday)
  // and BYSETPOS for monthly (uses dtstart's week-of-month position)
  if (recurrence === MeetingRepeat.MONTHLY) {
    const startDateTime = DateTime.fromJSDate(start)
    const weekOfMonth = Math.floor((startDateTime.day - 1) / 7) + 1

    let weekday
    switch (startDateTime.weekday) {
      case 1:
        weekday = RRule.MO
        break
      case 2:
        weekday = RRule.TU
        break
      case 3:
        weekday = RRule.WE
        break
      case 4:
        weekday = RRule.TH
        break
      case 5:
        weekday = RRule.FR
        break
      case 6:
        weekday = RRule.SA
        break
      case 7:
        weekday = RRule.SU
        break
      default:
        weekday = RRule.MO
        break
    }

    options.byweekday = weekday
    options.bysetpos = [weekOfMonth]
  }

  const rule = new RRule(options)
  return rule
    .toString()
    .split('\n')
    .filter(line => !line.startsWith('DTSTART:'))
}
const isDiffRRULE = (oldRRULE: string[], newRRULE: string[]) => {
  return (
    oldRRULE.length !== newRRULE.length ||
    oldRRULE.some((rule, index) => rule.trim() !== newRRULE[index].trim())
  )
}

const getMeetingRepeatFromRule = (rule: RRule): MeetingRepeat => {
  if (!rule || !rule.options) return MeetingRepeat.NO_REPEAT

  switch (rule.options.freq) {
    case RRule.DAILY:
      return MeetingRepeat.DAILY
    case RRule.WEEKLY:
      return MeetingRepeat.WEEKLY
    case RRule.MONTHLY:
      return MeetingRepeat.MONTHLY
    default:
      return MeetingRepeat.NO_REPEAT
  }
}
const meetWithSeriesPreprocessors = (
  meetings: Array<ExtendedDBSlot | ExtendedSlotInstance | ExtendedSlotSeries>,
  startDate: DateTime,
  endDate: DateTime
): Array<ExtendedDBSlot | ExtendedSlotInstance> => {
  const dbSlots = meetings.filter((slot): slot is DBSlot => isDBSlot(slot))
  const slotSeries = meetings.filter((slot): slot is SlotSeries =>
    isSlotSeries(slot)
  )
  const slotSereisMap = new Map<string, SlotSeries>()
  slotSeries.forEach(slotSerie => {
    slotSereisMap.set(slotSerie.id!, slotSerie)
  })
  const slotInstances = meetings
    .filter((slot): slot is SlotInstance => isSlotInstance(slot))
    .map(slot => {
      if (slot.meeting_info_encrypted) {
        return slot
      } else {
        return {
          ...slot,
          meeting_info_encrypted: slotSereisMap.get(slot.series_id!)
            ?.meeting_info_encrypted,
        }
      }
    })

  const slots = [...dbSlots, ...slotInstances]

  for (const slotSerie of slotSeries) {
    if (!slotSerie.rrule?.[0]) continue
    const rule = rrulestr(slotSerie.rrule[0], {
      dtstart: new Date(slotSerie.template_start), // The original start time of the series
    })
    const lookupEnd = slotSerie.effective_end
      ? DateTime.fromJSDate(new Date(slotSerie.effective_end))
      : endDate

    const ghostStartTimes = rule
      .between(
        startDate.toJSDate(),
        endDate > lookupEnd ? lookupEnd.toJSDate() : endDate.toJSDate(),
        true
      )
      .map(date => DateTime.fromJSDate(date))
    for (const ghostStartTime of ghostStartTimes) {
      const difference =
        DateTime.fromJSDate(new Date(slotSerie.template_start))
          .diff(
            DateTime.fromJSDate(new Date(slotSerie.template_end)),
            'minutes'
          )
          .toObject().minutes || 0
      const ghostEndTime = ghostStartTime.plus({ minutes: difference })

      // Check if an instance already exists for this occurrence
      const instanceExists = slotInstances.some(
        instance =>
          instance.series_id === slotSerie.id &&
          instance.id ===
            `${slotSerie.id}_${ghostStartTime.toJSDate().getTime()}`
      )
      if (!instanceExists) {
        const slotInstance: SlotInstance = {
          end: ghostEndTime.toJSDate(),
          id: `${slotSerie.id}_${ghostStartTime.toJSDate().getTime()}`, // Unique ID for the ghost instance
          series_id: slotSerie.id!,
          start: ghostStartTime.toJSDate(),
          status: RecurringStatus.CONFIRMED,
          meeting_info_encrypted: slotSerie.meeting_info_encrypted,
          slot_id: slotSerie.id || '',
          version: 0,
          account_address: slotSerie.account_address,
          role: slotSerie.role,
          recurrence: getMeetingRepeatFromRule(rule),
        }
        slots.push(slotInstance)
      }
    }
  }

  return slots
    .filter(
      (slot): slot is ExtendedDBSlot | ExtendedSlotInstance =>
        !!slot.meeting_info_encrypted
    )
    .filter(
      slot =>
        (isSlotInstance(slot) && slot.status !== RecurringStatus.CANCELLED) ||
        isDBSlot(slot)
    )
}
const rsvpMeeting = async (
  eventId: string,
  accountAddress: string,
  status: ParticipationStatus,
  signal: AbortSignal
) => {
  const isRecurringMeeting = eventId.includes('_')
  const currentAccount = await getAccount(accountAddress)
  let decryptedMeeting: MeetingDecrypted | null = null
  let _series_id: string | null = null
  if (isRecurringMeeting) {
    const slot = await getSlotInstanceById(eventId, signal)
    if (!slot || !slot.account_address) {
      throw new MeetingNotFoundError(eventId)
    }
    _series_id = slot.series_id
    decryptedMeeting = await decodeMeeting(slot, currentAccount)
  } else {
    const existingDBSlot = await getMeeting(eventId, signal)
    if (!existingDBSlot || !existingDBSlot.account_address) {
      throw new MeetingNotFoundError(eventId)
    }
    decryptedMeeting = await decryptMeeting(existingDBSlot, currentAccount)
  }
  const participants = (decryptedMeeting?.participants || []).map(
    participant => {
      if (participant.account_address === accountAddress) {
        return {
          ...participant,
          status,
        }
      }
      return participant
    }
  )

  if (!decryptedMeeting) {
    throw new DecryptionFailedError()
  }
  const participantData = await handleParticipants(participants, currentAccount) // check participants before proceeding
  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    decryptedMeeting!,
    currentAccount.address
  )
  const toKeep = intersec(existingMeetingAccounts, [
    currentAccount.address.toLowerCase(),
    ...participants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase()),
  ])
  const guestsToKeep = participants
    .filter(p => p.guest_email)
    .map(p => p.guest_email!)

  // those are the guests that must receive an update email

  const accountSlotMap = participants.reduce(
    (acc, participant) => {
      if (participant.account_address) {
        const lowerCasedAddress = participant.account_address.toLowerCase()
        acc[lowerCasedAddress] = participant.slot_id!
      } else if (participant.guest_email) {
        acc[participant.guest_email] = participant.slot_id!
      }
      return acc
    },
    {} as Record<string, string>
  )
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    '',
    decryptedMeeting.start,
    decryptedMeeting.end,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    decryptedMeeting.provider || MeetingProvider.GOOGLE_MEET,
    decryptedMeeting.content,
    decryptedMeeting.meeting_url,
    decryptedMeeting.meeting_id,
    decryptedMeeting.title,
    decryptedMeeting.reminders,
    decryptedMeeting.recurrence,
    decryptedMeeting.permissions,
    null
  )
  const payload: MeetingInstanceUpdateRequest = {
    ...meetingData,
    guestsToRemove: [],
    ignoreOwnerAvailability: true,
    slotsToRemove: [],
    version: decryptedMeeting.version + 1,
  }
  if (isRecurringMeeting) {
    const slot: DBSlot = await apiUpdateMeetingInstance(
      decryptedMeeting.id,
      payload,
      signal
    )
    return await decryptMeeting(slot, currentAccount)!
  } else {
    const slot: DBSlot = await apiUpdateMeeting(
      decryptedMeeting.id,
      payload,
      signal
    )
    return await decryptMeeting(slot, currentAccount)!
  }
}

export {
  allSlots,
  buildMeetingData,
  cancelMeeting,
  cancelMeetingGuest,
  dateToHumanReadable,
  dateToLocalizedRange,
  decodeMeeting,
  decryptConferenceMeeting,
  decryptMeeting,
  decryptMeetingGuest,
  defaultTimeRange,
  deleteMeeting,
  durationToHumanReadable,
  generateDefaultAvailabilities,
  generateDefaultMeetingType,
  generateEmptyAvailabilities,
  generateGoogleCalendarUrl,
  generateIcs,
  generateOffice365CalendarUrl,
  getAccountCalendarUrl,
  getAccountDomainUrl,
  getMeetingRepeatFromRule,
  googleUrlParsedDate,
  handleParticipants,
  handleRRULEForMeeting,
  isDiffRRULE,
  loadMeetingAccountAddresses,
  mapRelatedSlots,
  meetWithSeriesPreprocessors,
  noNoReplyEmailForAccount,
  outLookUrlParsedDate,
  rsvpMeeting,
  scheduleMeeting,
  selectDefaultProvider,
  updateMeeting,
  updateMeetingAsGuest,
  updateMeetingConferenceGuest,
  updateMeetingInstance,
  updateMeetingSeries,
  deleteMeetingInstance,
  cancelMeetingInstance,
  deleteMeetingSeries,
  cancelMeetingSeries,
  scheduleRecurringMeeting,
}
