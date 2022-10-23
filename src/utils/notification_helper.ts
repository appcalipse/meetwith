import * as Sentry from '@sentry/nextjs'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import { MeetingChangeType } from '../types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '../types/ParticipantInfo'
import { RequestParticipantMapping } from '../types/Requests'
import { dateToHumanReadable } from './calendar_manager'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
} from './database'
import {
  cancelledMeetingEmail,
  newMeetingEmail,
  updateMeetingEmail,
} from './email_helper'
import { sendEPNSNotification } from './epns_helper_production'
import { sendEPNSNotificationStaging } from './epns_helper_staging'
import { dmAccount } from './services/discord.helper'
import { isProAccount } from './subscription_manager'
import { getAllParticipantsDisplayName } from './user_manager'

export interface ParticipantInfoForNotification extends ParticipantInfo {
  timezone: string
  meeting_id: string
  notifications?: AccountNotifications
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
    })
  }

  for (const address of accountsToRemove) {
    const account = await getAccountFromDB(address)
    participantsInfo.push({
      account_address: address,
      name: account.preferences?.name,
      notifications: await getAccountNotificationSubscriptions(address),
      timezone: account.preferences!.timezone,
      type: ParticipantType.Invitee,
      meeting_id,
      status: ParticipationStatus.Rejected,
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

  return
}

export const notifyForOrUpdateNewMeeting = async (
  meetingChangeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participants: RequestParticipantMapping[],
  start: Date,
  end: Date,
  created_at: Date,
  meeting_url: string
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
      meeting_url
    )
  )

  return
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
  meeting_url?: string
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
            meeting_url
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
                    meeting_url
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
                      participantsInfo
                    )
                  )
                }
                break
              case NotificationChannel.EPNS:
                const accountForEPNS = await getAccountFromDB(
                  participant.account_address
                )
                // Dont DM if you are the person is the one scheduling the meeting
                if (
                  isProAccount(accountForEPNS) &&
                  participantActing.account_address?.toLowerCase() !==
                    participant.account_address.toLowerCase()
                ) {
                  promises.push(
                    getEPNSNotification(
                      changeType,
                      notification_type.destination,
                      start,
                      participantActing,
                      participant,
                      participantsInfo
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

const getEmailNotification = async (
  changeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  participants: ParticipantInfoForNotification[],
  start: Date,
  end: Date,
  created_at: Date,
  timezone: string,
  meeting_url?: string
): Promise<boolean> => {
  const toEmail =
    participant.guest_email ||
    participant.notifications!.notification_types.filter(
      t => t.channel === NotificationChannel.EMAIL
    )[0]!.destination

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
        participant.account_address,
        meeting_url,
        created_at
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
        new Date(start),
        new Date(end),
        participant.meeting_id,
        '',
        '',
        created_at
      )
      break
    case MeetingChangeType.UPDATE:
      return updateMeetingEmail(
        toEmail,
        participant.type,
        participants,
        participant.timezone || timezone,
        new Date(start),
        new Date(end),
        participant.meeting_id,
        participant.account_address,
        meeting_url,
        created_at
      )
      break
    default:
  }
  return Promise.resolve(false)
}

const getDiscordNotification = async (
  changeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  start: Date,
  participantsInfo?: ParticipantInfo[]
): Promise<boolean> => {
  const accountForDiscord = await getAccountFromDB(participant.account_address!)
  if (isProAccount(accountForDiscord)) {
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
        const displayName = getParticipantActingDisplayName(
          participantActing,
          participant
        )
        return dmAccount(
          participant.account_address!,
          participant.notifications!.notification_types.filter(
            n => n.channel === NotificationChannel.DISCORD
          )[0].destination,
          `Cancelled! The meeting at ${dateToHumanReadable(
            start,
            participant.timezone,
            true
          )} has been cancelled by ${displayName}`
        )
        break
      case MeetingChangeType.UPDATE:
        //return updatedMeetingEmail()
        break
      default:
    }
  }
  return Promise.resolve(false)
}

const getEPNSNotification = async (
  changeType: MeetingChangeType,
  destination: string,
  meetingStart: Date,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  participantsInfo?: ParticipantInfo[]
): Promise<boolean> => {
  const parameters = {
    destination_addresses: [destination],
    title: '',
    message: '',
  }
  switch (changeType) {
    case MeetingChangeType.CREATE:
      parameters.title = 'New meeting scheduled'
      parameters.message = `${dateToHumanReadable(
        meetingStart,
        participant.timezone,
        true
      )} - ${getAllParticipantsDisplayName(
        participantsInfo!,
        participant.account_address
      )}`
      break
    case MeetingChangeType.DELETE:
      parameters.title = 'A meeting was cancelled'
      parameters.message = `The meeting at ${dateToHumanReadable(
        meetingStart,
        participant.timezone,
        true
      )} was cancelled by - ${getParticipantActingDisplayName(
        participantActing,
        participant
      )}`
      break
    case MeetingChangeType.UPDATE:
      break
    default:
  }

  if (process.env.NEXT_PUBLIC_ENV === 'production') {
    return sendEPNSNotification(
      parameters.destination_addresses,
      parameters.title,
      parameters.message
    )
  } else {
    return sendEPNSNotificationStaging(
      parameters.destination_addresses,
      parameters.title,
      parameters.message
    )
  }
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
