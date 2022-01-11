import { NotificationChannel } from '../types/AccountNotifications'
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
}

export const notifyForNewMeeting = async (
  meeting: MeetingCreationRequest
): Promise<void> => {
  const participants: ParticipantInfoForNotification[] = []
  for (const participant of meeting.participants_mapping) {
    const account = await getAccountFromDB(participant.account_id)
    participants.push({
      address: account.address,
      timezone: account.preferences!.timezone,
      type: participant.type,
    })
  }

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i]
    const subscriptions = await getAccountNotificationSubscriptions(
      participant.address
    )

    if (subscriptions.notification_types.length > 0) {
      subscriptions.notification_types.forEach((notification_type: any) => {
        switch (notification_type.channel) {
          case NotificationChannel.EMAIL:
            console.log(participant)
            if (participant.type === ParticipantType.Owner) {
              newMeetingEmail(
                notification_type.destination,
                participants.map(participant => participant.address),
                participant.timezone,
                meeting.start,
                meeting.end
              )
            }
            break
          default:
        }
      })
    }
  }
}
