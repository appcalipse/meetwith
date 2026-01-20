import {
  DBSlot,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  SchedulingType,
} from '@meta/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@meta/ParticipantInfo'
import {
  buildMeetingData,
  decryptConferenceMeeting,
  handleParticipants,
  loadMeetingAccountAddresses,
  mapRelatedSlots,
} from '@utils/calendar_manager'
import { diff, intersec } from '@utils/collections'
import { MeetingPermissions } from '@utils/constants/schedule'
import {
  MeetingCancelForbiddenError,
  MeetingChangeConflictError,
  MeetingDetailsModificationDenied,
  TimeNotAvailableError,
} from '@utils/errors'
import {
  canAccountAccessPermission,
  deduplicateArray,
  isAccountSchedulerOrOwner,
} from '@utils/generic_utils'
import { getParticipantBaseInfoFromAccount } from '@utils/user_manager'
import { calendar_v3 } from 'googleapis'
import { DateTime } from 'luxon'
import { v4 as uuidv4 } from 'uuid'

import { MeetingReminders, RecurringStatus } from '@/types/common'
import { Tables, TablesUpdate } from '@/types/Supabase'

import { MeetingCreationRequest } from '../types/Requests'
import { NO_MEETING_TYPE } from './constants/meeting-types'
import {
  deleteMeetingFromDB,
  findAccountsByEmails,
  getAccountFromDB,
  getConferenceMeetingFromDB,
  getEventMasterSeries,
  getSlotById,
  getSlotSeriesId,
  initDB,
  isSlotFree,
  parseParticipantSlots,
  updateMeeting,
} from './database'
import { ExternalCalendarSync } from './sync_helper'

const getBaseEventId = (googleEventId: string): string => {
  const sanitizedMeetingId = googleEventId.split('_')[0] // '02cd383a77214840b5a1ad4ceb545ff8'
  // Insert hyphens in UUID format: 8-4-4-4-12
  return [
    sanitizedMeetingId.slice(0, 8),
    sanitizedMeetingId.slice(8, 12),
    sanitizedMeetingId.slice(12, 16),
    sanitizedMeetingId.slice(16, 20),
    sanitizedMeetingId.slice(20, 32),
  ].join('-')
}

function extractMeetingDescription(summary: string) {
  return summary
    .replace(/(\n)?Your meeting will happen at .*(\n)?/, '')
    .replace(
      /(\n)?To reschedule or cancel the meeting, please go to .*(\n)?/,
      ''
    )
    .trim()
}

const getParticipationStatus = (responseStatus: string | undefined | null) => {
  switch (responseStatus) {
    case 'accepted':
      return ParticipationStatus.Accepted
    case 'declined':
      return ParticipationStatus.Rejected
    default:
      return ParticipationStatus.Pending
  }
}

const handleUpdateParseMeetingInfo = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId = NO_MEETING_TYPE,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  participants: ParticipantInfo[],
  content: string,
  meetingUrl: string,
  meetingProvider: MeetingProvider,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[],
  rrule?: Array<string> | null,
  eventId?: string | null
) => {
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
    throw new MeetingDetailsModificationDenied()
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
  const currentAccount = await getAccountFromDB(currentAccountAddress)
  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    decryptedMeeting!,
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
    throw new MeetingDetailsModificationDenied()
  }

  const accountSlotMap = await mapRelatedSlots(
    decryptedMeeting!,
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

  const rootMeetingId = decryptedMeeting?.meeting_id

  if (!ignoreAvailabilities) {
    const promises: Promise<void>[] = []

    participants
      .filter(p => p.account_address !== currentAccount?.address)
      .forEach(participant => {
        promises.push(
          new Promise<void>(async resolve => {
            if (
              !participant.account_address ||
              (await isSlotFree(
                participant.account_address,
                startTime,
                endTime,
                meetingTypeId
              ))
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
    eventId: eventId,
    guestsToRemove,
    rrule: rrule || meetingData.rrule,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: decryptedMeeting.version + 1,
  }
  return {
    existingMeeting: decryptedMeeting,
    participantActing: getParticipantBaseInfoFromAccount(currentAccount),
    payload,
  }
}
const handleUpdateRSVPParseMeetingInfo = async (
  currentAccountAddress: string,
  meetingTypeId = NO_MEETING_TYPE,
  decryptedMeeting: MeetingDecrypted,
  actorStatus: ParticipationStatus,
  rrule?: Array<string> | null,
  eventId?: string | null
) => {
  const participants = decryptedMeeting.participants.map(p => {
    if (
      p.account_address?.toLowerCase() === currentAccountAddress.toLowerCase()
    ) {
      return {
        ...p,
        status: actorStatus,
      }
    }
    return p
  })
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const currentAccount = await getAccountFromDB(currentAccountAddress)
  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    decryptedMeeting!,
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
    decryptedMeeting!,
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

  const rootMeetingId = decryptedMeeting?.meeting_id
  const participantData = await handleParticipants(participants, currentAccount)
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    meetingTypeId,
    decryptedMeeting.start,
    decryptedMeeting.end,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    decryptedMeeting?.provider || MeetingProvider.GOOGLE_MEET,
    decryptedMeeting.content,
    decryptedMeeting.meeting_url,
    rootMeetingId,
    decryptedMeeting.title,
    decryptedMeeting.reminders,
    decryptedMeeting.recurrence,
    decryptedMeeting.permissions
  )
  const payload = {
    ...meetingData,
    eventId,
    guestsToRemove,
    rrule: rrule || meetingData.rrule,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: decryptedMeeting.version + 1,
  }
  return {
    existingMeeting: decryptedMeeting,
    participantActing: getParticipantBaseInfoFromAccount(currentAccount),
    payload,
  }
}

const handleDeleteMeetingParseInfo = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId = NO_MEETING_TYPE,
  decryptedMeeting: MeetingDecrypted,
  eventId?: string | null
) => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }
  const participants: ParticipantInfo[] =
    decryptedMeeting?.participants?.filter(
      val => val.account_address !== currentAccountAddress
    )

  const currentAccount = await getAccountFromDB(currentAccountAddress)

  const existingMeetingAccounts = await loadMeetingAccountAddresses(
    decryptedMeeting!,
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
    decryptedMeeting!,
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

  const rootMeetingId = decryptedMeeting?.meeting_id

  if (!ignoreAvailabilities) {
    const promises: Promise<void>[] = []

    participants
      .filter(p => p.account_address !== currentAccount?.address)
      .forEach(participant => {
        promises.push(
          new Promise<void>(async resolve => {
            if (
              !participant.account_address ||
              (await isSlotFree(
                participant.account_address,
                decryptedMeeting.start,
                decryptedMeeting.end,
                meetingTypeId
              ))
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
    decryptedMeeting.start,
    decryptedMeeting.end,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    decryptedMeeting?.provider || MeetingProvider.GOOGLE_MEET,
    decryptedMeeting?.content,
    decryptedMeeting?.meeting_url || '',
    rootMeetingId,
    decryptedMeeting?.title || '',
    decryptedMeeting?.reminders || [],
    decryptedMeeting?.recurrence || MeetingRepeat.NO_REPEAT
  )
  const payload = {
    ...meetingData,
    eventId,
    guestsToRemove,
    slotsToRemove: toRemove
      .map(it => accountSlotMap[it])
      .filter((it): it is string => it !== undefined),
    version: decryptedMeeting.version + 1,
  }
  return {
    participantActing: getParticipantBaseInfoFromAccount(currentAccount),
    payload,
  }
}
const handleCancelOrDelete = async (
  currentAccountAddress: string,
  decryptedMeeting: MeetingDecrypted,
  meetingTypeId = NO_MEETING_TYPE,
  eventId?: string | null
) => {
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    decryptedMeeting.participants,
    currentAccountAddress
  )
  if (isSchedulerOrOwner) {
    await cancelMeeting(currentAccountAddress, decryptedMeeting)
  } else {
    await deleteMeeting(
      true,
      currentAccountAddress,
      meetingTypeId,
      decryptedMeeting,
      eventId
    )
  }
}
const handleCancelOrDeleteSeries = async (
  currentAccountAddress: string,
  decryptedMeeting: MeetingDecrypted,
  meetingId: string,
  masterEvent: calendar_v3.Schema$Event
) => {
  if (!masterEvent.id) return
  // we first check to see if an event of this section exists
  const series = getEventMasterSeries(meetingId, masterEvent.id!)
}

const handleUpdateSingleRecurringInstance = async (
  event: calendar_v3.Schema$Event,
  currentAccountAddress: string
): Promise<Array<TablesUpdate<'slot_instance'>> | undefined> => {
  const startTime = event.start?.dateTime
  const endTime = event.end?.dateTime
  if (!event.id || !startTime || !endTime) return
  const meetingId = event?.extendedProperties?.private?.meetingId
  const meetingTypeId = event?.extendedProperties?.private?.meetingTypeId
  if (!meetingId) {
    console.warn(`Skipping event ${event.id} due to missing  meetingId`)
    return
  }
  const conferenceMeeting = await getConferenceMeetingFromDB(meetingId)
  if (!conferenceMeeting || conferenceMeeting.version !== MeetingVersion.V3)
    return
  const meetingInfo = await decryptConferenceMeeting(conferenceMeeting)
  if (!meetingInfo) return
  const parsedParticipants = await handleParseParticipants(
    meetingId,
    event.attendees || [],
    meetingInfo.participants,
    currentAccountAddress
  )
  let eventInstance
  try {
    eventInstance = await handleUpdateParseMeetingInfo(
      true,
      currentAccountAddress,
      meetingTypeId,
      new Date(startTime),
      new Date(endTime),
      meetingInfo,
      parsedParticipants,
      extractMeetingDescription(event.description || '') || '',
      event.location || '',
      conferenceMeeting.provider,
      event.summary || '',
      conferenceMeeting.reminders,
      conferenceMeeting.recurrence,
      conferenceMeeting.permissions,
      undefined,
      event.id
    )
  } catch (e) {
    console.error(e)
    if (e instanceof MeetingDetailsModificationDenied) {
      const actor = event.attendees?.find(p => p.self)

      // update only the rsvp on other calendars
      eventInstance = await handleUpdateRSVPParseMeetingInfo(
        currentAccountAddress,
        meetingTypeId,
        meetingInfo,
        getParticipationStatus(actor?.responseStatus || '')
      )
    }
  }
  if (eventInstance) {
    const { slots } = await parseParticipantSlots(
      eventInstance.participantActing,
      eventInstance.payload
    )
    const basicString = event.id.split('_').at(-1)
    if (!basicString) return
    const year = basicString.substring(0, 4)
    const month = basicString.substring(4, 6)
    const day = basicString.substring(6, 8)
    const time = basicString.substring(9, 15)
    const extendedString = `${year}-${month}-${day}T${time.substring(
      0,
      2
    )}:${time.substring(2, 4)}:${time.substring(4, 6)}Z`
    const timeStamp = new Date(extendedString).getTime()
    const version = (slots[0].version || 0) + 1

    const slotToUpdatePromises = slots.map(
      async (slot): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slot.id!)
        return {
          account_address: slot.account_address,
          end: new Date(endTime).toISOString(),
          id: slot.id + '_' + timeStamp,
          override_meeting_info_encrypted: slot.meeting_info_encrypted,
          series_id,
          start: new Date(startTime).toISOString(),
          status: RecurringStatus.MODIFIED,
          version: (slots[0].version || 0) + 1,
        }
      }
    )
    const slotsToRemovePromises = eventInstance?.payload.slotsToRemove.map(
      async (slotId: string): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slotId!)
        const slot = await getSlotById(slotId)
        return {
          account_address: slot.account_address,
          end: new Date(endTime).toISOString(),
          id: slotId + '_' + timeStamp,
          override_meeting_info_encrypted: null,
          series_id,
          start: new Date(startTime).toISOString(),
          status: RecurringStatus.CANCELLED,
          version: version + 1,
        }
      }
    )
    const slotToUpdate = await Promise.all(slotToUpdatePromises)
    const slotsToRemove = await Promise.all(slotsToRemovePromises)
    handleSendEventNotification(
      eventInstance.payload,
      eventInstance.participantActing,
      event.id
    )
    if (
      DateTime.now().hasSame(
        DateTime.fromJSDate(eventInstance.payload.start),
        'day'
      )
    ) {
      try {
        updateMeeting(eventInstance.participantActing, eventInstance.payload, {
          force: true,
          skipRecurrenceUpdate: true,
        })
      } catch (e) {
        console.error('Error updating single recurring instance:', e)
      }
    }
    return slotToUpdate.concat(slotsToRemove)
  }
  return undefined
}

const handleCancelOrDeleteForRecurringInstance = async (
  event: calendar_v3.Schema$Event,
  currentAccountAddress: string
): Promise<Array<TablesUpdate<'slot_instance'>> | undefined> => {
  const startTime = event.start?.dateTime
  const endTime = event.end?.dateTime
  if (!event.id || !startTime || !endTime) return
  const meetingId = event?.extendedProperties?.private?.meetingId
  const meetingTypeId = event?.extendedProperties?.private?.meetingTypeId
  const includesParticipants =
    event?.extendedProperties?.private?.includesParticipants === 'true'
  if (!meetingId) {
    console.warn(`Skipping event ${event.id} due to missing  meetingId`)
    return
  }
  if (!includesParticipants) {
    console.warn(`Skipping event ${event.id} due to only scheduler attendee`)
    return
  }
  const conferenceMeeting = await getConferenceMeetingFromDB(meetingId)
  if (!conferenceMeeting || conferenceMeeting.version !== MeetingVersion.V3)
    return
  const meetingInfo = await decryptConferenceMeeting(conferenceMeeting)
  if (!meetingInfo) return
  const db = initDB()
  const { data } = await db.supabase
    .from<Tables<'slots'>>('slots')
    .select('version')
    .in('id', conferenceMeeting.slots)
    .limit(1)
  if (!event.id) return
  meetingInfo.version = data?.[0]?.version || 0
  meetingInfo.start = new Date(startTime)
  meetingInfo.end = new Date(endTime)
  const parsedParticipants = await handleParseParticipants(
    meetingId,
    event.attendees || [],
    meetingInfo.participants,
    currentAccountAddress
  )

  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    meetingInfo.participants,
    currentAccountAddress
  )

  const basicString = event.id.split('_').at(-1)
  if (!basicString) return
  const year = basicString.substring(0, 4)
  const month = basicString.substring(4, 6)
  const day = basicString.substring(6, 8)
  const time = basicString.substring(9, 15)
  const extendedString = `${year}-${month}-${day}T${time.substring(
    0,
    2
  )}:${time.substring(2, 4)}:${time.substring(4, 6)}Z`
  const timeStamp = new Date(extendedString).getTime()
  if (isSchedulerOrOwner) {
    const eventInstance = await handleUpdateParseMeetingInfo(
      true,
      currentAccountAddress,
      meetingTypeId,
      new Date(startTime),
      new Date(endTime),
      meetingInfo,
      parsedParticipants,
      meetingInfo.content || '',
      meetingInfo.meeting_url || '',
      conferenceMeeting.provider,
      meetingInfo.title || '',
      conferenceMeeting.reminders,
      conferenceMeeting.recurrence,
      conferenceMeeting.permissions,
      undefined,
      event.id
    )
    const { slots } = await parseParticipantSlots(
      eventInstance.participantActing,
      eventInstance.payload
    )

    try {
      for (const slot of slots) {
        if (!slot.account_address) continue
        ExternalCalendarSync.delete(slot.account_address, [event.id!])
      }
    } catch (_e) {}
    if (
      DateTime.now().hasSame(
        DateTime.fromJSDate(eventInstance.payload.start),
        'day'
      )
    ) {
      try {
        updateMeeting(eventInstance.participantActing, eventInstance.payload, {
          force: true,
          skipRecurrenceUpdate: true,
        })
      } catch (e) {
        console.error('Error updating single recurring instance:', e)
      }
    }
    return await Promise.all(
      slots.map(async (slot): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slot.id!)
        return {
          account_address: slot.account_address,
          end: new Date(endTime).toISOString(),
          id: slot.id + '_' + timeStamp,
          override_meeting_info_encrypted: null,
          series_id,
          start: new Date(startTime).toISOString(),
          status: RecurringStatus.CANCELLED,
          version: (slot.version || 0) + 1,
        }
      })
    )
  }

  const parsedInfo = await handleDeleteMeetingParseInfo(
    true,
    currentAccountAddress,
    meetingTypeId,
    meetingInfo,
    event.id
  )
  if (parsedInfo) {
    const { slots } = await parseParticipantSlots(
      parsedInfo.participantActing,
      parsedInfo.payload
    )
    const slotToUpdatePromises = slots.map(
      async (slot): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slot.id!)
        return {
          account_address: slot.account_address,
          end: new Date(endTime).toISOString(),
          guest_email: slot.guest_email,
          id: slot.id + '_' + timeStamp,
          override_meeting_info_encrypted: slot.meeting_info_encrypted,
          series_id,
          start: new Date(startTime).toISOString(),
          status: RecurringStatus.MODIFIED,
          version: (slot.version || 0) + 1,
        }
      }
    )
    const slotsToRemovePromises = parsedInfo?.payload.slotsToRemove.map(
      async (slotId: string): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slotId!)
        const slot = await getSlotById(slotId)
        return {
          account_address: slot.account_address,
          end: new Date(endTime).toISOString(),
          guest_email: slot.guest_email,
          id: slotId + '_' + timeStamp,
          override_meeting_info_encrypted: null,
          series_id,
          start: new Date(startTime).toISOString(),
          status: RecurringStatus.CANCELLED,
          version: (slot.version || 0) + 1,
        }
      }
    )

    const slotInstances = await Promise.all([
      ...slotsToRemovePromises,
      ...slotToUpdatePromises,
    ])
    try {
      handleSendEventNotification(
        parsedInfo.payload,
        parsedInfo.participantActing,
        event.id
      ).then(() => {
        const removedSlots = slotInstances.filter(
          slot => slot.status === RecurringStatus.CANCELLED
        )
        for (const slot of removedSlots) {
          if (!slot.account_address) continue
          ExternalCalendarSync.delete(slot.account_address, [event.id!])
        }
      })
    } catch (e) {
      console.error('Error cancelling or deleting recurring instance:', e)
    }
    return slotInstances
  }
  return undefined
}

// TODO: Update so it syncs all participants calendars, skip the acting calendar, the idea is thatb only calendars with no attendees would need updating since all participants now share the same calendar event
const handleSendEventNotification = async (
  payload: MeetingCreationRequest,
  participantActing: ParticipantBaseInfo,
  eventId: string
) => {
  await ExternalCalendarSync.update({
    ...payload,
    created_at: new Date(),
    end: new Date(payload.end),
    eventId: eventId,
    meeting_type_id:
      payload.meetingTypeId === NO_MEETING_TYPE
        ? undefined
        : payload.meetingTypeId,
    participantActing: participantActing,
    participants: payload.participants_mapping,
    start: new Date(payload.start),
    timezone:
      payload.participants_mapping.find(
        p => p.account_address === participantActing.account_address
      )?.timeZone || 'UTC',
  })
}
const cancelMeeting = async (
  currentAccountAddress: string,
  decryptedMeeting: MeetingDecrypted
) => {
  // Sanity check
  if (!decryptedMeeting.id) {
    throw new MeetingChangeConflictError()
  }

  const actorAccount = await getAccountFromDB(currentAccountAddress)

  // Only the owner or scheduler of the meeting can cancel it
  const isMeetingOwners = decryptedMeeting!.participants.find(
    user =>
      user.type === ParticipantType.Owner &&
      user.account_address?.toLowerCase() ===
        currentAccountAddress.toLowerCase()
  )
  const isMeetingScheduler = decryptedMeeting!.participants.find(
    user =>
      user.type === ParticipantType.Scheduler &&
      user.account_address?.toLowerCase() ===
        currentAccountAddress.toLowerCase()
  )
  if (!isMeetingOwners && !isMeetingScheduler) {
    throw new MeetingCancelForbiddenError()
  }
  const slotsToRemove = deduplicateArray(decryptedMeeting.related_slot_ids)

  const guestsToRemove = decryptedMeeting.participants.filter(
    p => p.guest_email
  )

  const participantActing = getParticipantBaseInfoFromAccount(actorAccount)

  try {
    await deleteMeetingFromDB(
      participantActing,
      slotsToRemove,
      guestsToRemove,
      decryptedMeeting.meeting_id,
      actorAccount?.preferences?.timezone || 'UTC',
      undefined,
      decryptedMeeting?.title
    )
  } catch (e) {
    console.error('Error deleting meeting:', e)
    throw e
  }
}

const deleteMeeting = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId: string,
  decryptedMeeting: MeetingDecrypted,
  eventId?: string | null
): Promise<DBSlot> => {
  const { participantActing, payload } = await handleDeleteMeetingParseInfo(
    ignoreAvailabilities,
    currentAccountAddress,
    meetingTypeId,
    decryptedMeeting,
    eventId
  )
  // Fetch the updated data one last time
  const meetingResult: DBSlot = await updateMeeting(participantActing, payload)
  return meetingResult
}

const handleUpdateMeeting = async (
  ignoreAvailabilities: boolean,
  currentAccountAddress: string,
  meetingTypeId = NO_MEETING_TYPE,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  participants: ParticipantInfo[],
  content: string,
  meetingUrl: string,
  meetingProvider: MeetingProvider,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat = MeetingRepeat.NO_REPEAT,
  selectedPermissions?: MeetingPermissions[],
  rrule?: Array<string> | null,
  eventId?: string | null,
  calendar_id?: string | null
): Promise<DBSlot> => {
  const { payload, participantActing } = await handleUpdateParseMeetingInfo(
    ignoreAvailabilities,
    currentAccountAddress,
    meetingTypeId,
    startTime,
    endTime,
    decryptedMeeting,
    participants,
    content,
    meetingUrl,
    meetingProvider,
    meetingTitle,
    meetingReminders,
    meetingRepeat,
    selectedPermissions,
    rrule,
    eventId
  )

  const meetingResult: DBSlot = await updateMeeting(
    participantActing,
    { ...payload, calendar_id },
    {
      force: true,
    }
  )
  return meetingResult
}
const handleUpdateMeetingRsvps = async (
  currentAccountAddress: string,
  meetingTypeId = NO_MEETING_TYPE,
  decryptedMeeting: MeetingDecrypted,
  actorStatus: ParticipationStatus,
  skipNoitfiation?: boolean
): Promise<DBSlot> => {
  const { payload, participantActing } = await handleUpdateRSVPParseMeetingInfo(
    currentAccountAddress,
    meetingTypeId,
    decryptedMeeting,
    actorStatus
  )

  const meetingResult: DBSlot = await updateMeeting(
    participantActing,
    payload,
    {
      force: true,
      skipNoitfiation,
    }
  )
  return meetingResult
}
const handleParseParticipants = async (
  meetingId: string,
  attendees: calendar_v3.Schema$EventAttendee[],
  participants: ParticipantInfo[],
  currentAccountAddress: string
) => {
  const typeOrder = {
    [ParticipantType.Scheduler]: 0,
    [ParticipantType.Owner]: 1,
    [ParticipantType.Invitee]: 2,
  }
  const emailAccounts = await findAccountsByEmails(
    attendees
      .map(attendee => attendee.email)
      .filter((email): email is string => !!email)
  )
  if (!emailAccounts) {
    throw new Error('Failed to fetch accounts by emails')
  }
  participants = participants.sort((a, b) => {
    return typeOrder[a.type] - typeOrder[b.type]
  })
  const parsedParticipants: ParticipantInfo[] = []
  for (const attendee of attendees) {
    if (!attendee.email) continue
    const accounts = emailAccounts[attendee.email.toLowerCase()]
    const participant = participants.find(
      p =>
        p.account_address &&
        accounts?.some(
          acc => acc.address.toLowerCase() === p.account_address?.toLowerCase()
        ) &&
        !parsedParticipants.some(
          parsed =>
            parsed.account_address &&
            parsed.account_address.toLowerCase() ===
              p.account_address?.toLowerCase()
        )
    )

    if (participant) {
      parsedParticipants.push(participant)
    } else if (accounts && accounts.length > 0) {
      // Multiple accounts found, pick the first one that hasn't been added yet
      // This is a fallback and may need better handling
      const firstAccount = accounts.find(acc => {
        return !parsedParticipants.some(
          p =>
            p.account_address &&
            p.account_address.toLowerCase() === acc.address.toLowerCase()
        )
      })
      if (firstAccount) {
        parsedParticipants.push({
          account_address: firstAccount.address,
          guest_email: undefined,
          meeting_id: meetingId,
          name:
            firstAccount?.name || attendee?.displayName || firstAccount.address,
          slot_id: uuidv4(),
          status: getParticipationStatus(attendee.responseStatus || ''),
          type: ParticipantType.Invitee,
        })
      } else {
        // Guest participant
        parsedParticipants.push({
          account_address: undefined,
          guest_email: attendee.email,
          meeting_id: meetingId,
          name: attendee?.displayName || attendee.email || '',
          slot_id: uuidv4(),
          status: getParticipationStatus(attendee.responseStatus || ''),
          type: ParticipantType.Invitee,
        })
      }
    } else {
      // Guest participant
      parsedParticipants.push({
        account_address: undefined,
        guest_email: attendee.email,
        meeting_id: meetingId,
        name: attendee?.displayName || attendee.email || '',
        slot_id: uuidv4(),
        status: getParticipationStatus(attendee.responseStatus || ''),
        type: ParticipantType.Invitee,
      })
    }
  }
  return parsedParticipants
}

export {
  extractMeetingDescription,
  getBaseEventId,
  getParticipationStatus,
  handleCancelOrDelete,
  handleCancelOrDeleteForRecurringInstance,
  handleParseParticipants,
  handleParticipants,
  handleSendEventNotification,
  handleUpdateMeeting,
  handleUpdateMeetingRsvps,
  handleUpdateParseMeetingInfo,
  handleUpdateRSVPParseMeetingInfo,
  handleUpdateSingleRecurringInstance,
}
