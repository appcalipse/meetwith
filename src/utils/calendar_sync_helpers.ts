import { Account } from '@meta/Account'
import { ConferenceMeeting, DBSlot, SchedulingType } from '@meta/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@meta/ParticipantInfo'
import { buildMeetingData, sanitizeParticipants } from '@utils/calendar_manager'
import { diff, intersec } from '@utils/collections'
import { MeetingPermissions } from '@utils/constants/schedule'
import {
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingDetailsModificationDenied,
  MeetingWithYourselfError,
  MultipleSchedulersError,
} from '@utils/errors'
import {
  canAccountAccessPermission,
  isAccountSchedulerOrOwner,
} from '@utils/generic_utils'
import { getAccountDisplayName } from '@utils/user_manager'
import { calendar_v3 } from 'googleapis'
import { DateTime } from 'luxon'
import { v4 as uuidv4 } from 'uuid'

import { RecurringStatus } from '@/types/common'
import { TablesUpdate } from '@/types/Supabase'

import {
  MeetingCreationRequest,
  MeetingCreationSyncRequest,
} from '../types/Requests'
import { apiUrl } from './constants'
import { NO_MEETING_TYPE } from './constants/meeting-types'
import {
  deleteMeetingFromDB,
  findAccountByIdentifier,
  findAccountByNotificationEmail,
  getAccountFromDB,
  getConferenceMeetingFromDB,
  getExistingAccountsFromDB,
  getSlotById,
  getSlotsByIds,
  getSlotSeriesId,
  parseParticipantSlots,
  updateMeeting,
} from './database'
import { checkHasSameScheduleTime } from './date_helper'

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

const extractSlotIdFromDescription = (description: string): string | null => {
  const match = description.match(/meetingId=([a-f0-9-]{36})/i)
  return match ? match[1] : null
}

const extractMeetingDescription = (summaryMessage: string): string | null => {
  const sections = summaryMessage.split('\n\n')

  return sections[0]
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

const handleParticipants = async (
  participants: ParticipantInfo[],
  currentAccount?: Account | null
) => {
  const allAccounts: Account[] = await getExistingAccountsFromDB(
    participants.filter(p => p.account_address).map(p => p.account_address!),
    true
  )

  for (const account of allAccounts) {
    const participant = participants.filter(
      p => p.account_address?.toLowerCase() === account.address.toLowerCase()
    )

    for (const p of participant) {
      p.name = p.name || getAccountDisplayName(account)
      p.status = p.status
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
    throw new MultipleSchedulersError()
  }
  return { sanitizedParticipants, allAccounts }
}

const mapRelatedSlotsWithDBRecords = async (existingSlots: Array<DBSlot>) => {
  const accountSlot: { [account: string]: string } = {}
  for (const slot of existingSlots) {
    if (!slot.id || !slot.account_address) continue
    accountSlot[slot.account_address] = slot.id
  }
  return accountSlot
}

const handleUpdateParseMeetingInfo = async (
  meetingId: string,
  currentAccountAddress: string,
  startTime: Date,
  endTime: Date,
  baseParticipants: calendar_v3.Schema$EventAttendee[],
  content: string,
  meetingUrl?: string,
  meetingTitle?: string,
  isActionRemoveActor?: boolean
) => {
  const existingMeeting = await getConferenceMeetingFromDB(meetingId)
  if (!existingMeeting) {
    console.warn(
      `Skipping event ${meetingId.replace(
        '-',
        ''
      )} ${currentAccountAddress} due to missing meeting in db`
    )
    return
  }
  meetingUrl = meetingUrl || existingMeeting.meeting_url
  meetingTitle = meetingTitle || existingMeeting.title
  const meetingProvider = existingMeeting.provider
  const meetingReminders = existingMeeting.reminders
  const meetingRepeat = existingMeeting.recurrence
  const selectedPermissions = existingMeeting.permissions
  const slotIds = existingMeeting.slots
  const existingSlots = await getSlotsByIds(slotIds)
  if (!existingSlots || existingSlots.length === 0) {
    console.warn(
      `Skipping event ${meetingId.replace('-', '')} due to no slots found`
    )
    return
  }

  const actorSlot = existingSlots.find(
    slot => slot.account_address === currentAccountAddress
  )
  if (!actorSlot) {
    console.warn(
      `Skipping event ${meetingId.replace('-', '')} due to no actor slot found`
    )
    return
  }
  const roleExists = !!actorSlot?.role
  const permissionExists = !!selectedPermissions

  const canEdit =
    isActionRemoveActor ||
    !roleExists ||
    !permissionExists ||
    canAccountAccessPermission(
      selectedPermissions,
      [actorSlot],
      actorSlot?.account_address,
      MeetingPermissions.EDIT_MEETING
    )
  const currentAccount = await getAccountFromDB(currentAccountAddress)

  if (!canEdit) {
    throw new MeetingDetailsModificationDenied()
  }

  const existingMeetingAccounts = existingSlots.map(slot =>
    slot.account_address.toLowerCase()
  )

  let guestSchedulerExists = false
  const determineParticipantType = (
    participant: calendar_v3.Schema$EventAttendee,
    baseParticipants: calendar_v3.Schema$EventAttendee[],
    existingMeetingAccounts: DBSlot[],
    existingSlot?: DBSlot
  ): ParticipantType => {
    if (existingSlot?.role) {
      return existingSlot?.role
    }
    if (
      !existingMeetingAccounts.some(
        slot => slot.role === ParticipantType.Scheduler
      ) &&
      !participant.self &&
      !guestSchedulerExists
    ) {
      guestSchedulerExists = true
      return ParticipantType.Scheduler
    }

    return ParticipantType.Invitee
  }
  // We want a copy we can modify
  const existingMeetingAccountsCopy = [...existingMeetingAccounts]
  let parsedParticipants: Array<ParticipantInfo> = await Promise.all(
    baseParticipants.map(async (val): Promise<ParticipantInfo | undefined> => {
      try {
        // TODO: Get users actual status from their calendar RSVP
        if (!val.email?.includes('meetwith') && !val.self && val.email) {
          const accounts = await findAccountByNotificationEmail(
            actorSlot?.account_address,
            val.email
          )
          const account = accounts?.find(acc => {
            return !existingMeetingAccountsCopy.includes(
              acc.address.toLowerCase()
            )
          })
          return {
            type: determineParticipantType(
              val,
              baseParticipants,
              existingSlots
            ),
            meeting_id: meetingId,
            account_address: account?.address,
            slot_id: uuidv4(),
            status: getParticipationStatus(val.responseStatus || ''),
            name: account?.name || val?.displayName || val.email || '',
            guest_email: !account ? val.email || '' : undefined,
          }
        }
        const accounts = await findAccountByIdentifier(
          val.self ? currentAccountAddress : val.displayName || ''
        )

        const account = accounts?.find(acc => {
          const valueExists = existingMeetingAccountsCopy.includes(
            acc.address.toLowerCase()
          )
          if (valueExists) {
            existingMeetingAccountsCopy.splice(
              existingMeetingAccountsCopy.indexOf(acc.address.toLowerCase()),
              1
            )
          }
          return valueExists
        })
        const slot = existingSlots?.find(
          slot => slot.account_address === account?.address
        )
        return {
          account_address: account?.address,
          type: determineParticipantType(
            val,
            baseParticipants,
            existingSlots,
            slot
          ),
          meeting_id: meetingId,
          slot_id: slot?.id,
          status: getParticipationStatus(val.responseStatus || ''),
          name:
            account?.preferences?.name || val.displayName || account?.address,
          guest_email:
            !val.email?.includes('meetwith') && !account?.address
              ? val.email || ''
              : undefined,
        }
      } catch (e) {
        console.error(e)
      }
    })
  ).then(val => val.filter(p => p !== undefined))
  if (isActionRemoveActor) {
    parsedParticipants = parsedParticipants.filter(
      p =>
        p.account_address?.toLowerCase() !== currentAccountAddress.toLowerCase()
    )
  }
  const toRemove = diff(
    existingMeetingAccounts,
    parsedParticipants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase())
  )

  // those are the users that we need to replace the slot contents
  const toKeep = intersec(existingMeetingAccounts, [
    currentAccountAddress.toLowerCase(),
    ...parsedParticipants
      .filter(p => p.account_address)
      .map(p => p.account_address!.toLowerCase()),
  ])

  const accountSlotMap = await mapRelatedSlotsWithDBRecords(existingSlots)

  const guests = parsedParticipants
    .filter(p => p.guest_email)
    .map(p => p.guest_email!)

  const participantData = await handleParticipants(
    parsedParticipants,
    currentAccount
  )
  const meetingData = await buildMeetingData(
    SchedulingType.REGULAR,
    NO_MEETING_TYPE,
    startTime,
    endTime,
    participantData.sanitizedParticipants,
    participantData.allAccounts,
    [...toKeep, ...guests].reduce<Record<string, string>>((acc, it) => {
      acc[it] = accountSlotMap[it] || it
      return acc
    }, {}),
    meetingProvider,
    currentAccount,
    content,
    meetingUrl,
    meetingId,
    meetingTitle,
    meetingReminders,
    meetingRepeat,
    selectedPermissions
  )
  const payload = {
    ...meetingData,
    slotsToRemove: toRemove.map(it => accountSlotMap[it]),
    version: actorSlot?.version + 1,
    guestsToRemove: [],
    ignoreOwnerAvailability: true,
  }
  const participantActing = participantData.sanitizedParticipants.find(
    p =>
      p.account_address?.toLowerCase() === currentAccountAddress.toLowerCase()
  )
  if (!participantActing) {
    throw new MeetingChangeConflictError()
  }
  return { participantActing, payload, existingMeeting }
}

const updateMeetingServer = async (
  meetingId: string,
  currentAccountAddress: string,
  startTime: Date,
  endTime: Date,
  baseParticipants: calendar_v3.Schema$EventAttendee[],
  content: string,
  meetingUrl?: string,
  meetingTitle?: string
) => {
  const parsedInfo = await handleUpdateParseMeetingInfo(
    meetingId,
    currentAccountAddress,
    startTime,
    endTime,
    baseParticipants,
    content,
    meetingUrl,
    meetingTitle
  )
  if (parsedInfo) {
    return await updateMeeting(parsedInfo.participantActing, parsedInfo.payload)
  }
  return undefined
}

export const handleCancelOrDelete = async (
  meetingId: string,
  currentAccountAddress: string,
  startTime: Date,
  endTime: Date,
  baseParticipants: calendar_v3.Schema$EventAttendee[],
  content: string,
  isRecurring?: boolean,
  eventId?: string
) => {
  const existingMeeting = await getConferenceMeetingFromDB(meetingId)
  if (!existingMeeting) {
    console.warn(
      `Skipping event ${meetingId.replace(
        '-',
        ''
      )} ${currentAccountAddress} due to missing meeting in db`
    )
    return
  }
  const meetingUrl = existingMeeting.meeting_url
  const meetingTitle = existingMeeting.title
  const slotIds = existingMeeting.slots
  const existingSlots = await getSlotsByIds(slotIds)
  if (!existingSlots || existingSlots.length === 0) {
    console.warn(
      `Skipping event ${meetingId.replace('-', '')} due to no slots found`
    )
    return
  }

  const actorSlot = existingSlots.find(
    slot => slot.account_address === currentAccountAddress
  )
  if (!actorSlot) {
    console.warn(
      `Skipping event ${meetingId.replace('-', '')} due to no actor slot found`
    )
    return
  }
  const isSchedulerOrOwner = isAccountSchedulerOrOwner(
    [actorSlot],
    actorSlot?.account_address
  )
  const currentAccount = await getAccountFromDB(currentAccountAddress)
  const participantActing = {
    name: currentAccount?.preferences?.name,
    account_address: currentAccountAddress,
  }
  if (isSchedulerOrOwner) {
    return await deleteMeetingFromDB(
      participantActing,
      slotIds,
      baseParticipants
        .filter(
          participant =>
            !participant.email?.includes('meetwith') &&
            !participant.self &&
            participant.email
        )
        .map(participant => ({
          guest_email: participant.email!,
          status: getParticipationStatus(participant?.responseStatus),
          type: ParticipantType.Invitee,
          meeting_id: meetingId,
        })),
      meetingId,
      currentAccount?.preferences?.timezone || 'UTC',
      undefined,
      meetingTitle,
      eventId
    )
  }
  const parsedInfo = await handleUpdateParseMeetingInfo(
    meetingId,
    currentAccountAddress,
    startTime,
    endTime,
    baseParticipants,
    content,
    meetingUrl,
    meetingTitle,
    true
  )
  if (parsedInfo) {
    return await updateMeeting(parsedInfo.participantActing, parsedInfo.payload)
  }
  return undefined
}

const handleUpdateSingleRecurringInstance = async (
  event: calendar_v3.Schema$Event,
  currentAccountAddress: string,
  isActionRemoveActor?: boolean
): Promise<Array<TablesUpdate<'slot_instance'>> | undefined> => {
  const startTime = event.start?.dateTime
  const endTime = event.end?.dateTime
  if (!event.id || !startTime || !endTime) return
  const meetingId =
    event?.extendedProperties?.private?.meetingId || getBaseEventId(event.id)
  if (!meetingId) {
    console.warn(`Skipping event ${event.id} due to missing  meetingId`)
    return
  }
  const baseParticipants = event.attendees || []
  const description = extractMeetingDescription(event.description || '') || ''
  const meetingUrl = event.location || ''
  const meetingTitle = event.summary || ''
  const eventInstance = await handleUpdateParseMeetingInfo(
    meetingId,
    currentAccountAddress,
    new Date(startTime),
    new Date(endTime),
    baseParticipants,
    description,
    meetingUrl,
    meetingTitle,
    isActionRemoveActor
  )
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
    const version = slots[0]?.version + 1

    const slotToUpdatePromises = slots.map(
      async (slot): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slot.id!)
        return {
          id: slot.id + '_' + timeStamp,
          version: slot.version + 1,
          override_meeting_info_encrypted: slot.meeting_info_encrypted,
          account_address: slot.account_address,
          status: RecurringStatus.MODIFIED,
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          role: slot.role,
          series_id,
        }
      }
    )
    const slotsToRemovePromises = eventInstance?.payload.slotsToRemove.map(
      async (slotId: string): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slotId!)
        const slot = await getSlotById(slotId)
        return {
          id: slotId + '_' + timeStamp,
          version: version + 1,
          status: RecurringStatus.CANCELLED,
          series_id,
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          override_meeting_info_encrypted: null,
          account_address: slot.account_address,
          role: slot.role,
        }
      }
    )
    const slotToUpdate = await Promise.all(slotToUpdatePromises)
    const slotsToRemove = await Promise.all(slotsToRemovePromises)
    handleSendEventNotification(
      eventInstance.payload,
      eventInstance.existingMeeting,
      eventInstance.participantActing,
      currentAccountAddress,
      startTime,
      endTime,
      event.id
    )
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
  const meetingId = getBaseEventId(event.id)
  const description = extractMeetingDescription(event.description || '') || ''
  if (!meetingId) {
    console.warn(`Skipping event ${event.id} due to missing  meetingId`)
    return
  }
  const baseParticipants = event.attendees || []
  const existingMeeting = await getConferenceMeetingFromDB(meetingId)
  if (!existingMeeting) {
    console.warn(
      `Skipping event ${meetingId.replace(
        '-',
        ''
      )} ${currentAccountAddress} due to missing meeting in db`
    )
    return
  }
  const meetingUrl = existingMeeting.meeting_url
  const meetingTitle = existingMeeting.title
  const selectedPermissions = existingMeeting.permissions
  const slotIds = existingMeeting.slots
  const existingSlots = await getSlotsByIds(slotIds)
  if (!existingSlots || existingSlots.length === 0) {
    console.warn(
      `Skipping event ${meetingId.replace('-', '')} due to no slots found`
    )
    return
  }

  const actorSlot = existingSlots.find(
    slot => slot.account_address === currentAccountAddress
  )
  if (!actorSlot) {
    console.warn(
      `Skipping event ${meetingId.replace('-', '')} due to no actor slot found`
    )
    return
  }
  const roleExists = !!actorSlot?.role
  const permissionExists = !!selectedPermissions
  const isSchedulerOrOwner =
    !roleExists ||
    !permissionExists ||
    isAccountSchedulerOrOwner([actorSlot], actorSlot?.account_address)

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
    return await Promise.all(
      existingSlots.map(
        async (slot): Promise<TablesUpdate<'slot_instance'>> => {
          const series_id = await getSlotSeriesId(slot.id!)
          return {
            id: slot.id + '_' + timeStamp,
            version: slot.version + 1,
            status: RecurringStatus.CANCELLED,
            series_id,
            start: new Date(startTime).toISOString(),
            end: new Date(endTime).toISOString(),
            override_meeting_info_encrypted: null,
            account_address: slot.account_address,
            role: slot.role,
          }
        }
      )
    )
  }

  const parsedInfo = await handleUpdateParseMeetingInfo(
    meetingId,
    currentAccountAddress,
    new Date(startTime),
    new Date(endTime),
    baseParticipants,
    description,
    meetingUrl,
    meetingTitle,
    true
  )
  if (parsedInfo) {
    const { slots } = await parseParticipantSlots(
      parsedInfo.participantActing,
      parsedInfo.payload
    )
    const version = actorSlot?.version + 1
    const slotToUpdatePromises = slots.map(
      async (slot): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slot.id!)
        return {
          id: slot.id + '_' + timeStamp,
          version: slot.version + 1,
          override_meeting_info_encrypted: slot.meeting_info_encrypted,
          account_address: slot.account_address,
          status: RecurringStatus.MODIFIED,
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          role: slot.role,
          series_id,
        }
      }
    )
    const slotsToRemovePromises = parsedInfo?.payload.slotsToRemove.map(
      async (slotId: string): Promise<TablesUpdate<'slot_instance'>> => {
        const series_id = await getSlotSeriesId(slotId!)
        const slot = await getSlotById(slotId)
        return {
          id: slotId + '_' + timeStamp,
          version: version + 1,
          status: RecurringStatus.CANCELLED,
          series_id,
          start: new Date(startTime).toISOString(),
          end: new Date(endTime).toISOString(),
          override_meeting_info_encrypted: null,
          account_address: slot.account_address,
          role: slot.role,
        }
      }
    )
    const slotToUpdate = await Promise.all(slotToUpdatePromises)
    const slotsToRemove = await Promise.all(slotsToRemovePromises)
    return slotToUpdate.concat(slotsToRemove)
  }
  return undefined
}
const handleSendEventNotification = (
  payload: MeetingCreationRequest,
  existingMeeting: ConferenceMeeting,
  participantActing: ParticipantBaseInfo,
  currentAccountAddress: string,
  startTime: string,
  endTime: string,
  eventId: string
) => {
  let changingTime = null
  if (
    !(
      checkHasSameScheduleTime(
        new Date(existingMeeting.start),
        new Date(startTime)
      ) &&
      checkHasSameScheduleTime(new Date(existingMeeting.end), new Date(endTime))
    )
  ) {
    const oldStartDateTime = DateTime.fromJSDate(
      new Date(existingMeeting.start)
    )
    const oldEndDateTime = DateTime.fromJSDate(new Date(existingMeeting.end))
    const newStartDateTime = DateTime.fromJSDate(new Date(startTime))
    const newEndDateTime = DateTime.fromJSDate(new Date(endTime))

    changingTime = {
      oldStart: newStartDateTime
        .set({
          hour: oldStartDateTime.hour,
          minute: oldStartDateTime.minute,
          second: oldStartDateTime.second,
          millisecond: oldStartDateTime.millisecond,
        })
        .toJSDate(),
      oldEnd: newEndDateTime
        .set({
          hour: oldEndDateTime.hour,
          minute: oldEndDateTime.minute,
          second: oldEndDateTime.second,
          millisecond: oldEndDateTime.millisecond,
        })
        .toJSDate(),
    }
  }
  const actor = payload.participants_mapping.find(
    p =>
      p.account_address?.toLowerCase() === currentAccountAddress.toLowerCase()
  )
  const notification_hash = actor?.privateInfoHash + startTime + endTime

  const body: MeetingCreationSyncRequest = {
    participantActing: participantActing,
    meeting_id: payload.meeting_id,
    start: payload.start,
    end: payload.end,
    created_at: existingMeeting.created_at,
    timezone: actor?.timeZone || 'UTC',
    meeting_url: payload.meeting_url,
    meetingProvider: payload.meetingProvider,
    participants: payload.participants_mapping,
    title: payload.title,
    content: payload.content,
    changes: changingTime ? { dateChange: changingTime } : undefined,
    meetingReminders: payload.meetingReminders,
    meetingRepeat: payload.meetingRepeat,
    meetingPermissions: payload.meetingPermissions,
    notification_hash,
    eventId,
  }
  // Send notification update as non_blocking event
  fetch(`${apiUrl}/server/meetings/syncAndNotify`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'X-Server-Secret': process.env.SERVER_SECRET!,
      'Content-Type': 'application/json',
    },
  })
}
export {
  extractMeetingDescription,
  extractSlotIdFromDescription,
  getBaseEventId,
  handleCancelOrDeleteForRecurringInstance,
  handleParticipants,
  handleSendEventNotification,
  handleUpdateParseMeetingInfo,
  handleUpdateSingleRecurringInstance,
  updateMeetingServer,
}
