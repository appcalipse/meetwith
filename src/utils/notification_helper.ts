import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import {
  MeetingICS,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
  SchedulingType,
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
        notifications: map.account_address
          ? await getAccountNotificationSubscriptions(map.account_address)
          : undefined,
        status: ParticipationStatus.Accepted, //will not be used for now
      }
    })
  )

  const ownerParticipant =
    participantsInfo.find(p => p.type === ParticipantType.Owner) || null

  const schedulerParticipant =
    participantsInfo.find(p => p.type === ParticipantType.Scheduler) || null

  const ownerIsNotScheduler = Boolean(
    ownerParticipant &&
      ownerParticipant?.account_address !==
        schedulerParticipant?.account_address
  )

  for (let i = 0; i < participantsInfo.length; i++) {
    const participant = participantsInfo[i]

    if (
      meeting_ics.meeting.type === SchedulingType.GUEST &&
      participant.guest_email
    ) {
      await newMeetingEmail(
        participant.guest_email!,
        participantsInfo,
        participant.timezone,
        new Date(meeting_ics.meeting.start),
        new Date(meeting_ics.meeting.end),
        meeting_ics.db_slot.meeting_info_file_path,
        true,
        undefined,
        meeting_ics.meeting.meeting_url,
        meeting_ics.db_slot.id,
        meeting_ics.db_slot.created_at
      )
    } else if (
      ((participant.type === ParticipantType.Owner && ownerIsNotScheduler) ||
        participant.type === ParticipantType.Invitee) &&
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
              await newMeetingEmail(
                notification_type.destination,
                participantsInfo,
                participant.timezone,
                new Date(meeting_ics.meeting.start),
                new Date(meeting_ics.meeting.end),
                meeting_ics.db_slot.meeting_info_file_path,
                false,
                participant.account_address,
                meeting_ics.meeting.meeting_url,
                participant.slot_id,
                meeting_ics.db_slot.created_at
              )
              break

            case NotificationChannel.DISCORD:
              const accountForDiscord = await getAccountFromDB(
                participant.account_address
              )
              if (isProAccount(accountForDiscord)) {
                await dmAccount(
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
