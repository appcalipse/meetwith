import { Account } from '@meta/Account'
import { DBSlot, SchedulingType } from '@meta/Meeting'
import {
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
import { getAccountDisplayName } from '@utils/user_manager'
import { calendar_v3 } from 'googleapis'
import { v4 as uuidv4 } from 'uuid'

import { NO_MEETING_TYPE } from './constants/meeting-types'
import {
  findAccountByIdentifier,
  getAccountFromDB,
  getConferenceMeetingFromDB,
  getExistingAccountsFromDB,
  getSlotsByIds,
  updateMeeting,
} from './database'

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
const getParticipationStatus = (responseStatus: string | undefined) => {
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

const updateMeetingServer = async (
  meetingId: string,
  currentAccountAddress: string,
  currentAccountEmailAddress: string,
  startTime: Date,
  endTime: Date,
  baseParticipants: calendar_v3.Schema$EventAttendee[],
  content: string,
  meetingUrl?: string,
  meetingTitle?: string
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
  const isSchedulerOrOwner = [
    ParticipantType.Scheduler,
    ParticipantType.Owner,
  ].includes(actorSlot?.role || ParticipantType?.Invitee)
  const canEdit =
    !roleExists ||
    !permissionExists ||
    isSchedulerOrOwner ||
    existingMeeting.permissions?.includes(MeetingPermissions.EDIT_MEETING)
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
  const parsedParticipants: Array<ParticipantInfo> = await Promise.all(
    baseParticipants.map(async (val): Promise<ParticipantInfo | undefined> => {
      try {
        // TODO: Get users actual status from their calendar RSVP
        if (!val.email?.includes('meetwith') && !val.self) {
          return {
            type: determineParticipantType(
              val,
              baseParticipants,
              existingSlots
            ),
            meeting_id: meetingId,
            slot_id: uuidv4(),
            status: getParticipationStatus(val.responseStatus || ''),
            name: val.displayName || val.email || '',
            guest_email: val.email || '',
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
  }
  const participantActing = participantData.sanitizedParticipants.find(
    p =>
      p.account_address?.toLowerCase() === currentAccountAddress.toLowerCase()
  )
  if (!participantActing) {
    throw new MeetingChangeConflictError()
  }
  return await updateMeeting(participantActing, payload)
}

export {
  extractMeetingDescription,
  extractSlotIdFromDescription,
  getBaseEventId,
  handleParticipants,
  updateMeetingServer,
}
