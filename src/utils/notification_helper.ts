import * as Sentry from '@sentry/nextjs'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import {
  MeetingChangeType,
  MeetingICS,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
  RequestParticipantMapping,
} from '../types/Meeting'
import { dateToHumanReadable } from './calendar_manager'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
} from './database'
import { newMeetingEmail } from './email_helper'
import { sendEPNSNotification } from './epns_helper_production'
import { sendEPNSNotificationStaging } from './epns_helper_staging'
import { dmAccount } from './services/discord.helper'
import { isProAccount } from './subscription_manager'
import { getAllParticipantsDisplayName } from './user_manager'

export interface ParticipantInfoForNotification extends ParticipantInfo {
  timezone: string
  notifications?: AccountNotifications
}

export const notifyForMeetingCancellation = async (
  guestsToRemove: ParticipantInfo[],
  toRemove: string[],
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

  for (const address of toRemove) {
    const account = await getAccountFromDB(address)
    participantsInfo.push({
      account_address: address,
      name: account.preferences?.name,
      notifications: await getAccountNotificationSubscriptions(address),
      timezone: account.preferences!.timezone,
      type: ParticipantType.Invitee,
      status: ParticipationStatus.Rejected,
      meeting_id,
    })
  }

  await runPromises(
    await workNotifications(
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

export const notifyForMeetingUpdate = async (meeting_ics: MeetingICS) => {}

export const notifyForNewMeeting = async (
  meeting_ics: MeetingICS
): Promise<void> => {
  const participantsInfo = await setupParticipants(
    meeting_ics.meeting.participants_mapping
  )

  await runPromises(
    await workNotifications(
      participantsInfo,
      MeetingChangeType.CREATE,
      meeting_ics.meeting.start,
      meeting_ics.meeting.end,
      meeting_ics.db_slot.created_at!,
      meeting_ics.meeting.meeting_url
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
        meeting_id: map.meeting_id,
      }
    })
  )
  return participantsInfo
}

const workNotifications = async (
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
            participant,
            participantsInfo,
            start,
            end,
            created_at,
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
                    participant,
                    participantsInfo,
                    start,
                    end,
                    created_at,
                    meeting_url
                  )
                )
                break
              case NotificationChannel.DISCORD:
                const accountForDiscord = await getAccountFromDB(
                  participant.account_address
                )
                if (isProAccount(accountForDiscord)) {
                  promises.push(
                    dmAccount(
                      participant.account_address,
                      notification_type.destination,
                      `New meeting scheduled. ${dateToHumanReadable(
                        start,
                        participant.timezone,
                        true
                      )} - ${getAllParticipantsDisplayName(
                        participantsInfo,
                        participant.account_address
                      )}`
                    )
                  )
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
  participant: ParticipantInfoForNotification,
  participants: ParticipantInfoForNotification[],
  start: Date,
  end: Date,
  created_at: Date,
  meeting_url?: string
): Promise<boolean> => {
  switch (changeType) {
    case MeetingChangeType.CREATE:
      return newMeetingEmail(
        participant.notifications!.notification_types.filter(
          t => t.channel === NotificationChannel.EMAIL
        )[0]!.destination,
        participant.type,
        participants,
        participant.timezone,
        new Date(start),
        new Date(end),
        participant.account_address,
        meeting_url,
        participant.meeting_id,
        created_at
      )
      break
    case MeetingChangeType.DELETE:
      //return cancelledMeetingEmail(notification_type.destination)
      break
    case MeetingChangeType.UPDATE:
      //return updatedMeetingEmail()
      break
    default:
  }
  return Promise.resolve(false)
}

const runPromises = async (promises: Promise<boolean>[]) => {
  const timeout = setTimeout(() => {
    console.error('timedout on notifications')
  }, 7000)

  await Promise.race([Promise.all(promises), timeout])
}
