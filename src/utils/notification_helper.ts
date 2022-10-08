import * as Sentry from '@sentry/nextjs'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import { MeetingICS, ParticipantInfo } from '../types/Meeting'
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

export const notifyForNewMeeting = async (
  meeting_ics: MeetingICS
): Promise<void> => {
  const participantsInfo: ParticipantInfoForNotification[] = await Promise.all(
    meeting_ics.meeting.participants_mapping.map(async map => {
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

  const promises: Promise<boolean>[] = []

  try {
    for (let i = 0; i < participantsInfo.length; i++) {
      const participant = participantsInfo[i]

      if (participant.guest_email) {
        promises.push(
          newMeetingEmail(
            participant.guest_email!,
            participant.type,
            participantsInfo,
            participant.timezone,
            new Date(meeting_ics.meeting.start),
            new Date(meeting_ics.meeting.end),
            meeting_ics.db_slot.meeting_info_file_path,
            undefined,
            meeting_ics.meeting.meeting_url,
            meeting_ics.db_slot.id,
            meeting_ics.db_slot.created_at
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
                  newMeetingEmail(
                    notification_type.destination,
                    participant.type,
                    participantsInfo,
                    participant.timezone,
                    new Date(meeting_ics.meeting.start),
                    new Date(meeting_ics.meeting.end),
                    meeting_ics.db_slot.meeting_info_file_path,
                    participant.account_address,
                    meeting_ics.meeting.meeting_url,
                    participant.slot_id,
                    meeting_ics.db_slot.created_at
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
                        meeting_ics.meeting.start,
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
                      meeting_ics.meeting.start,
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
  const timeout = setTimeout(() => {
    console.error('timedout on notifications')
  }, 7000)

  const notifications = Promise.all(promises)

  await Promise.race([notifications, timeout])
  return
}
