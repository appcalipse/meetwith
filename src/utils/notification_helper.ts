import * as Sentry from '@sentry/nextjs'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import { MeetingChangeType, MeetingICS } from '../types/Meeting'
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
import { cancelledMeetingEmail, newMeetingEmail } from './email_helper'
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

export const notifyForMeetingUpdate = async (
  participantActing: ParticipantBaseInfo,
  meeting_ics: MeetingICS
) => {}

export const notifyForNewMeeting = async (
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
      MeetingChangeType.CREATE,
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
                if (isProAccount(accountForDiscord)) {
                  //TODO
                  promises.push()
                }
                break
              case NotificationChannel.EPNS:
                const accountForEmail = await getAccountFromDB(
                  participant.account_address
                )
                if (isProAccount(accountForEmail)) {
                  const parameters = {
                    destination_addresses: [notification_type.destination],
                    title: 'New meeting scheduled',
                    message: `${dateToHumanReadable(
                      start,
                      participant.timezone,
                      true
                    )} - ${getAllParticipantsDisplayName(
                      participantsInfo,
                      participant.account_address
                    )}`,
                  }

                  process.env.NEXT_PUBLIC_ENV === 'production'
                    ? promises.push(
                        sendEPNSNotification(
                          parameters.destination_addresses,
                          parameters.title,
                          parameters.message
                        )
                      )
                    : promises.push(
                        sendEPNSNotificationStaging(
                          parameters.destination_addresses,
                          parameters.title,
                          parameters.message
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
      //return updatedMeetingEmail()
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
        return dmAccount(
          participant.account_address!,
          participant.notifications!.notification_types.filter(
            n => n.channel === NotificationChannel.DISCORD
          )[0].destination,
          `The meeting at ${dateToHumanReadable(
            start,
            participant.timezone,
            true
          )} has been cancelled by ${participantActing.name}`
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
