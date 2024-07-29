import sgMail from '@sendgrid/mail'
import * as Sentry from '@sentry/nextjs'
import { differenceInMinutes } from 'date-fns'
import Email from 'email-templates'
import path from 'path'

import { Group } from '@/types/Group'
import { MeetingChangeType } from '@/types/Meeting'
import { MeetingChange } from '@/types/Requests'
import { ParticipantInfoForInviteNotification } from '@/utils/notification_helper'

import { ParticipantInfo, ParticipantType } from '../types/ParticipantInfo'
import {
  dateToHumanReadable,
  durationToHumanReadable,
  generateIcs,
} from './calendar_manager'
import { appUrl } from './constants'
import { mockEncrypted } from './cryptography'
import { getAllParticipantsDisplayName } from './user_manager'

const FROM = 'Meet with Wallet <no_reply@meetwithwallet.xyz>'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
export const newGroupInviteEmail = async (
  toEmail: string,
  participant: ParticipantInfoForInviteNotification,
  group: Group
): Promise<boolean> => {
  const email = new Email()
  const displayName = participant.name || participant.account_address
  const locals = {
    displayName,
    group,
    joinUrl: `${appUrl}/dashboard/group/${group.id}`,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'group_invite')}`,
    locals
  )

  const msg: sgMail.MailDataRequired = {
    to: toEmail,
    from: FROM,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
  }
  try {
    await sgMail.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
  return true
}
export const newGroupRejectEmail = async (
  toEmail: string,
  participant: ParticipantInfoForInviteNotification,
  group: Group
): Promise<boolean> => {
  const email = new Email()
  const displayName = participant.name || participant.account_address
  const locals = {
    displayName,
    group,
    joinUrl: `${appUrl}/dashboard/groups?invite=${group.id}`,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'reject_group_invite')}`,
    locals
  )

  const msg: sgMail.MailDataRequired = {
    to: toEmail,
    from: FROM,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
  }
  try {
    await sgMail.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
  return true
}
export const newMeetingEmail = async (
  toEmail: string,
  participantType: ParticipantType,
  participants: ParticipantInfo[],
  timezone: string,
  start: Date,
  end: Date,
  meeting_id: string,
  slot_id: string,
  destinationAccountAddress: string | undefined,
  meetingUrl?: string,
  title?: string,
  description?: string,
  created_at?: Date
): Promise<boolean> => {
  const email = new Email()

  const locals = {
    participantsDisplay: getAllParticipantsDisplayName(
      participants,
      destinationAccountAddress
    ),
    meeting: {
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(differenceInMinutes(end, start)),
      url: meetingUrl,
      title,
      description,
    },
    changeUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?slotId=${slot_id}`
      : undefined,
  }

  const isScheduler =
    participantType === ParticipantType.Scheduler ||
    (participantType === ParticipantType.Owner &&
      !participants.some(p => p.type === ParticipantType.Scheduler))
  const rendered = await email.renderAll(
    `${path.resolve(
      'src',
      'emails',
      isScheduler ? 'new_meeting_scheduler' : 'new_meeting'
    )}`,
    locals
  )

  const icsFile = generateIcs(
    {
      meeting_url: meetingUrl as string,
      start: new Date(start),
      end: new Date(end),
      id: meeting_id as string,
      meeting_id,
      created_at: new Date(created_at as Date),
      participants,
      version: 0,
      related_slot_ids: [],
      meeting_info_encrypted: mockEncrypted,
      content: description,
    },
    destinationAccountAddress || '',
    MeetingChangeType.CREATE,
    destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?slotId=${slot_id}`
      : undefined,
    false,
    destinationAccountAddress
      ? {
          accountAddress: destinationAccountAddress,
          email: toEmail,
        }
      : undefined
  )

  if (icsFile.error) {
    Sentry.captureException(icsFile.error)
    return false
  }

  const msg: sgMail.MailDataRequired = {
    to: toEmail,
    from: FROM,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    attachments: [
      {
        content: Buffer.from(icsFile.value!).toString('base64'),
        filename: `meeting_${meeting_id}.ics`,
        type: 'text/plain',
        disposition: 'attachment',
      },
    ],
  }

  try {
    await sgMail.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }

  return true
}

export const cancelledMeetingEmail = async (
  currentActorDisplayName: string,
  toEmail: string,
  timezone: string,
  start: Date,
  end: Date,
  meeting_id: string,
  destinationAccountAddress: string | undefined,
  title?: string,
  created_at?: Date
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    currentActorDisplayName,
    meeting: {
      title,
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(differenceInMinutes(end, start)),
    },
  }

  const icsFile = generateIcs(
    {
      meeting_id,
      meeting_url: '',
      start: new Date(start),
      end: new Date(end),
      id: meeting_id,
      created_at: new Date(created_at as Date),
      participants: [],
      version: 0,
      related_slot_ids: [],
      meeting_info_encrypted: mockEncrypted,
    },
    destinationAccountAddress || '',
    MeetingChangeType.DELETE,
    '',
    false,
    destinationAccountAddress
      ? {
          accountAddress: destinationAccountAddress,
          email: toEmail,
        }
      : undefined
  )

  if (icsFile.error) {
    Sentry.captureException(icsFile.error)
    return false
  }

  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'meeting_cancelled')}`,
    locals
  )

  const msg: sgMail.MailDataRequired = {
    to: toEmail,
    from: FROM,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    attachments: [
      {
        content: Buffer.from(icsFile.value!).toString('base64'),
        filename: `meeting_${meeting_id}.ics`,
        type: 'text/plain',
        disposition: 'attachment',
      },
    ],
  }

  try {
    await sgMail.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }

  return true
}

export const updateMeetingEmail = async (
  toEmail: string,
  currentActorDisplayName: string,
  participants: ParticipantInfo[],
  timezone: string,
  start: Date,
  end: Date,
  meeting_id: string,
  slot_id: string,
  destinationAccountAddress: string | undefined,
  meetingUrl?: string,
  title?: string,
  description?: string,
  created_at?: Date,
  changes?: MeetingChange
): Promise<boolean> => {
  if (!changes?.dateChange) {
    return true
  }
  const email = new Email()
  const newDuration = differenceInMinutes(end, start)
  const oldDuration = changes?.dateChange
    ? differenceInMinutes(
        new Date(changes?.dateChange?.oldEnd),
        new Date(changes?.dateChange?.oldStart)
      )
    : null

  const locals = {
    currentActorDisplayName,
    participantsDisplay: getAllParticipantsDisplayName(
      participants,
      destinationAccountAddress
    ),
    meeting: {
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(newDuration),
      url: meetingUrl,
      title,
      description,
    },
    changeUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?slotId=${slot_id}`
      : undefined,
    changes: {
      oldStart:
        changes?.dateChange?.oldStart &&
        new Date(changes.dateChange?.oldStart).getTime() !== start.getTime()
          ? dateToHumanReadable(
              new Date(changes!.dateChange!.oldStart),
              timezone,
              false
            )
          : null,
      oldDuration:
        oldDuration && oldDuration !== newDuration
          ? durationToHumanReadable(oldDuration)
          : null,
    },
  }

  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'meeting_updated')}`,
    locals
  )

  const icsFile = generateIcs(
    {
      meeting_url: meetingUrl as string,
      start: new Date(start),
      end: new Date(end),
      id: meeting_id,
      meeting_id,
      created_at: new Date(created_at as Date),
      participants,
      version: 0,
      related_slot_ids: [],
      meeting_info_encrypted: mockEncrypted,
    },
    destinationAccountAddress || '',
    MeetingChangeType.UPDATE,
    destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?slotId=${slot_id}`
      : undefined,
    false,
    destinationAccountAddress
      ? {
          accountAddress: destinationAccountAddress,
          email: toEmail,
        }
      : undefined
  )

  if (icsFile.error) {
    Sentry.captureException(icsFile.error)
    return false
  }

  const msg: sgMail.MailDataRequired = {
    to: toEmail,
    from: FROM,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    attachments: [
      {
        content: Buffer.from(icsFile.value!).toString('base64'),
        filename: `meeting_${meeting_id}.ics`,
        type: 'text/plain',
        disposition: 'attachment',
      },
    ],
  }

  try {
    await sgMail.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }

  return true
}

export const sendInvitationEmail = async (
  toEmail: string,
  inviterName: string,
  message: string,
  groupId: string,
  group: Group,
  invitationLink: string
): Promise<void> => {
  const email = new Email({
    views: {
      root: path.resolve('src', 'emails', 'group_invite'),
      options: {
        extension: 'pug',
      },
    },
    message: {
      from: FROM,
    },
    send: true,
    transport: {
      jsonTransport: true,
    },
  })

  const locals = {
    inviterName,
    groupName: group.name,
    message,
    invitationLink,
    group,
  }

  try {
    const rendered = await email.render('html', locals)
    const subject = await email.render('subject', locals)

    const msg = {
      to: toEmail,
      from: FROM,
      subject: subject,
      html: rendered,
      text: `${inviterName} invited you to join ${group.name}. Accept your invite here: ${invitationLink}`,
    }

    await sgMail.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}
