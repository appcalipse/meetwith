import * as Sentry from '@sentry/nextjs'
import { differenceInMinutes } from 'date-fns'

import { Group } from '@/types/Group'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import {
  GroupNotificationType,
  MeetingChangeType,
  ParticipantMappingType,
} from '../types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '../types/ParticipantInfo'
import {
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
  RequestParticipantMapping,
} from '../types/Requests'
import {
  dateToHumanReadable,
  durationToHumanReadable,
} from './calendar_manager'
import { MeetingPermissions } from './constants/schedule'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getGroupInternal,
} from './database'
import {
  cancelledMeetingEmail,
  newGroupInviteEmail,
  newGroupRejectEmail,
  newMeetingEmail,
  updateMeetingEmail,
} from './email_helper'
import { dmAccount } from './services/discord.helper'
import { sendDm } from './services/telegram.helper'
import { isProAccount } from './subscription_manager'
import { getAllParticipantsDisplayName } from './user_manager'
import { EmailQueue } from './workers/email.queue'
export interface ParticipantInfoForNotification extends ParticipantInfo {
  timezone: string
  meeting_id: string
  notifications?: AccountNotifications
  mappingType: ParticipantMappingType
}
export interface ParticipantInfoForInviteNotification
  extends ParticipantBaseInfo {
  timezone: string
  notifications?: AccountNotifications
}
type EmailNotificationRequest =
  | {
      changeType: MeetingChangeType.CREATE | MeetingChangeType.UPDATE
      meetingDetails: MeetingCreationSyncRequest
    }
  | {
      changeType: MeetingChangeType.DELETE
      meetingDetails: MeetingCancelSyncRequest
    }
export const emailQueue = new EmailQueue()

export const notifyForGroupInviteJoinOrReject = async (
  accountsToNotify: string[],
  group_id: string,
  notifyType: GroupNotificationType
): Promise<void> => {
  const participantsInfo: ParticipantInfoForInviteNotification[] = []
  const group = await getGroupInternal(group_id)

  for (const address of accountsToNotify) {
    const account = await getAccountFromDB(address)
    participantsInfo.push({
      account_address: address,
      name: account.preferences?.name,
      notifications: await getAccountNotificationSubscriptions(address),
      timezone: account.preferences.timezone || 'UTC',
    })
  }
  await runPromises(
    await workGroupNotifications(participantsInfo, group, notifyType)
  )

  return
}
export const notifyForMeetingCancellation = async (
  meetingDetails: MeetingCancelSyncRequest
): Promise<void> => {
  const participantsInfo: ParticipantInfoForNotification[] = []

  for (const guest of meetingDetails.guestsToRemove) {
    participantsInfo.push({
      ...guest,
      mappingType: ParticipantMappingType.REMOVE,
      meeting_id: meetingDetails.meeting_id,
      timezone: meetingDetails.timezone,
    })
  }

  for (const address of meetingDetails.addressesToRemove) {
    const account = await getAccountFromDB(address)
    participantsInfo.push({
      account_address: address,
      mappingType: ParticipantMappingType.REMOVE,
      meeting_id: meetingDetails.meeting_id,
      name: account.preferences?.name,
      notifications: await getAccountNotificationSubscriptions(address),
      status: ParticipationStatus.Rejected,
      timezone: account.preferences.timezone || 'UTC',
      type: ParticipantType.Invitee,
    })
  }

  await runPromises(
    await workNotifications(participantsInfo, {
      changeType: MeetingChangeType.DELETE,
      meetingDetails,
    })
  )
}

export const notifyForOrUpdateNewMeeting = async (
  meetingChangeType: MeetingChangeType.CREATE | MeetingChangeType.UPDATE,
  meetingDetails: MeetingCreationSyncRequest
): Promise<void> => {
  const participantsInfo = await setupParticipants(meetingDetails.participants)

  await runPromises(
    await workNotifications(participantsInfo, {
      changeType: meetingChangeType,
      meetingDetails,
    })
  )
}

const setupParticipants = async (
  participants: RequestParticipantMapping[]
): Promise<ParticipantInfoForNotification[]> => {
  const participantsInfo: ParticipantInfoForNotification[] = await Promise.all(
    participants.map(async map => {
      return {
        account_address: map.account_address,
        guest_email: map.guest_email,
        mappingType: map.mappingType!,
        meeting_id: map.meeting_id,
        name: map.name,
        notifications: map.account_address
          ? await getAccountNotificationSubscriptions(map.account_address)
          : undefined,
        slot_id: map.slot_id,
        status: map.status,
        timezone: map.timeZone,
        type: map.type,
      }
    })
  )
  return participantsInfo
}

const workNotifications = async (
  participantsInfo: ParticipantInfoForNotification[],
  request: EmailNotificationRequest
): Promise<Promise<boolean>[]> => {
  const promises: Promise<boolean>[] = []
  try {
    for (let i = 0; i < participantsInfo.length; i++) {
      const participant = participantsInfo[i]
      if (participant.mappingType === ParticipantMappingType.ADD) {
        request.changeType = MeetingChangeType.CREATE
      }
      if (participant.guest_email) {
        promises.push(
          emailQueue.add(() => getEmailNotification(request, participant))
        )
      } else if (
        participant.account_address &&
        participant.notifications &&
        participant.notifications?.notification_types.length > 0
      ) {
        for (
          let j = 0;
          j < participant.notifications.notification_types.length;
          j++
        ) {
          const notification_type =
            participant.notifications.notification_types[j]
          if (!notification_type.disabled) {
            switch (notification_type.channel) {
              case NotificationChannel.EMAIL:
                promises.push(
                  emailQueue.add(() =>
                    getEmailNotification(request, participant)
                  )
                )
                break
              case NotificationChannel.DISCORD:
                // Dont DM if you are the person is the one scheduling the meeting
                if (
                  request.meetingDetails.participantActing.account_address?.toLowerCase() !==
                  participant.account_address.toLowerCase()
                ) {
                  promises.push(getDiscordNotification(request, participant))
                }
                break
              case NotificationChannel.TELEGRAM:
                //TODO: FIX
                promises.push(getTelegramNotification(request, participant))
                break
              default:
            }
          }
        }
      }
    }
  } catch (error) {
    Sentry.captureException(error)
  }
  return promises
}
const workGroupNotifications = async (
  participantsInfo: ParticipantInfoForInviteNotification[],
  group: Group,
  notifyType: GroupNotificationType
): Promise<Promise<boolean>[]> => {
  const promises: Promise<boolean>[] = []

  try {
    for (const participant of participantsInfo) {
      if (
        participant.account_address &&
        participant.notifications &&
        participant.notifications?.notification_types.length > 0
      ) {
        for (const notification_type of participant.notifications
          .notification_types) {
          if (!notification_type.disabled) {
            switch (notification_type.channel) {
              case NotificationChannel.EMAIL:
                promises.push(
                  getGroupEmailNotification(participant, group, notifyType)
                )
                break
              case NotificationChannel.DISCORD:
                const accountForDiscord = await getAccountFromDB(
                  participant.account_address
                )
                // Dont DM if you are the person is the one scheduling the meeting
                if (isProAccount(accountForDiscord)) {
                }
                break
              default:
            }
          }
        }
      }
    }
  } catch (error) {
    Sentry.captureException(error)
  }
  return promises
}
const getGroupEmailNotification = async (
  participant: ParticipantInfoForInviteNotification,
  group: Group,
  notifyType?: GroupNotificationType
) => {
  const toEmail =
    participant.guest_email ||
    participant.notifications!.notification_types.filter(
      t => t.channel === NotificationChannel.EMAIL
    )[0]!.destination
  switch (notifyType) {
    case GroupNotificationType.INVITE:
      return newGroupInviteEmail(toEmail, participant, group)
    case GroupNotificationType.REJECT:
      return newGroupRejectEmail(toEmail, participant, group)
    default:
  }
  return Promise.resolve(false)
}
const getEmailNotification = async (
  request: EmailNotificationRequest,
  participant: ParticipantInfoForNotification
): Promise<boolean> => {
  const toEmail =
    participant.guest_email ||
    participant.notifications!.notification_types.filter(
      t => t.channel === NotificationChannel.EMAIL
    )[0]!.destination
  const participantActing = request.meetingDetails.participantActing

  const changeType = request.changeType
  switch (changeType) {
    case MeetingChangeType.CREATE:
      return newMeetingEmail(
        toEmail,
        participant.type,
        participant.slot_id!,
        request.meetingDetails,
        participant.account_address
      )
    case MeetingChangeType.DELETE:
      const displayName = getParticipantActingDisplayName(
        participantActing,
        participant
      )
      return cancelledMeetingEmail(
        displayName,
        toEmail,
        request.meetingDetails,
        participant.account_address
      )
    case MeetingChangeType.UPDATE:
      return updateMeetingEmail(
        toEmail,
        getParticipantActingDisplayName(participantActing, participant),
        participant.type,
        participant.meeting_id,
        request.meetingDetails,
        participant.account_address
      )
    default:
  }
  return Promise.resolve(false)
}

const getNotificationMessage = async (
  request: EmailNotificationRequest,
  participant: ParticipantInfoForNotification
): Promise<string> => {
  const start = new Date(request.meetingDetails.start)
  const end = new Date(request.meetingDetails.end)
  const accountForDiscord = await getAccountFromDB(participant.account_address!)
  if (isProAccount(accountForDiscord)) {
    const changeType = request.changeType

    const isSchedulerOrOwner = [
      ParticipantType.Scheduler,
      ParticipantType.Owner,
    ].includes(participant.type)

    let message
    let actor
    switch (changeType) {
      case MeetingChangeType.CREATE:
        const meetingPermissions = request.meetingDetails.meetingPermissions
        const canSeeGuestList =
          meetingPermissions === undefined ||
          !!meetingPermissions?.includes(MeetingPermissions.SEE_GUEST_LIST) ||
          isSchedulerOrOwner
        message = `New meeting scheduled. ${dateToHumanReadable(
          start,
          participant.timezone,
          true
        )} - ${getAllParticipantsDisplayName(
          request.meetingDetails.participants,
          participant.account_address,
          canSeeGuestList
        )}`

        return message
      case MeetingChangeType.DELETE:
        actor = getParticipantActingDisplayName(
          request.meetingDetails.participantActing,
          participant
        )
        return `Canceled! The meeting at ${dateToHumanReadable(
          start,
          participant.timezone,
          true
        )} has been canceled by ${actor}.`
      case MeetingChangeType.UPDATE:
        if (!request.meetingDetails.changes?.dateChange) {
          return ''
        }
        actor = getParticipantActingDisplayName(
          request.meetingDetails.participantActing,
          participant
        )
        message = `${actor} changed the meeting at ${dateToHumanReadable(
          request.meetingDetails.changes!.dateChange!.oldStart,
          participant.timezone,
          true
        )}. It`
        let added = false
        if (
          new Date(
            request.meetingDetails.changes!.dateChange!.oldStart
          ).getTime() !== start.getTime()
        ) {
          message += ` will be at ${dateToHumanReadable(
            start,
            participant.timezone,
            true
          )}`
          added = true
        }

        const newDuration = differenceInMinutes(end, start)
        const oldDuration = request.meetingDetails.changes?.dateChange
          ? differenceInMinutes(
              new Date(request.meetingDetails.changes?.dateChange?.oldEnd),
              new Date(request.meetingDetails.changes?.dateChange?.oldStart)
            )
          : null

        if (oldDuration && newDuration !== oldDuration) {
          if (added) {
            message += ` and will last ${durationToHumanReadable(newDuration)}`
          } else {
            message += ` will now last ${durationToHumanReadable(
              newDuration
            )} instead of ${durationToHumanReadable(oldDuration)}`
          }
        }
        return message
      default:
        return ''
    }
  }
  return ''
}
const getDiscordNotification = async (
  request: EmailNotificationRequest,
  participant: ParticipantInfoForNotification
): Promise<boolean> => {
  const message = await getNotificationMessage(request, participant)
  if (message) {
    return dmAccount(
      participant.account_address!,
      participant.notifications!.notification_types.filter(
        n => n.channel === NotificationChannel.DISCORD
      )[0].destination,
      message
    )
  }
  return Promise.resolve(false)
}
const getTelegramNotification = async (
  request: EmailNotificationRequest,
  participant: ParticipantInfoForNotification
): Promise<boolean> => {
  const message = await getNotificationMessage(request, participant)
  const destination = participant.notifications!.notification_types.filter(
    n => n.channel === NotificationChannel.TELEGRAM
  )[0].destination
  if (message) {
    return sendDm(destination, message)
  }
  return Promise.resolve(false)
}

const getParticipantActingDisplayName = (
  participantActing: ParticipantBaseInfo,
  currentParticipant: ParticipantInfoForNotification
): string => {
  if (participantActing.guest_email) {
    if (participantActing.guest_email === currentParticipant.guest_email) {
      return 'You'
    } else {
      return participantActing.name || participantActing.guest_email
    }
  } else if (
    participantActing.account_address === currentParticipant.account_address
  ) {
    return 'You'
  } else {
    return participantActing.name || participantActing.account_address!
  }
}

const runPromises = async (promises: Promise<boolean>[]) => {
  const timeout = setTimeout(() => {
    console.error('timed out on notifications')
  }, 7000)

  await Promise.race([Promise.all(promises), timeout])
}
