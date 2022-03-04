import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import { MeetingCreationRequest, ParticipantType } from '../types/Meeting'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
} from './database'
import { newMeetingEmail } from './email_helper'
import { ellipsizeAddress } from './user_manager'

export interface ParticipantInfoForNotification {
  address: string
  timezone: string
  type: ParticipantType
  subscriptions: AccountNotifications
}

export const notifyForNewMeeting = async (
  meeting: MeetingCreationRequest
): Promise<void> => {
  const participants: ParticipantInfoForNotification[] = []

  let participantsDisplay: string[] = []

  for (let i = 0; i < meeting.participants_mapping.length; i++) {
    const participant = meeting.participants_mapping[i]

    if (participant.account_address) {
      const account = await getAccountFromDB(participant.account_address!)
      const subscriptions = await getAccountNotificationSubscriptions(
        account.address
      )
      participants.push({
        address: account.address,
        timezone: account.preferences!.timezone,
        type: participant.type,
        subscriptions,
      })
      participantsDisplay = participants.map(participant =>
        ellipsizeAddress(participant.address)
      )
    } else {
      participantsDisplay.push(participant.guest_email!)
      await newMeetingEmail(
        participant.guest_email!,
        participantsDisplay,
        participant.timeZone!,
        new Date(meeting.start),
        new Date(meeting.end)
      )
    }
  }

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]

    if (
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
        switch (notification_type.channel) {
          case NotificationChannel.EMAIL:
            if (participant.type === ParticipantType.Owner) {
              await newMeetingEmail(
                notification_type.destination,
                participantsDisplay,
                participant.timezone!,
                new Date(meeting.start),
                new Date(meeting.end)
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
