import * as Sentry from '@sentry/nextjs'
import { differenceInMinutes } from 'date-fns'

import { MeetingReminders } from '@/types/Dashboard'
import { Group, MemberType } from '@/types/Group'
import { appUrl } from '@/utils/constants'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import {
  GroupNotificationType,
  MeetingChangeType,
  MeetingProvider,
  ParticipantMappingType,
} from '../types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '../types/ParticipantInfo'
import { MeetingChange, RequestParticipantMapping } from '../types/Requests'
import {
  dateToHumanReadable,
  durationToHumanReadable,
} from './calendar_manager'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getGroup,
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
import { isProAccount } from './subscription_manager'
import { getAllParticipantsDisplayName } from './user_manager'

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
      timezone: account.preferences.timezone,
    })
  }
  await runPromises(
    await workGroupNotifications(participantsInfo, group, notifyType)
  )

  return
}

export const notifyForMeetingCancellation = async (
  participantActing: ParticipantBaseInfo,
  guestsToRemove: ParticipantInfo[],
  accountsToRemove: string[],
  meeting_id: string,
  start: Date,
  end: Date,
  created_at: Date,
  timezone: string
): Promise<void> => {
  const participantsInfo: ParticipantInfoForNotification[] = []

  for (const guest of guestsToRemove) {
    participantsInfo.push({
      ...guest,
      timezone,
      meeting_id,
      mappingType: ParticipantMappingType.REMOVE,
    })
  }

  for (const address of accountsToRemove) {
    const account = await getAccountFromDB(address)
    participantsInfo.push({
      account_address: address,
      name: account.preferences?.name,
      notifications: await getAccountNotificationSubscriptions(address),
      timezone: account.preferences.timezone,
      type: ParticipantType.Invitee,
      meeting_id,
      status: ParticipationStatus.Rejected,
      mappingType: ParticipantMappingType.REMOVE,
    })
  }

  await runPromises(
    await workNotifications(
      participantActing,
      participantsInfo,
      MeetingChangeType.DELETE,
      start,
      end,
      created_at!,
      ''
    )
  )
}

export const notifyForOrUpdateNewMeeting = async (
  meetingChangeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participants: RequestParticipantMapping[],
  start: Date,
  end: Date,
  created_at: Date,
  meeting_url: string,
  title?: string,
  description?: string,
  changes?: MeetingChange,
  meetingProvider?: MeetingProvider,
  meetingReminders?: Array<MeetingReminders>
): Promise<void> => {
  const participantsInfo = await setupParticipants(participants)

  await runPromises(
    await workNotifications(
      participantActing,
      participantsInfo,
      meetingChangeType,
      start,
      end,
      created_at,
      meeting_url,
      title,
      description,
      changes,
      meetingProvider,
      meetingReminders
    )
  )
}

const setupParticipants = async (
  participants: RequestParticipantMapping[]
): Promise<ParticipantInfoForNotification[]> => {
  const participantsInfo: ParticipantInfoForNotification[] = await Promise.all(
    participants.map(async map => {
      return {
        account_address: map.account_address,
        name: map.name,
        slot_id: map.slot_id,
        timezone: map.timeZone,
        type: map.type,
        guest_email: map.guest_email,
        meeting_id: map.meeting_id,
        notifications: map.account_address
          ? await getAccountNotificationSubscriptions(map.account_address)
          : undefined,
        status: map.status,
        mappingType: map.mappingType!,
      }
    })
  )
  return participantsInfo
}

const workNotifications = async (
  participantActing: ParticipantBaseInfo,
  participantsInfo: ParticipantInfoForNotification[],
  changeType: MeetingChangeType,
  start: Date,
  end: Date,
  created_at: Date,
  meeting_url?: string,
  title?: string,
  description?: string,
  changes?: MeetingChange,
  meetingProvider?: MeetingProvider,
  meetingReminders?: Array<MeetingReminders>
): Promise<Promise<boolean>[]> => {
  const promises: Promise<boolean>[] = []

  try {
    for (let i = 0; i < participantsInfo.length; i++) {
      const participant = participantsInfo[i]

      if (participant.guest_email) {
        promises.push(
          getEmailNotification(
            changeType,
            participantActing,
            participant,
            participantsInfo,
            start,
            end,
            created_at,
            participant.timezone,
            meeting_url,
            title,
            description,
            changes,
            meetingProvider,
            meetingReminders
          )
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
                  getEmailNotification(
                    changeType,
                    participantActing,
                    participant,
                    participantsInfo,
                    start,
                    end,
                    created_at,
                    participant.timezone,
                    meeting_url,
                    title,
                    description,
                    changes
                  )
                )
                break
              case NotificationChannel.DISCORD:
                const accountForDiscord = await getAccountFromDB(
                  participant.account_address
                )
                // Dont DM if you are the person is the one scheduling the meeting
                if (
                  isProAccount(accountForDiscord) &&
                  participantActing.account_address?.toLowerCase() !==
                    participant.account_address.toLowerCase()
                ) {
                  promises.push(
                    getDiscordNotification(
                      changeType,
                      participantActing,
                      participant,
                      start,
                      end,
                      participantsInfo,
                      changes
                    )
                  )
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
  _changeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  participants: ParticipantInfoForNotification[],
  start: Date,
  end: Date,
  created_at: Date,
  timezone: string,
  meeting_url?: string,
  title?: string,
  description?: string,
  changes?: MeetingChange,
  meetingProvider?: MeetingProvider,
  meetingReminders?: Array<MeetingReminders>
): Promise<boolean> => {
  const toEmail =
    participant.guest_email ||
    participant.notifications!.notification_types.filter(
      t => t.channel === NotificationChannel.EMAIL
    )[0]!.destination

  const changeType =
    participant.mappingType === ParticipantMappingType.ADD
      ? MeetingChangeType.CREATE
      : _changeType
  switch (changeType) {
    case MeetingChangeType.CREATE:
      return newMeetingEmail(
        toEmail,
        participant.type,
        participants,
        participant.timezone || timezone,
        new Date(start),
        new Date(end),
        participant.meeting_id,
        participant.slot_id!,
        participant.account_address,
        meeting_url,
        title,
        description,
        created_at,
        meetingProvider,
        meetingReminders
      )
    case MeetingChangeType.DELETE:
      const displayName = getParticipantActingDisplayName(
        participantActing,
        participant
      )
      return cancelledMeetingEmail(
        displayName,
        toEmail,
        participant.timezone,
        new Date(
          changes && changes.dateChange ? changes.dateChange?.oldStart : start
        ),
        new Date(
          changes && changes.dateChange ? changes.dateChange?.oldEnd : end
        ),
        participant.meeting_id,
        participant.account_address,
        '',
        created_at
      )
    case MeetingChangeType.UPDATE:
      return updateMeetingEmail(
        toEmail,
        getParticipantActingDisplayName(participantActing, participant),
        participants,
        participant.timezone || timezone,
        new Date(start),
        new Date(end),
        participant.meeting_id,
        participant.slot_id!,
        participant.account_address,
        meeting_url,
        title,
        description,
        created_at,
        changes,
        meetingProvider,
        meetingReminders
      )
    default:
  }
  return Promise.resolve(false)
}

const getDiscordNotification = async (
  _changeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  start: Date,
  end: Date,
  participantsInfo?: ParticipantInfo[],
  changes?: MeetingChange
): Promise<boolean> => {
  const accountForDiscord = await getAccountFromDB(participant.account_address!)
  if (isProAccount(accountForDiscord)) {
    const changeType =
      participant.mappingType === ParticipantMappingType.ADD
        ? MeetingChangeType.CREATE
        : _changeType

    switch (changeType) {
      case MeetingChangeType.CREATE:
        return dmAccount(
          participant.account_address!,
          participant.notifications!.notification_types.filter(
            n => n.channel === NotificationChannel.DISCORD
          )[0].destination,
          `New meeting scheduled. ${dateToHumanReadable(
            start,
            participant.timezone,
            true
          )} - ${getAllParticipantsDisplayName(
            participantsInfo!,
            participant.account_address
          )}`
        )
      case MeetingChangeType.DELETE:
        return dmAccount(
          participant.account_address!,
          participant.notifications!.notification_types.filter(
            n => n.channel === NotificationChannel.DISCORD
          )[0].destination,
          `Canceled! The meeting at ${dateToHumanReadable(
            changes?.dateChange?.oldStart || start,
            participant.timezone,
            true
          )} has been canceled by ${getParticipantActingDisplayName(
            participantActing,
            participant
          )}`
        )
      case MeetingChangeType.UPDATE:
        if (!changes?.dateChange) {
          return true
        }
        let message = `${getParticipantActingDisplayName(
          participantActing,
          participant
        )} changed the meeting at ${dateToHumanReadable(
          changes!.dateChange!.oldStart,
          participant.timezone,
          true
        )}. It`
        let added = false
        if (
          new Date(changes!.dateChange!.oldStart).getTime() !== start.getTime()
        ) {
          message += ` will be at ${dateToHumanReadable(
            start,
            participant.timezone,
            true
          )}`
          added = true
        }

        const newDuration = differenceInMinutes(end, start)
        const oldDuration = changes?.dateChange
          ? differenceInMinutes(
              new Date(changes?.dateChange?.oldEnd),
              new Date(changes?.dateChange?.oldStart)
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
        return dmAccount(
          participant.account_address!,
          participant.notifications!.notification_types.filter(
            n => n.channel === NotificationChannel.DISCORD
          )[0].destination,
          message
        )
      default:
    }
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
