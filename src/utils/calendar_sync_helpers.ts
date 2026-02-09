import {
  DBSlot,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  SchedulingType,
} from '@meta/Meeting'
import {
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
import { rrulestr } from 'rrule'
import { v4 as uuidv4 } from 'uuid'
import { MeetingReminders, RecurringStatus } from '@/types/common'
import { Tables, TablesInsert, TablesUpdate } from '@/types/Supabase'
import {
  DeleteInstanceRequest,
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '../types/Requests'
import { MAX_RECURRING_LOOKAHEAD_MONTHS } from './constants/meeting'
import { NO_MEETING_TYPE } from './constants/meeting-types'
import {
  bulkUpdateSlotSeriesConfirmedSlots,
  deleteMeetingFromDB,
  deleteRecurringSlotInstances,
  deleteSeriesInstantAfterDate,
  findAccountsByEmails,
  getAccountFromDB,
  getConferenceMeetingFromDB,
  getEventMasterSeries,
  getSlotSeries,
  getSlotSeriesId,
  isSlotFree,
  parseParticipantSlots,
  updateMeeting,
  upsertSeries,
} from './database'
import {
  queueCalendarDeleteSync,
  queueCalendarInstanceDeleteSync,
  queueCalendarInstanceUpdateSync,
  queueCalendarUpdateSync,
} from './workers/calendar-sync.queue'

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
  isRecurringEventUpdate?: boolean
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
    decryptedMeeting,
    currentAccount.address,
    isRecurringEventUpdate
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
    decryptedMeeting,
    currentAccountAddress,
    isRecurringEventUpdate
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
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guestsToKeep].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it]
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
    decryptedMeeting,
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
    decryptedMeeting,
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
      acc[it] = accountSlotMap[it]
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
    decryptedMeeting,
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
    decryptedMeeting,
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

  // TODO: Remove completely
  if (!ignoreAvailabilities) {
    const promises: Promise<void>[] = []

    participants
      .filter(p => p.account_address !== currentAccount?.address)
      .forEach(participant => {
        promises.push(
          new Promise<void>(async (resolve, reject) => {
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
            reject(new TimeNotAvailableError())
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
      acc[it] = accountSlotMap[it]
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
  if (!masterEvent.id || !masterEvent.recurrence) return
  const series = await getEventMasterSeries(meetingId, masterEvent.id!)
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    decryptedMeeting.participants,
    currentAccountAddress
  )
  const seriesMap = new Map<string, Tables<'slot_series'>>(
    series.map(serie => [
      serie.account_address || serie.guest_email || '',
      serie,
    ])
  )
  if (isSchedulerOrOwner) {
    await deleteRecurringSlotInstances(series.map(serie => serie.id))
    queueCalendarDeleteSync(
      series
        .map(s => s.account_address)
        .filter((addr): addr is string => addr !== null),
      [masterEvent.id]
    ).catch(err => console.error('Failed to delete meeting update sync:', err))
    // TODO: Sync to ditrbuted calendars
  } else {
    const parsedInfo = await handleDeleteMeetingParseInfo(
      false,
      currentAccountAddress,
      NO_MEETING_TYPE,
      decryptedMeeting
    )
    if (parsedInfo) {
      const { slots } = await parseParticipantSlots(
        parsedInfo.participantActing,
        parsedInfo.payload
      )
      const rule = rrulestr(masterEvent.recurrence[0])
      const until = rule.options.until
      const toUpdate: Array<TablesInsert<'slot_series'>> = []
      const toInsert: Array<TablesInsert<'slot_series'>> = []
      for (const slot of slots) {
        const serie = seriesMap.get(
          slot?.account_address || slot.guest_email || ''
        )
        if (serie) {
          // series already exists
          toUpdate.push({
            id: slot.id,
            account_address: slot.account_address || null,
            created_at: new Date().toISOString(),
            default_meeting_info_encrypted: slot.meeting_info_encrypted,
            guest_email: slot.guest_email || null,
            template_start: slot.start,
            template_end: slot.end,
            rrule: masterEvent.recurrence,
            effective_start: serie.effective_start,
            effective_end: until ? until.toISOString() : null,
            ical_uid: masterEvent.id,
            meeting_id: meetingId,
            role: slot.role || ParticipantType.Invitee,
          })
        } else {
          toInsert.push({
            id: slot.id,
            account_address: slot.account_address || null,
            created_at: new Date().toISOString(),
            default_meeting_info_encrypted: slot.meeting_info_encrypted,
            guest_email: slot.guest_email || null,
            template_start: slot.start,
            template_end: slot.end,
            rrule: masterEvent.recurrence,
            effective_start: slot.start,
            effective_end: until ? until.toISOString() : null,
            ical_uid: masterEvent.id,
            meeting_id: meetingId,
            role: slot.role || ParticipantType.Invitee,
          })
        }
      }
      const slotsToRemove = parsedInfo.payload.slotsToRemove

      const [updatedSeries, insertedSeries] = await Promise.all([
        upsertSeries(toUpdate),
        upsertSeries(toInsert),
        slotsToRemove.length > 0
          ? deleteRecurringSlotInstances(slotsToRemove)
          : Promise.resolve(),
      ])
      const promises = updatedSeries.map(async slotSerie => {
        await bulkUpdateSlotSeriesConfirmedSlots(
          slotSerie.id,
          new Date(parsedInfo.payload.start),
          new Date(parsedInfo.payload.end)
        )
        if (until) {
          await deleteSeriesInstantAfterDate(slotSerie.id, until)
        }
      })
      await Promise.all(promises)
      const serie = seriesMap.get(currentAccountAddress)

      const syncDetail: MeetingCreationSyncRequest = {
        created_at: serie?.created_at
          ? new Date(serie?.created_at)
          : new Date(),
        participantActing: parsedInfo.participantActing,
        ical_uid: masterEvent.id,
        participants: parsedInfo.payload.participants_mapping,
        timezone:
          parsedInfo.payload.participants_mapping.find(
            p => p.account_address === currentAccountAddress
          )?.timeZone || 'UTC',
        ...parsedInfo.payload,
      }
      queueCalendarUpdateSync(syncDetail).catch(err =>
        console.error('Failed to queue meeting update sync:', err)
      )
      queueCalendarDeleteSync([currentAccountAddress], [masterEvent.id]).catch(
        err => console.error('Failed to delete meeting update sync:', err)
      )
    }
  }
}
const handleUpdateMeetingSeries = async (
  currentAccountAddress: string,
  meetingId: string,
  masterEvent: calendar_v3.Schema$Event,
  startTime: Date,
  endTime: Date,
  decryptedMeeting: MeetingDecrypted,
  participants: ParticipantInfo[],
  content: string,
  meetingUrl: string,
  meetingProvider: MeetingProvider,
  meetingTitle?: string,
  meetingReminders?: Array<MeetingReminders>,
  selectedPermissions?: MeetingPermissions[]
) => {
  if (!masterEvent.id || !masterEvent.recurrence) return
  const series = await getEventMasterSeries(meetingId, masterEvent.id!)
  const seriesMap = new Map(
    series.map(serie => [serie.account_address || serie.guest_email, serie])
  )
  const cleanedParticipants = []
  for (const participant of participants) {
    const serie = seriesMap.get(
      participant?.account_address || participant.guest_email || ''
    )
    if (serie) {
      cleanedParticipants.push({
        ...participant,
        slot_id: serie.id, // generate a new id for meeting
      })
    } else {
      cleanedParticipants.push({
        ...participant,
        slot_id: uuidv4(), // generate a new id for meeting
      })
    }
  }
  const eventInstance = await handleUpdateParseMeetingInfo(
    currentAccountAddress,
    NO_MEETING_TYPE,
    startTime,
    endTime,
    decryptedMeeting,
    participants.map(p => ({
      ...p,
    })),
    content,
    meetingUrl,
    meetingProvider,
    meetingTitle,
    meetingReminders,
    MeetingRepeat.NO_REPEAT, // This would be overridden by the calendar's repeat so safe to explicitly override
    selectedPermissions,
    masterEvent.recurrence,
    true
  )
  const { slots } = await parseParticipantSlots(
    eventInstance.participantActing,
    eventInstance.payload,
    true
  )
  const start = series?.[0]?.template_start || eventInstance.payload.start
  const rule = rrulestr(masterEvent.recurrence[0], {
    dtstart: new Date(start),
  })
  const until = rule.options.until
  const toUpdate: Array<TablesInsert<'slot_series'>> = []
  const toInsert: Array<TablesInsert<'slot_series'>> = []

  for (const slot of slots) {
    const serie = seriesMap.get(slot?.account_address || slot.guest_email || '')
    if (serie) {
      // series already exists
      toUpdate.push({
        id: slot.id,
        account_address: slot.account_address || null,
        created_at: new Date().toISOString(),
        default_meeting_info_encrypted: slot.meeting_info_encrypted,
        guest_email: slot.guest_email || null,
        template_start: slot.start,
        template_end: slot.end,
        rrule: masterEvent.recurrence,
        effective_start: serie.effective_start,
        effective_end: until ? until.toISOString() : null,
        ical_uid: masterEvent.id,
        meeting_id: meetingId,
        role: slot.role || ParticipantType.Invitee,
      })
    } else {
      toInsert.push({
        id: slot.id,
        account_address: slot.account_address || null,
        created_at: new Date().toISOString(),
        default_meeting_info_encrypted: slot.meeting_info_encrypted,
        guest_email: slot.guest_email || null,
        template_start: slot.start,
        template_end: slot.end,
        rrule: masterEvent.recurrence,
        effective_start: slot.start,
        effective_end: until ? until.toISOString() : null,
        ical_uid: masterEvent.id,
        meeting_id: meetingId,
        role: slot.role || ParticipantType.Invitee,
      })
    }
  }
  // TODO: make sure guests slotIds also gets pushed here
  const slotsToRemove = eventInstance.payload.slotsToRemove

  const [updatedSeries, insertedSeries] = await Promise.all([
    upsertSeries(toUpdate),
    upsertSeries(toInsert),
    slotsToRemove.length > 0
      ? deleteRecurringSlotInstances(slotsToRemove)
      : Promise.resolve(),
  ])
  const promises = updatedSeries.map(async slotSerie => {
    await bulkUpdateSlotSeriesConfirmedSlots(
      slotSerie.id,
      new Date(startTime),
      new Date(endTime)
    )
    if (until) {
      await deleteSeriesInstantAfterDate(slotSerie.id, until)
    }
  })
  await Promise.all(promises)

  // Queue calendar sync for updated series

  const serie = seriesMap.get(currentAccountAddress)
  const syncDetail: MeetingCreationSyncRequest = {
    created_at: serie?.created_at ? new Date(serie?.created_at) : new Date(),
    participantActing: eventInstance.participantActing,
    participants: eventInstance.payload.participants_mapping,
    ical_uid: masterEvent.id,
    timezone:
      eventInstance.payload.participants_mapping.find(
        p => p.account_address === currentAccountAddress
      )?.timeZone || 'UTC',
    ...eventInstance.payload,
  }
  queueCalendarUpdateSync(syncDetail).catch(err =>
    console.error('Failed to queue meeting update sync:', err)
  )

  const instancesToInsert = insertedSeries.map(serie => {
    const start = DateTime.fromJSDate(new Date(serie.template_start))
    const maxLimit = start.plus({ months: MAX_RECURRING_LOOKAHEAD_MONTHS })
    const ghostStartTimes = rule.between(
      start.toJSDate(),
      maxLimit.toJSDate(),
      true
    )
    const duration_minutes = DateTime.fromJSDate(
      new Date(serie.template_end)
    ).diff(start, 'minutes').minutes

    const toInsert = ghostStartTimes.map(ghostStart => {
      const start = DateTime.fromJSDate(ghostStart)
      const end = start.plus({ minutes: Math.abs(duration_minutes) })
      const newSlot: TablesInsert<'slot_instance'> = {
        account_address: serie.account_address || null,
        created_at: new Date().toISOString(),
        end: end.toJSDate().toISOString(),
        guest_email: serie.guest_email || null,
        id: `${serie.id}_${ghostStart.getTime()}`,
        override_meeting_info_encrypted: null,
        series_id: serie.id,
        start: ghostStart.toISOString(),
        status: RecurringStatus.CONFIRMED,
        version: 0,
      }
      return newSlot
    })
    return toInsert
  })
  return instancesToInsert.flat()
}
const handleUpdateMeetingSeriesRsvps = async (
  currentAccountAddress: string,
  meetingId: string,
  masterEvent: calendar_v3.Schema$Event,
  decryptedMeeting: MeetingDecrypted,
  actorStatus: ParticipationStatus
) => {
  if (!masterEvent.id || !masterEvent.recurrence) return
  const series = await getEventMasterSeries(meetingId, masterEvent.id!)
  const seriesMap = new Map(
    series.map(serie => [serie.account_address || serie.guest_email, serie])
  )
  const cleanedParticipants = []
  for (const participant of decryptedMeeting.participants || []) {
    const serie = seriesMap.get(
      participant?.account_address || participant.guest_email || ''
    )
    if (serie) {
      cleanedParticipants.push({
        ...participant,
        slot_id: serie.id, // generate a new id for meeting
      })
    } else {
      cleanedParticipants.push({
        ...participant,
        slot_id: uuidv4(), // generate a new id for meeting
      })
    }
  }
  decryptedMeeting.participants = cleanedParticipants
  const { payload, participantActing } = await handleUpdateRSVPParseMeetingInfo(
    currentAccountAddress,
    NO_MEETING_TYPE,
    decryptedMeeting,
    actorStatus
  )
  const { slots } = await parseParticipantSlots(
    participantActing,
    payload,
    true
  )
  const start = series?.[0]?.template_start || payload.start

  const rule = rrulestr(masterEvent.recurrence[0], {
    dtstart: new Date(start),
  })
  const until = rule.options.until
  const toUpdate: Array<TablesInsert<'slot_series'>> = []
  const toInsert: Array<TablesInsert<'slot_series'>> = []
  for (const slot of slots) {
    const serie = seriesMap.get(slot?.account_address || slot.guest_email || '')
    if (serie) {
      // series already exists
      toUpdate.push({
        id: slot.id,
        account_address: slot.account_address || null,
        created_at: new Date().toISOString(),
        default_meeting_info_encrypted: slot.meeting_info_encrypted,
        guest_email: slot.guest_email || null,
        template_start: slot.start,
        template_end: slot.end,
        rrule: masterEvent.recurrence,
        effective_start: serie.effective_start,
        effective_end: until ? until.toISOString() : null,
        ical_uid: masterEvent.id,
        meeting_id: meetingId,
        role: slot.role || ParticipantType.Invitee,
      })
    } else {
      toInsert.push({
        id: slot.id,
        account_address: slot.account_address || null,
        created_at: new Date().toISOString(),
        default_meeting_info_encrypted: slot.meeting_info_encrypted,
        guest_email: slot.guest_email || null,
        template_start: slot.start,
        template_end: slot.end,
        rrule: masterEvent.recurrence,
        effective_start: slot.start,
        effective_end: until ? until.toISOString() : null,
        ical_uid: masterEvent.id,
        meeting_id: meetingId,
        role: slot.role || ParticipantType.Invitee,
      })
    }
  }
  // TODO: make sure guests slotIds also gets pushed here
  const slotsToRemove = payload.slotsToRemove

  const [updatedSeries, insertedSeries] = await Promise.all([
    upsertSeries(toUpdate),
    upsertSeries(toInsert),
    slotsToRemove.length > 0
      ? deleteRecurringSlotInstances(slotsToRemove)
      : Promise.resolve(),
  ])
  const promises = updatedSeries.map(async slotSerie => {
    await bulkUpdateSlotSeriesConfirmedSlots(
      slotSerie.id,
      new Date(payload.start),
      new Date(payload.end)
    )
    if (until) {
      await deleteSeriesInstantAfterDate(slotSerie.id, until)
    }
  })
  await Promise.all(promises)
  const instancesToInsert = insertedSeries.map(serie => {
    const start = DateTime.fromJSDate(new Date(serie.template_start))
    const maxLimit = start.plus({ months: MAX_RECURRING_LOOKAHEAD_MONTHS })
    const ghostStartTimes = rule.between(
      start.toJSDate(),
      maxLimit.toJSDate(),
      true
    )
    const duration_minutes = DateTime.fromJSDate(
      new Date(serie.template_end)
    ).diff(start, 'minutes').minutes

    const toInsert = ghostStartTimes.map(ghostStart => {
      const start = DateTime.fromJSDate(ghostStart)
      const end = start.plus({ minutes: Math.abs(duration_minutes) })
      const newSlot: TablesInsert<'slot_instance'> = {
        account_address: serie.account_address || null,
        created_at: new Date().toISOString(),
        end: end.toJSDate().toISOString(),
        guest_email: serie.guest_email || null,
        id: `${serie.id}_${ghostStart.getTime()}`,
        override_meeting_info_encrypted: null,
        series_id: serie.id,
        start: ghostStart.toISOString(),
        status: RecurringStatus.CONFIRMED,
        version: 0,
      }
      return newSlot
    })
    return toInsert
  })
  return instancesToInsert.flat()
}
const handleUpdateSingleRecurringInstance = async (
  event: calendar_v3.Schema$Event,
  currentAccountAddress: string
): Promise<Array<TablesUpdate<'slot_instance'>> | undefined> => {
  const startTime = event.start?.dateTime
  const endTime = event.end?.dateTime
  if (!event.id || !startTime || !endTime || !event.recurringEventId) return
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
  const series = await getEventMasterSeries(meetingId, event.recurringEventId!)
  const seriesMap = new Map(
    series.map(serie => [serie.account_address || serie.guest_email, serie])
  )
  if (!meetingInfo) return
  const timeStamp = parseGoogleEventTimestamp(event.id)
  const parsedParticipants = await handleParseParticipants(
    meetingId,
    event.attendees || [],
    meetingInfo.participants,
    currentAccountAddress
  )
  const participants = []
  for (const participant of parsedParticipants) {
    const serie = seriesMap.get(
      participant?.account_address || participant.guest_email || ''
    )
    if (serie) {
      participants.push({
        ...participant,
        slot_id: `${serie.id}_${timeStamp}`, // generate a new id for meeting
      })
    } else {
      participants.push({
        ...participant,
        slot_id: uuidv4(), // generate a new id for meeting
      })
    }
  }
  const cleanedParticipants = []
  for (const participant of meetingInfo.participants || []) {
    const serie = seriesMap.get(
      participant?.account_address || participant.guest_email || ''
    )
    if (serie) {
      cleanedParticipants.push({
        ...participant,
        slot_id: `${serie.id}_${timeStamp}`, // generate a new id for meeting
      })
    } else {
      cleanedParticipants.push({
        ...participant,
        slot_id: uuidv4(), // generate a new id for meeting
      })
    }
  }
  meetingInfo.participants = cleanedParticipants
  meetingInfo.related_slot_ids = cleanedParticipants
    .map(p => p.slot_id)
    .filter((p): p is string => !!p)

  let eventInstance

  try {
    eventInstance = await handleUpdateParseMeetingInfo(
      currentAccountAddress,
      meetingTypeId,
      new Date(startTime),
      new Date(endTime),
      meetingInfo,
      participants,
      extractMeetingDescription(event.description || '') || '',
      event.location || '',
      conferenceMeeting.provider,
      event.summary || '',
      conferenceMeeting.reminders,
      conferenceMeeting.recurrence,
      conferenceMeeting.permissions,
      undefined
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
    const { slots, changingTime } = await parseParticipantSlots(
      eventInstance.participantActing,
      eventInstance.payload
    )
    if (!timeStamp) return
    const version = (slots[0].version || 0) + 1

    const slotToUpdatePromises = slots.map(
      async (
        slot
      ): Promise<
        | {
            instances: TablesUpdate<'slot_instance'>
          }
        | { slots: TablesUpdate<'slots'> }
      > => {
        const series = seriesMap.get(
          slot?.account_address || slot.guest_email || ''
        )
        if (series) {
          return {
            instances: {
              account_address: slot.account_address ?? null,
              end: new Date(endTime).toISOString(),
              id: series.id + '_' + timeStamp,
              override_meeting_info_encrypted: slot.meeting_info_encrypted,
              series_id: series.id,
              start: new Date(startTime).toISOString(),
              status: RecurringStatus.MODIFIED,
              version: (slots[0].version || 0) + 1,
              guest_email: slot.guest_email ?? null,
            },
          }
        } else {
          console.warn('No series found for slot', slot.id)
          // create a new slot
          return {
            slots: {
              ...slot,
            },
          }
        }
      }
    )
    const slotsToRemovePromises = eventInstance?.payload.slotsToRemove.map(
      async (
        slotId: string
      ): Promise<
        | {
            instances: TablesUpdate<'slot_instance'>
          }
        | { slots: string }
      > => {
        const serie = await getSlotSeries(slotId)
        if (serie) {
          return {
            instances: {
              account_address: serie.account_address ?? null,
              end: new Date(endTime).toISOString(),
              id: slotId + '_' + timeStamp,
              override_meeting_info_encrypted: null,
              series_id: serie.id,
              start: new Date(startTime).toISOString(),
              status: RecurringStatus.CANCELLED,
              version: version + 1,
              guest_email: serie.guest_email ?? null,
            },
          }
        } else {
          console.warn('No series found for slot', slotId)
          return {
            slots: slotId,
          }
        }
      }
    )
    const slotToUpdate = await Promise.all(slotToUpdatePromises)
    const slotsToRemove = await Promise.all(slotsToRemovePromises)

    const serie = seriesMap.get(currentAccountAddress)
    const syncDetail: MeetingInstanceCreationSyncRequest = {
      created_at: serie?.created_at ? new Date(serie?.created_at) : new Date(),
      ...eventInstance.payload,
      meeting_id: meetingId,
      ical_uid: event.recurringEventId,
      participants: eventInstance.payload.participants_mapping,
      participantActing: eventInstance.participantActing,
      timezone:
        eventInstance.payload.participants_mapping.find(
          p => p.account_address === currentAccountAddress
        )?.timeZone || 'UTC',
      original_start_time: changingTime?.oldStart
        ? changingTime?.oldStart
        : new Date(startTime),
    }
    queueCalendarInstanceUpdateSync(syncDetail).catch(err =>
      console.error('Failed to queue meeting update sync:', err)
    )
    return slotToUpdate
      .filter(s => 'instances' in s)
      .map(s => s.instances)
      .concat(slotsToRemove.filter(s => 'instances' in s).map(s => s.instances))
      .filter(val => !!val)
  }
  return undefined
}
const parseGoogleEventTimestamp = (eventId: string): number | null => {
  const match = eventId.match(/_(\d{8})T(\d{6})Z?$/)
  if (!match) return null
  const [, date, time] = match
  return new Date(
    `${date.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}T${time.replace(
      /(\d{2})(\d{2})(\d{2})/,
      '$1:$2:$3'
    )}Z`
  ).getTime()
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
  const series = await getEventMasterSeries(meetingId, event.recurringEventId!)
  const seriesMap = new Map(
    series.map(serie => [serie.account_address || serie.guest_email, serie])
  )

  if (!event.id) return
  meetingInfo.version = 0
  meetingInfo.start = new Date(startTime)
  meetingInfo.end = new Date(endTime)
  const parsedParticipants = await handleParseParticipants(
    meetingId,
    event.attendees || [],
    meetingInfo.participants,
    currentAccountAddress
  )
  const participants = []
  const timeStamp = parseGoogleEventTimestamp(event.id)

  for (const participant of parsedParticipants) {
    const serie = seriesMap.get(
      participant?.account_address || participant.guest_email || ''
    )
    if (serie) {
      participants.push({
        ...participant,
        slot_id: `${serie.id}_${timeStamp}`, // generate a new id for meeting
      })
    } else {
      // We can assume that this is a new foreighn participant and create a slot for them
      participants.push({
        ...participant,
        slot_id: uuidv4(), // generate a new id for meeting
      })
    }
  }
  const cleanedParticipants = []
  for (const participant of meetingInfo.participants || []) {
    const serie = seriesMap.get(
      participant?.account_address || participant.guest_email || ''
    )
    if (serie) {
      cleanedParticipants.push({
        ...participant,
        slot_id: `${serie.id}_${timeStamp}`, // generate a new id for meeting
      })
    } else {
      cleanedParticipants.push({
        ...participant,
        slot_id: uuidv4(), // generate a new id for meeting
      })
    }
  }
  meetingInfo.participants = cleanedParticipants
  meetingInfo.related_slot_ids = cleanedParticipants
    .map(p => p.slot_id)
    .filter((p): p is string => !!p)
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    meetingInfo.participants,
    currentAccountAddress
  )

  if (!timeStamp) return
  if (isSchedulerOrOwner) {
    const eventInstance = await handleUpdateParseMeetingInfo(
      currentAccountAddress,
      meetingTypeId,
      new Date(startTime),
      new Date(endTime),
      meetingInfo,
      participants,
      meetingInfo.content || '',
      meetingInfo.meeting_url || '',
      conferenceMeeting.provider,
      meetingInfo.title || '',
      conferenceMeeting.reminders,
      conferenceMeeting.recurrence,
      conferenceMeeting.permissions,
      undefined
    )
    const { slots, changingTime } = await parseParticipantSlots(
      eventInstance.participantActing,
      eventInstance.payload
    )

    const syncDetail: DeleteInstanceRequest = {
      meeting_id: meetingId,
      ical_uid: event.recurringEventId!,
      start: changingTime?.oldStart
        ? new Date(changingTime?.oldStart).toISOString()
        : new Date(startTime).toISOString(),
    }
    queueCalendarInstanceDeleteSync(
      eventInstance.payload.participants_mapping
        .map(p => p.account_address)
        .filter((addr): addr is string => addr !== null),
      syncDetail
    ).catch(err => console.error('Failed to queue meeting update sync:', err))

    const toInsert = await Promise.all(
      slots.map(async (slot): Promise<TablesUpdate<'slot_instance'> | null> => {
        const serie = seriesMap.get(currentAccountAddress)
        if (serie) {
          return {
            account_address: slot.account_address,
            end: new Date(endTime).toISOString(),
            id: serie.id + '_' + timeStamp,
            override_meeting_info_encrypted: slot.meeting_info_encrypted,
            series_id: serie.id,
            start: new Date(startTime).toISOString(),
            status: RecurringStatus.CANCELLED,
            version: (slots[0].version || 0) + 1,
          }
        } else {
          console.warn('No series found for slot', slot.id)

          return null
        }
      })
    )
    return toInsert.filter(instance => !!instance)
  }

  const parsedInfo = await handleDeleteMeetingParseInfo(
    true,
    currentAccountAddress,
    meetingTypeId,
    meetingInfo,
    event.id
  )
  if (parsedInfo) {
    const { slots, changingTime } = await parseParticipantSlots(
      parsedInfo.participantActing,
      parsedInfo.payload
    )
    const slotToUpdatePromises = slots.map(
      async (slot): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slot.id!)
        return {
          account_address: slot.account_address ?? null,
          end: new Date(endTime).toISOString(),
          guest_email: slot.guest_email ?? null,
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
      async (
        slotId: string
      ): Promise<TablesUpdate<'slot_instance'> | undefined> => {
        const serie = series.find(s => s.id === slotId)
        if (serie) {
          return {
            account_address: serie.account_address ?? null,
            end: new Date(endTime).toISOString(),
            guest_email: serie.guest_email ?? null,
            id: slotId + '_' + timeStamp,
            override_meeting_info_encrypted: null,
            series_id: serie?.id,
            start: new Date(startTime).toISOString(),
            status: RecurringStatus.CANCELLED,
            version: 0,
          }
        }
      }
    )

    const slotInstances = await Promise.all([
      ...slotsToRemovePromises,
      ...slotToUpdatePromises,
    ])
    const syncDetail: DeleteInstanceRequest = {
      meeting_id: meetingId,
      ical_uid: event.recurringEventId!,
      start: changingTime?.oldStart
        ? new Date(changingTime?.oldStart).toISOString()
        : new Date(startTime).toISOString(),
    }
    queueCalendarInstanceDeleteSync(
      parsedInfo.payload.participants_mapping
        .map(p => p.account_address)
        .filter((addr): addr is string => addr !== null),
      syncDetail
    ).catch(err => console.error('Failed to queue meeting update sync:', err))

    return slotInstances.filter(
      (s): s is TablesUpdate<'slot_instance'> => s !== undefined
    )
  }
  return undefined
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
  const isMeetingOwners = decryptedMeeting.participants.find(
    user =>
      user.type === ParticipantType.Owner &&
      user.account_address?.toLowerCase() ===
        currentAccountAddress.toLowerCase()
  )
  const isMeetingScheduler = decryptedMeeting.participants.find(
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
    rrule
  )

  const meetingResult: DBSlot = await updateMeeting(participantActing, {
    ...payload,
    calendar_id,
  })

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

  const meetingResult: DBSlot = await updateMeeting(participantActing, payload)

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
  const parsedAddressSet = new Set<string>()
  for (const attendee of attendees) {
    if (!attendee.email) continue
    const accounts = emailAccounts[attendee.email.toLowerCase()]
    const accountAddressSet = new Set(
      accounts?.map(acc => acc.address.toLowerCase()) ?? []
    )
    const addressParticipant = participants.find(p => {
      const normalizedAddress = p.account_address?.toLowerCase()
      return (
        normalizedAddress &&
        accountAddressSet.has(normalizedAddress) &&
        !parsedAddressSet.has(normalizedAddress)
      )
    })

    const emailParticipant = participants.find(
      p =>
        p.guest_email &&
        p.guest_email.toLowerCase() === attendee.email!.toLowerCase()
    )

    if (emailParticipant) {
      const newParticipant = {
        ...emailParticipant,
        status: getParticipationStatus(attendee.responseStatus || ''),
      }
      parsedParticipants.push(newParticipant)
    } else if (addressParticipant) {
      const newParticipant = {
        ...addressParticipant,
        status: getParticipationStatus(attendee.responseStatus || ''),
      }
      parsedParticipants.push(newParticipant)
      parsedAddressSet.add(newParticipant.account_address!.toLowerCase())
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
        parsedAddressSet.add(firstAccount.address.toLowerCase())
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
  handleCancelOrDeleteSeries,
  handleParseParticipants,
  handleParticipants,
  handleUpdateMeeting,
  handleUpdateMeetingRsvps,
  handleUpdateMeetingSeries,
  handleUpdateMeetingSeriesRsvps,
  handleUpdateParseMeetingInfo,
  handleUpdateRSVPParseMeetingInfo,
  handleUpdateSingleRecurringInstance,
}
