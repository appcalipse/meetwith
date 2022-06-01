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
import { isProAccount } from './subscription_manager'

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
      const namesDisplay = ['You (Scheduler)', ...participantsDisplay]
      participantsDisplay.push(participant.name)

      await newMeetingEmail(
        participant.guest_email!,
        namesDisplay,
        participant.timeZone!,
        new Date(meeting_ics.meeting.start),
        new Date(meeting_ics.meeting.end),
        meeting_ics.db_slot.meeting_info_file_path,
        'new_meeting_guest',
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
        const filterNames = (name: string) => {
          return name !== participant.name
        }
        const filteredNames = participantsDisplay.filter(filterNames)
        const namesDisplay = ['You', ...filteredNames]

        switch (notification_type.channel) {
          case NotificationChannel.EMAIL:
            await newMeetingEmail(
              notification_type.destination,
              namesDisplay,
              participant.timezone!,
              new Date(meeting_ics.meeting.start),
              new Date(meeting_ics.meeting.end),
              meeting_ics.db_slot.meeting_info_file_path,
              'new_meeting',
              meeting_ics.meeting.meeting_url,
              meeting_ics.db_slot.id,
              meeting_ics.db_slot.created_at
            )
            break

          case NotificationChannel.EPNS:
            const account = await getAccountFromDB(participant.address)
            if (isProAccount(account)) {
              const parameters = {
                destination_addresses: [notification_type.destination],
                title: 'New meeting scheduled',
                message: `${format(
                  utcToZonedTime(
                    meeting_ics.meeting.start,
                    participant.timezone
                  ),
                  'PPPPpp'
                )}- ${participant.timezone} - ${namesDisplay.join(', ')}`,
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
  return
}
