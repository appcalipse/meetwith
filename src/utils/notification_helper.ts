import { format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import { MeetingICS, ParticipantType } from '../types/Meeting'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
} from './database'
import { newMeetingEmail } from './email_helper'
import { sendEPNSNotification } from './epns_helper_production'
import { sendEPNSNotificationStaging } from './epns_helper_staging'
import { dmAccount } from './services/discord_helper'
import { isProAccount } from './subscription_manager'
import { ellipsizeAddress } from './user_manager'

export interface ParticipantInfoForNotification {
  address: string
  name: string
  timezone: string
  type: ParticipantType
  subscriptions: AccountNotifications
}

export const notifyForNewMeeting = async (
  meeting_ics: MeetingICS
): Promise<void> => {
  const participants: ParticipantInfoForNotification[] = []

  let participantsDisplay: string[] = []

  for (let i = 0; i < meeting_ics.meeting.participants_mapping.length; i++) {
    const participant = meeting_ics.meeting.participants_mapping[i]

    if (participant.account_address) {
      const account = await getAccountFromDB(participant.account_address!)
      const subscriptions = await getAccountNotificationSubscriptions(
        account.address
      )
      participants.push({
        address: account.address,
        name: participant.name,
        timezone: account.preferences!.timezone,
        type: participant.type,
        subscriptions,
      })
      participantsDisplay = participants.map(participant => participant.name)
    } else {
      participantsDisplay.push(participant.name)
      await newMeetingEmail(
        participant.guest_email!,
        participantsDisplay,
        participant.timeZone!,
        new Date(meeting_ics.meeting.start),
        new Date(meeting_ics.meeting.end),
        meeting_ics.db_slot.meeting_info_file_path,
        meeting_ics.meeting.meeting_url,
        meeting_ics.db_slot.id,
        meeting_ics.db_slot.created_at
      )
    }
  }

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]

    if (
      (participant.type === ParticipantType.Owner ||
        participant.type === ParticipantType.Invitee) &&
      participant.address &&
      participant.subscriptions.notification_types.length > 0
    ) {
      for (
        let j = 0;
        j < participant.subscriptions.notification_types.length;
        j++
      ) {
        const notification_type =
          participant.subscriptions.notification_types[j]

        if (!notification_type.disabled) {
          switch (notification_type.channel) {
            case NotificationChannel.EMAIL:
              await newMeetingEmail(
                notification_type.destination,
                participantsDisplay,
                participant.timezone!,
                new Date(meeting_ics.meeting.start),
                new Date(meeting_ics.meeting.end),
                meeting_ics.db_slot.meeting_info_file_path,
                meeting_ics.meeting.meeting_url,
                meeting_ics.db_slot.id,
                meeting_ics.db_slot.created_at
              )
              break

            case NotificationChannel.DISCORD:
              const accountForDiscord = await getAccountFromDB(
                participant.address
              )
              if (isProAccount(accountForDiscord)) {
                await dmAccount(
                  participant.address,
                  notification_type.destination,
                  `You got a new meeting dude, and it will be here: ${meeting_ics.meeting.meeting_url}`
                )
              }
              break

            case NotificationChannel.EPNS:
              const accountForEmail = await getAccountFromDB(
                participant.address
              )
              if (isProAccount(accountForEmail)) {
                const parameters = {
                  destination_addresses: [notification_type.destination],
                  title: 'New meeting scheduled',
                  message: `${format(
                    utcToZonedTime(
                      meeting_ics.meeting.start,
                      participant.timezone
                    ),
                    'PPPPpp'
                  )} - ${participants
                    .map(participant => ellipsizeAddress(participant.address))
                    .join(', ')}`,
                }

                process.env.NEXT_PUBLIC_ENV === 'production'
                  ? await sendEPNSNotification(
                      parameters.destination_addresses,
                      parameters.title,
                      parameters.message
                    )
                  : await sendEPNSNotificationStaging(
                      parameters.destination_addresses,
                      parameters.title,
                      parameters.message
                    )
              }
              break
            default:
          }
        }
      }
    }
  }
  return
}
