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
import { RRule, rrulestr } from 'rrule'
import { v4 as uuidv4 } from 'uuid'

import { Account, DayAvailability } from '@/types/Account'
import { UnifiedEvent } from '@/types/Calendar'
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
  RequestParticipantMapping,
} from '@/types/Requests'
import { Address } from '@/types/Transactions'
import {
  cancelMeeting as apiCancelMeeting,
  scheduleMeeting as apiScheduleMeeting,
  apiUpdateMeeting,
  updateMeetingAsGuest as apiUpdateMeetingAsGuest,
  apiUpdateMeetingInstance,
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
  getSlotsByIds,
  isSlotFreeApiCall,
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
import { canAccountAccessPermission, getSlugFromText } from './generic_utils'
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
  currentAccountAddress?: string
) => {
  const accountSlot: { [account: string]: string } = {}
  if (meeting.user_type !== 'guest') {
    if (currentAccountAddress) {
      accountSlot[currentAccountAddress] = meeting.id
    }
  }
  for (const slotId of meeting.related_slot_ids) {
    if (slotId !== meeting.id) {
      try {
        const slot = await getMeeting(slotId)
        accountSlot[(slot?.account_address || slot?.guest_email)!] = slotId
      } catch (e) {
        // some slots might not be found if they belong to guests and were wrongly stored
        try {
          const guestSlot = await getGuestSlotById(slotId)
          if (guestSlot?.guest_email) {
            accountSlot[guestSlot.guest_email] = slotId
          }
        } catch (e) {}
      }
    }
  }
  return accountSlot
}

const loadMeetingAccountAddresses = async (
  meeting: MeetingDecrypted,
  currentAccountAddress?: string
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
  const slotsAccounts = [
    ...otherSlots
      .filter(it => it.account_address)
      .map(it => it.account_address!.toLowerCase()),
  ]
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
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[],
  txHash?: Address | null
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
    permissions: selectedPermissions,
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
        participant.status ||
        (participant.type === ParticipantType.Scheduler
          ? ParticipationStatus.Accepted
          : ParticipationStatus.Pending),
      mappingType: !!participantsToKeep[
        participant.account_address || participant.guest_email || ''
      ]
        ? ParticipantMappingType.KEEP
        : ParticipantMappingType.ADD,
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
    meetingPermissions: selectedPermissions,
    encrypted_metadata: encrypted,
    ignoreOwnerAvailability:
      participantsMappings.filter(
        mapping => mapping.type === ParticipantType.Owner
      ).length > 1,
    txHash,
    rrule: handleRRULEForMeeting(meetingRepeat, startTime),
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
        type: slot.role || ParticipantType.Owner,
        slot_id: slot.id!,
        meeting_id: fullMeetingData.id || '',
        status: ParticipationStatus.Accepted,
        name: '', // Will be filled by handleParticipants
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
      meeting_id: fullMeetingData.id || '',
      title: meetingTitle || fullMeetingData.title || 'No Title',
      end: endTime,
      start: startTime,
      meetingProvider,
      participants_mapping: participantData.sanitizedParticipants,
      accounts: participantData.allAccounts,
      content: meetingContent,
      meetingReminders,
      meetingRepeat,
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
    undefined,
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
    slotsToRemove: [],
    guestsToRemove: [],
    version: currentVersion + 1,
  }

  const slot: DBSlot = await apiUpdateMeetingAsGuest(validSlotId, payload)

  return {
    id: slot.id!,
    meeting_id: slot.id!,
    created_at: new Date(),
    participants: meetingData.participants_mapping,
    content: meetingData.content,
    title: meetingData.title,
    meeting_url: meetingData.meeting_url,
    start: meetingData.start,
    end: meetingData.end,
    related_slot_ids: meetingData.allSlotIds || [],
    version: slot.version,
    meeting_info_encrypted: slot.meeting_info_encrypted,
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
  console.trace(decryptedMeeting)
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }
  const canUpdateOtherGuests = canAccountAccessPermission(
    decryptedMeeting?.permissions,
    decryptedMeeting?.participants,
    currentAccountAddress,
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
    currentAccountAddress,
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

  // Prevent non-schedulers from changing the number of participants:
  // If the acting user is NOT the scheduler and the number of participants has changed,
  // throw an error to block unauthorized modifications to the meeting's participant list.
  if (
    !canUpdateOtherGuests &&
    participants.length !== decryptedMeeting.participants.length
  ) {
    throw new MeetingChangeConflictError()
  }

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
    currentAccount,
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
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    guestsToRemove,
    version: decryptedMeeting.version + 1,
    ignoreOwnerAvailability: true,
  }

  const slotId = decryptedMeeting.id.split('_')[0]
  if (decryptedMeeting.user_type === 'guest') {
    const slot: DBSlot = await apiUpdateMeetingAsGuest(slotId, payload)
    return {
      id: slot.id!,
      meeting_id: slot.id!,
      created_at: new Date(),
      participants: meetingData.participants_mapping,
      content: meetingData.content,
      title: meetingData.title,
      meeting_url: meetingData.meeting_url,
      start: meetingData.start,
      end: meetingData.end,
      related_slot_ids: meetingData.allSlotIds || [],
      version: slot.version,
      meeting_info_encrypted: slot.meeting_info_encrypted,
    }
  } else {
    const slot: DBSlot = await apiUpdateMeeting(slotId, payload)
    return (await decryptMeeting(slot, currentAccount))!
  }
}

// TODO: MAKE SURE TO HANDLE ALL EDGE CASES
const updateMeetingInstance = async (
  ignoreAvailabilities: boolean,
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
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }
  const canUpdateOtherGuests = canAccountAccessPermission(
    decryptedMeeting?.permissions,
    decryptedMeeting?.participants,
    currentAccountAddress,
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
    currentAccountAddress,
    MeetingPermissions.EDIT_MEETING
  )

  if (
    !canEditMeetingDetails &&
    (decryptedMeeting?.title !== meetingTitle ||
      decryptedMeeting?.content !== content ||
      decryptedMeeting?.meeting_url !== meetingUrl ||
      decryptedMeeting?.provider !== meetingProvider ||
      decryptedMeeting?.reminders?.length !== meetingReminders?.length ||
      decryptedMeeting?.permissions?.length !== selectedPermissions?.length ||
      new Date(decryptedMeeting?.start).getTime() !==
        new Date(startTime).getTime() ||
      new Date(decryptedMeeting?.end).getTime() !== new Date(endTime).getTime())
  ) {
    throw new MeetingDetailsModificationDenied()
  }

  const [currentAccount, existingDBSlot] = await Promise.all([
    getAccount(currentAccountAddress),
    getSlotInstanceById(decryptedMeeting.id),
  ])
  if (!existingDBSlot) {
    throw new MeetingChangeConflictError()
  }
  const existingMeeting = await decryptMeeting(
    existingDBSlot,
    currentAccount,
    signature
  )

  // We need to offset every participants slots to that of this instance of the inserted

  //TODO: anyone can update a meeting, but we might need to change the participants statuses

  // make sure that we are trying to update the latest version of the meeting,
  // otherwise it means that somebody changes before this one
  if (decryptedMeeting.version !== existingMeeting?.version) {
    throw new MeetingChangeConflictError()
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

  const toAdd = diff(
    participants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase()),
    existingMeetingAccounts
  )

  // Prevent non-schedulers from changing the number of participants:
  // If the acting user is NOT the scheduler and the number of participants has changed,
  // throw an error to block unauthorized modifications to the meeting's participant list.
  if (
    !canUpdateOtherGuests &&
    participants.length !== decryptedMeeting.participants.length
  ) {
    throw new MeetingChangeConflictError()
  }

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
  const guestsToAddEmails = diff(
    guests,
    oldGuests.map(p => p.guest_email!)
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
                  NO_MEETING_TYPE
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
    currentAccount,
    content,
    meetingUrl,
    rootMeetingId,
    meetingTitle,
    meetingReminders,
    MeetingRepeat.NO_REPEAT,
    selectedPermissions
  )
  const payload = {
    ...meetingData,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    guestsToRemove,
    version: decryptedMeeting.version + 1,
    ignoreOwnerAvailability: true,
    toAdd,
    guestsToAdd: guestsToAddEmails,
  }

  const slot: DBSlot = await apiUpdateMeetingInstance(
    decryptedMeeting.id,
    payload
  )
  return (await decryptMeeting(slot, currentAccount))!
}
const updateMeetingSeries = async () => {}
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
    undefined,
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
    slotsToRemove: toRemove.map(it => accountSlotMap[it]),
    guestsToRemove,
    version: decryptedMeeting.version + 1,
  }

  const slot: DBSlot = await apiUpdateMeetingAsGuest(slotId, payload)

  return {
    id: slot.id!,
    meeting_id: slot.id!,
    created_at: new Date(),
    participants: meetingData.participants_mapping,
    content: meetingData.content,
    title: meetingData.title,
    meeting_url: meetingData.meeting_url,
    start: meetingData.start,
    end: meetingData.end,
    related_slot_ids: meetingData.allSlotIds || [],
    version: slot.version,
    meeting_info_encrypted: slot.meeting_info_encrypted,
  }
}

const deleteMeeting = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId: string,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  signature: string,
  scheduler?: ParticipantInfo
): Promise<DBSlot> => {
  // Sanity check
  if (!decryptedMeeting.id) {
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
          type: ParticipantType.Scheduler,
          status: ParticipationStatus.Accepted,
        }
      }
      return participant
    })
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
    decryptedMeeting?.provider || MeetingProvider.GOOGLE_MEET,
    currentAccount,
    decryptedMeeting?.content,
    decryptedMeeting?.meeting_url || '',
    rootMeetingId,
    decryptedMeeting?.title || '',
    decryptedMeeting?.reminders || [],
    decryptedMeeting?.recurrence || MeetingRepeat.NO_REPEAT
  )
  const payload = {
    ...meetingData,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    guestsToRemove,
    version: decryptedMeeting.version + 1,
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
  // Only the owner or scheduler of the meeting can cancel it
  const isMeetingOwners = existingMeeting?.participants.find(
    user =>
      user.type === ParticipantType.Owner &&
      user.slot_id?.split('_')[0] === slotId
  )
  const isMeetingScheduler = existingMeeting?.participants.find(
    user =>
      user.type === ParticipantType.Scheduler &&
      user.slot_id?.split('_')[0] === slotId
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
  const response = await apiCancelMeeting(
    {
      ...decryptedMeeting,
      id: slotId,
      participants: existingMeeting!.participants.map(p => ({
        ...p,
        slot_id: p.slot_id?.split('_')[0],
      })),
      related_slot_ids: decryptedMeeting.related_slot_ids.map(
        id => id.split('_')[0]
      ),
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
      meeting: {
        ...decryptedMeeting,
        related_slot_ids: decryptedMeeting.related_slot_ids.concat([
          decryptedMeeting.id,
        ]),
      },
      currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      guest_email: actorParticipant?.guest_email || '',
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
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[],
  txHash?: Address | null
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
    meetingRepeat,
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
    uid: meeting.meeting_id.replaceAll('-', ''),
    start: [start.year, start.month, start.day, start.hour, start.minute],
    productId: '-//Meetwith//EN',
    end: [end.year, end.month, end.day, end.hour, end.minute],
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
      created_at.year,
      created_at.month,
      created_at.day,
      created_at.hour,
      created_at.minute,
    ],
    organizer: {
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
          name: participant.name || participant.account_address,
          email,
          rsvp: participant.status === ParticipationStatus.Accepted,
          partstat: participantStatusToICSStatus(participant.status),
          role: 'REQ-PARTICIPANT',
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
    permissions: meetingInfo?.permissions,
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
    permissions: meetingInfo?.permissions,
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
    id: meeting.id!,
    meeting_info_encrypted: meeting.encrypted_metadata,
    meeting_id: meetingInfo.meeting_id,
    created_at: meeting.created_at!,
    participants: meetingInfo.participants,
    content: meetingInfo.content,
    title: meetingInfo.title,
    meeting_url: meetingInfo.meeting_url,
    related_slot_ids: meetingInfo.related_slot_ids,
    start: new Date(meeting.start),
    end: new Date(meeting.end),
    reminders: meetingInfo.reminders,
    provider: meetingInfo?.provider,
    recurrence: meetingInfo?.recurrence,
    permissions: meetingInfo?.permissions,
    version: -1, // Conference meetings do not have versioning
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
  if (isProAccount(account!)) {
    const domain = account?.subscriptions?.find(
      sub => new Date(sub.expiry_time) > new Date()
    )?.domain
    if (domain) {
      return domain
    }
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
  } catch (error) {
    // Fallback if account not found
    return `${appUrl}/address/${ownerAccountAddress}`
  }
}

const generateDefaultMeetingType = (account_owner_address: string) => {
  const title = '30 minutes meeting'
  const meetingType = {
    title,
    slug: getSlugFromText(title),
    duration_minutes: 30,
    min_notice_minutes: 60,
    type: SessionType.FREE,
    account_owner_address,
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
  if (recurrence !== MeetingRepeat.NO_REPEAT) {
    let RRULE = `RRULE:FREQ=${recurrence.toUpperCase()};INTERVAL=1`
    const startDateTime = DateTime.fromJSDate(start)
    const dayOfWeek = startDateTime
      .toFormat('EEE')
      .toUpperCase()
      .substring(0, 2)
    const weekOfMonth = Math.ceil(startDateTime.day / 7)

    switch (recurrence) {
      case MeetingRepeat.WEEKLY:
        RRULE += `;BYDAY=${dayOfWeek}`
        break
      case MeetingRepeat.MONTHLY:
        RRULE += `;BYSETPOS=${weekOfMonth};BYDAY=${dayOfWeek}`
        break
    }
    return [RRULE]
  }
  return []
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
      dtstart: new Date(slotSerie.start), // The original start time of the series
    })
    const ghostStartTimes = rule
      .between(startDate.toJSDate(), endDate.toJSDate(), true)
      .map(date => DateTime.fromJSDate(date))
    for (const ghostStartTime of ghostStartTimes) {
      const difference =
        DateTime.fromJSDate(new Date(slotSerie.end))
          .diff(DateTime.fromJSDate(new Date(slotSerie.start)), 'minutes')
          .toObject().minutes || 0
      const ghostEndTime = ghostStartTime.plus({ minutes: difference })

      // Check if an instance already exists for this occurrence
      const instanceExists = slotInstances.some(
        instance =>
          instance.series_id === slotSerie.id &&
          new Date(instance.start).getTime() ===
            ghostStartTime.toJSDate().getTime()
      )
      if (!instanceExists) {
        const slotInstance: SlotInstance = {
          ...slotSerie,
          status: RecurringStatus.CONFIRMED,
          id: `${slotSerie.id}_instance_${ghostStartTime.toJSDate().getTime()}`, // Unique ID for the ghost instance
          series_id: slotSerie.id!,
          start: ghostStartTime.toJSDate(),
          end: ghostEndTime.toJSDate(),
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
  let series_id: string | null = null
  if (isRecurringMeeting) {
    const slot = await getSlotInstanceById(eventId, signal)
    if (!slot || !slot.account_address) {
      throw new MeetingNotFoundError(eventId)
    }
    series_id = slot.series_id
    decryptedMeeting = await decodeMeeting(slot, currentAccount)
  } else {
    const existingDBSlot = await getMeeting(eventId, signal)
    if (!existingDBSlot || !existingDBSlot.account_address) {
      throw new MeetingNotFoundError(eventId)
    }
    decryptedMeeting = await decryptMeeting(existingDBSlot, currentAccount)
  }
  const participants = (decryptedMeeting?.participants || [])
    .map(participant => {
      if (participant.account_address === accountAddress) {
        return {
          ...participant,
          status,
        }
      }

      return participant
    })
    .map(participant => {
      if (isRecurringMeeting) {
        const hasRecurringMeeting = participant.slot_id?.includes('_')
        if (hasRecurringMeeting) {
          return participant
        }
        const slot_id =
          participant.slot_id + eventId.substring(eventId.lastIndexOf('_'))
        return {
          ...participant,
          slot_id,
        }
      }
      return participant
    })

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

  const accountSlotMap = participants.reduce((acc, participant) => {
    if (participant.account_address) {
      const lowerCasedAddress = participant.account_address.toLowerCase()
      acc[lowerCasedAddress] = participant.slot_id!
    } else if (participant.guest_email) {
      acc[participant.guest_email] = participant.slot_id!
    }
    return acc
  }, {} as Record<string, string>)
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
    currentAccount,
    decryptedMeeting.content,
    decryptedMeeting.meeting_url,
    decryptedMeeting.meeting_id,
    decryptedMeeting.title,
    decryptedMeeting.reminders,
    decryptedMeeting.recurrence,
    decryptedMeeting.permissions,
    null
  )
  const payload = {
    ...meetingData,
    version: decryptedMeeting.version + 1,
    slotsToRemove: [],
    guestsToRemove: [],
    ignoreOwnerAvailability: true,
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
}
