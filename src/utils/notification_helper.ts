import * as Sentry from '@sentry/nextjs'
import { differenceInMinutes } from 'date-fns'

import {
  AccountNotifications,
  NotificationChannel,
} from '../types/AccountNotifications'
import { MeetingChangeType, ParticipantMappingType } from '../types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '../types/ParticipantInfo'
import { MeetingChange, RequestParticipantMapping } from '../types/Requests'
import {
  dateToHumanReadable,
  durationToHumanReadable,
  getAccountDomainUrl,
} from './calendar_manager'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
} from './database'
import {
  cancelledMeetingEmail,
  newMeetingEmail,
  updateMeetingEmail,
} from './email_helper'
import { sendPushNotification } from './push_protocol_helper'
import { dmAccount } from './services/discord.helper'
import { isProAccount } from './subscription_manager'
import { getAllParticipantsDisplayName } from './user_manager'

export interface ParticipantInfoForNotification extends ParticipantInfo {
  timezone: string
  meeting_id: string
  notifications?: AccountNotifications
  mappingType: ParticipantMappingType
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
      mappingType: ParticipantMappingType.REMOVE,
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
      mappingType: ParticipantMappingType.REMOVE,
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
  meeting_url: string,
  title?: string,
  description?: string,
  changes?: MeetingChange
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
      meeting_url,
      title,
      description,
      changes
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
        mappingType: map.mappingType!,
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
  meeting_url?: string,
  title?: string,
  description?: string,
  changes?: MeetingChange
): Promise<Promise<boolean>[]> => {
  const promises: Promise<boolean>[] = []

  const ownerAddress = participantsInfo.filter(
    p => p.type === ParticipantType.Owner
  )[0]?.account_address
  let ownerDomain = undefined
  if (ownerAddress) {
    const account = await getAccountFromDB(ownerAddress)
    ownerDomain = await getAccountDomainUrl(account)
  }
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
            ownerDomain,
            meeting_url,
            title,
            description,
            changes
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
                    ownerDomain,
                    meeting_url,
                    title,
                    description,
                    changes
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
                      end,
                      participantsInfo,
                      changes
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
                      end,
                      participantActing,
                      participant,
                      participantsInfo,
                      changes
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
  _changeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  participants: ParticipantInfoForNotification[],
  start: Date,
  end: Date,
  created_at: Date,
  timezone: string,
  ownerDomain?: string,
  meeting_url?: string,
  title?: string,
  description?: string,
  changes?: MeetingChange
): Promise<boolean> => {
  const toEmail =
    participant.guest_email ||
    participant.notifications!.notification_types.filter(
      t => t.channel === NotificationChannel.EMAIL
    )[0]!.destination

  const changeType =
    participant.mappingType === ParticipantMappingType.ADD
      ? MeetingChangeType.CREATE
      : _changeType
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
        participant.slot_id!,
        ownerDomain,
        participant.account_address,
        meeting_url,
        title,
        description,
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
        new Date(
          changes && changes.dateChange ? changes.dateChange?.oldStart : start
        ),
        new Date(
          changes && changes.dateChange ? changes.dateChange?.oldEnd : end
        ),
        participant.meeting_id,
        '',
        '',
        created_at
      )
    case MeetingChangeType.UPDATE:
      return updateMeetingEmail(
        toEmail,
        getParticipantActingDisplayName(participantActing, participant),
        participants,
        participant.timezone || timezone,
        new Date(start),
        new Date(end),
        participant.meeting_id,
        participant.slot_id!,
        ownerDomain,
        participant.account_address,
        meeting_url,
        title,
        description,
        created_at,
        changes
      )
    default:
  }
  return Promise.resolve(false)
}

const getDiscordNotification = async (
  _changeType: MeetingChangeType,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  start: Date,
  end: Date,
  participantsInfo?: ParticipantInfo[],
  changes?: MeetingChange
): Promise<boolean> => {
  const accountForDiscord = await getAccountFromDB(participant.account_address!)
  if (isProAccount(accountForDiscord)) {
    const changeType =
      participant.mappingType === ParticipantMappingType.ADD
        ? MeetingChangeType.CREATE
        : _changeType

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
          `Canceled! The meeting at ${dateToHumanReadable(
            changes?.dateChange?.oldStart || start,
            participant.timezone,
            true
          )} has been canceled by ${getParticipantActingDisplayName(
            participantActing,
            participant
          )}`
        )
      case MeetingChangeType.UPDATE:
        if (!changes?.dateChange) {
          return true
        }
        let message = `${getParticipantActingDisplayName(
          participantActing,
          participant
        )} changed the meeting at ${dateToHumanReadable(
          changes!.dateChange!.oldStart,
          participant.timezone,
          true
        )}. It`
        let added = false
        if (
          new Date(changes!.dateChange!.oldStart).getTime() !== start.getTime()
        ) {
          message += ` will be at ${dateToHumanReadable(
            start,
            participant.timezone,
            true
          )}`
          added = true
        }

        const newDuration = differenceInMinutes(end, start)
        const oldDuration = changes?.dateChange
          ? differenceInMinutes(
              new Date(changes?.dateChange?.oldEnd),
              new Date(changes?.dateChange?.oldStart)
            )
          : null

        if (oldDuration && newDuration !== oldDuration) {
          if (added) {
            message += ` and will last ${durationToHumanReadable(newDuration)}`
          } else {
            message += ` will now last ${durationToHumanReadable(
              newDuration
            )} instead of ${durationToHumanReadable(oldDuration)}`
          }
        }
        return dmAccount(
          participant.account_address!,
          participant.notifications!.notification_types.filter(
            n => n.channel === NotificationChannel.DISCORD
          )[0].destination,
          message
        )
      default:
    }
  }
  return Promise.resolve(false)
}

const getEPNSNotification = async (
  _changeType: MeetingChangeType,
  destination: string,
  start: Date,
  end: Date,
  participantActing: ParticipantBaseInfo,
  participant: ParticipantInfoForNotification,
  participantsInfo?: ParticipantInfo[],
  changes?: MeetingChange
): Promise<boolean> => {
  const parameters = {
    destination_address: destination,
    title: '',
    message: '',
  }
  const changeType =
    participant.mappingType === ParticipantMappingType.ADD
      ? MeetingChangeType.CREATE
      : _changeType

  switch (changeType) {
    case MeetingChangeType.CREATE:
      parameters.title = 'New meeting scheduled'
      parameters.message = `${dateToHumanReadable(
        start,
        participant.timezone,
        true
      )} - ${getAllParticipantsDisplayName(
        participantsInfo!,
        participant.account_address
      )}`
      break
    case MeetingChangeType.DELETE:
      parameters.title = 'A meeting was canceled'
      parameters.message = `The meeting at ${dateToHumanReadable(
        start,
        participant.timezone,
        true
      )} was canceled by ${getParticipantActingDisplayName(
        participantActing,
        participant
      )}`
      break
    case MeetingChangeType.UPDATE:
      parameters.title = 'A meeting has been changed'

      let message = `${getParticipantActingDisplayName(
        participantActing,
        participant
      )} changed the meeting at ${dateToHumanReadable(
        changes!.dateChange!.oldStart,
        participant.timezone,
        true
      )}. It`
      let added = false
      if (
        new Date(changes!.dateChange!.oldStart).getTime() !== start.getTime()
      ) {
        message += ` will be at ${dateToHumanReadable(
          start,
          participant.timezone,
          true
        )}`
        added = true
      }

      const newDuration = differenceInMinutes(end, start)
      const oldDuration = changes?.dateChange
        ? differenceInMinutes(
            new Date(changes?.dateChange?.oldEnd),
            new Date(changes?.dateChange?.oldStart)
          )
        : null

      if (oldDuration && newDuration !== oldDuration) {
        if (added) {
          message += ` and will last ${durationToHumanReadable(newDuration)}`
        } else {
          message += ` will now last ${durationToHumanReadable(
            newDuration
          )} instead of ${durationToHumanReadable(oldDuration)}`
        }
      }

      parameters.message = message
      break
    default:
  }

  return sendPushNotification(
    parameters.destination_address,
    parameters.title,
    parameters.message
  )
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
