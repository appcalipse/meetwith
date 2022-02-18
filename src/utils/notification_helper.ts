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
  for (let i = 0; i < meeting.participants_mapping.length; i++) {
    const participant = meeting.participants_mapping[i]

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
  }

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]

    if (participant.subscriptions.notification_types.length > 0) {
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
                participants.map(participant => participant.address),
                participant.timezone,
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
