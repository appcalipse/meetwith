import * as Sentry from '@sentry/nextjs'
import { differenceInMinutes } from 'date-fns'
import Email from 'email-templates'
import path from 'path'

import { MeetingReminders } from '@/types/common'
import { EditMode, Intents } from '@/types/Dashboard'
import { Group } from '@/types/Group'
import {
  MeetingChangeType,
  MeetingProvider,
  MeetingRepeat,
} from '@/types/Meeting'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import { MeetingChange } from '@/types/Requests'
import { getConnectedCalendars } from '@/utils/database'
import { ParticipantInfoForInviteNotification } from '@/utils/notification_helper'

import {
  dateToHumanReadable,
  durationToHumanReadable,
  generateIcs,
} from './calendar_manager'
import { appUrl } from './constants'
import { mockEncrypted } from './cryptography'
import { getAllParticipantsDisplayName } from './user_manager'

const FROM = 'Meetwith <notifications@meetwith.xyz>'

import { CreateEmailOptions, Resend } from 'resend'

import { MeetingPermissions } from './constants/schedule'

const resend = new Resend(process.env.RESEND_API_KEY)
const defaultResendOptions = {
  from: FROM,
  headers: {
    'List-Unsubscribe': `<${appUrl}/dashboard/${EditMode.NOTIFICATIONS}>`,
  },
}
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

  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    ...defaultResendOptions,
    tags: [
      {
        name: 'group',
        value: 'invite',
      },
    ],
  }
  try {
    await resend.emails.send(msg)
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

  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    ...defaultResendOptions,
    tags: [
      {
        name: 'group',
        value: 'reject',
      },
    ],
  }
  try {
    await resend.emails.send(msg)
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
  created_at?: Date,
  meetingProvider?: MeetingProvider,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat?: MeetingRepeat,
  guestInfoEncrypted?: string,
  meetingPermissions?: Array<MeetingPermissions>
): Promise<boolean> => {
  const email = new Email()
  const isScheduler =
    participantType === ParticipantType.Scheduler ||
    (participantType === ParticipantType.Owner &&
      !participants.some(p => p.type === ParticipantType.Scheduler))
  const canSeeGuestList =
    meetingPermissions === undefined ||
    !!meetingPermissions?.includes(MeetingPermissions.SEE_GUEST_LIST)

  const locals = {
    participantsDisplay: canSeeGuestList
      ? getAllParticipantsDisplayName(participants, destinationAccountAddress)
      : undefined,
    meeting: {
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(differenceInMinutes(end, start)),
      url: meetingUrl,
      title,
      description,
    },
    changeUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`
      : undefined,
    cancelUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?slotId=${slot_id}&intent=${Intents.CANCEL_MEETING}`
      : guestInfoEncrypted
      ? `${appUrl}/meeting/cancel/${slot_id}?metadata=${encodeURIComponent(
          guestInfoEncrypted || ''
        )}`
      : undefined,
  }

  const rendered = await email.renderAll(
    `${path.resolve(
      'src',
      'emails',
      isScheduler ? 'new_meeting_scheduler' : 'new_meeting'
    )}`,
    locals
  )
  let hasCalendarSyncing
  const ownerAddress =
    participants.find(p => p.type === ParticipantType.Owner)?.account_address ||
    ''
  if (destinationAccountAddress || ownerAddress) {
    const accountCalendar = await getConnectedCalendars(
      destinationAccountAddress || ownerAddress,
      {
        syncOnly: true,
      }
    )
    hasCalendarSyncing = accountCalendar.some(val => {
      return val.calendars?.some(cal => cal.enabled && cal.sync)
    })
  }
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
      title,
      meeting_info_encrypted: mockEncrypted,
      content: description,
      reminders: meetingReminders,
      recurrence: meetingRepeat,
    },
    destinationAccountAddress || '',
    MeetingChangeType.CREATE,
    destinationAccountAddress
      ? `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`
      : undefined,
    false,
    destinationAccountAddress
      ? {
          accountAddress: destinationAccountAddress,
          email: toEmail,
        }
      : undefined,
    hasCalendarSyncing
  )
  if (icsFile.error) {
    Sentry.captureException(icsFile.error)
    return false
  }
  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    ...defaultResendOptions,
    attachments: [
      {
        content: icsFile.value,
        filename: `meeting_${meeting_id}.ics`,
        contentType: `text/calendar; method=REQUEST; charset=UTF-8; name=meeting_${meeting_id}.ics`,
      },
    ],
    tags: [
      {
        name: 'meeting',
        value: 'new',
      },
    ],
  }

  try {
    await resend.emails.send(msg)
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
  created_at?: Date,
  reason?: string
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    currentActorDisplayName,
    meeting: {
      title,
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(differenceInMinutes(end, start)),
      reason: reason,
    },
  }

  const icsFile = generateIcs(
    {
      meeting_id,
      meeting_url: '',
      title,
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

  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    attachments: [
      {
        content: icsFile.value,
        filename: `meeting_${meeting_id}.ics`,
        contentType: `text/calendar; method=REQUEST; charset=UTF-8; name=meeting_${meeting_id}.ics`,
      },
    ],
    ...defaultResendOptions,
    tags: [
      {
        name: 'meeting',
        value: 'cancelled',
      },
    ],
  }

  try {
    await resend.emails.send(msg)
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
  changes?: MeetingChange,
  meetingProvider?: MeetingProvider,
  meetingReminders?: Array<MeetingReminders>,
  meetingRepeat?: MeetingRepeat,
  guestInfoEncrypted?: string,
  meetingPermissions?: Array<MeetingPermissions>
): Promise<boolean> => {
  if (!changes?.dateChange) {
    return true
  }
  const canSeeGuestList =
    meetingPermissions === undefined ||
    !!meetingPermissions?.includes(MeetingPermissions.SEE_GUEST_LIST)

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
    participantsDisplay: canSeeGuestList
      ? getAllParticipantsDisplayName(participants, destinationAccountAddress)
      : undefined,
    meeting: {
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(newDuration),
      url: meetingUrl,
      title,
      description,
    },
    changeUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`
      : undefined,
    cancelUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?slotId=${slot_id}&intent=${Intents.CANCEL_MEETING}`
      : guestInfoEncrypted
      ? `${appUrl}/meeting/cancel/${slot_id}?metadata=${encodeURIComponent(
          guestInfoEncrypted || ''
        )}`
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
  let hasCalendarSyncing
  const ownerAddress =
    participants.find(p => p.type === ParticipantType.Owner)?.account_address ||
    ''
  if (destinationAccountAddress || ownerAddress) {
    const accountCalendar = await getConnectedCalendars(
      destinationAccountAddress || ownerAddress,
      {
        syncOnly: true,
      }
    )
    hasCalendarSyncing = accountCalendar.some(val => {
      return val.calendars?.some(cal => cal.enabled && cal.sync)
    })
  }
  const icsFile = generateIcs(
    {
      meeting_url: meetingUrl as string,
      start: new Date(start),
      end: new Date(end),
      id: meeting_id,
      meeting_id,
      title,
      created_at: new Date(created_at as Date),
      participants,
      version: 0,
      related_slot_ids: [],
      meeting_info_encrypted: mockEncrypted,
      reminders: meetingReminders,
      recurrence: meetingRepeat,
    },
    destinationAccountAddress || '',
    MeetingChangeType.UPDATE,
    destinationAccountAddress
      ? `${appUrl}/dashboard/schedule?meetingId=${slot_id}&intent=${Intents.UPDATE_MEETING}`
      : undefined,
    false,
    destinationAccountAddress
      ? {
          accountAddress: destinationAccountAddress,
          email: toEmail,
        }
      : undefined,
    hasCalendarSyncing
  )

  if (icsFile.error) {
    Sentry.captureException(icsFile.error)
    return false
  }

  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    ...defaultResendOptions,
    attachments: [
      {
        content: icsFile.value,
        filename: `meeting_${meeting_id}.ics`,
        contentType: `text/calendar; method=REQUEST; charset=UTF-8; name=meeting_${meeting_id}.ics`,
      },
    ],
    tags: [
      {
        name: 'meeting',
        value: 'updated',
      },
    ],
  }

  try {
    await resend.emails.send(msg)
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

    const msg: CreateEmailOptions = {
      to: toEmail,
      subject: subject,
      html: rendered,
      text: `${inviterName} invited you to join ${group.name}. Accept your invite here: ${invitationLink}`,
      ...defaultResendOptions,
      tags: [
        {
          name: 'group',
          value: 'invite',
        },
      ],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendContactInvitationEmail = async (
  toEmail: string,
  inviterName: string,
  invitationLink: string
): Promise<void> => {
  const email = new Email({
    views: {
      root: path.resolve('src', 'emails', 'contact_invite'),
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
    invitationLink,
  }

  try {
    const rendered = await email.render('html', locals)
    const subject = await email.render('subject', locals)

    const msg: CreateEmailOptions = {
      to: toEmail,
      from: FROM,
      subject: subject,
      html: rendered,
      text: `${inviterName} invited as a contact. Accept your invite here: ${invitationLink}`,
      tags: [
        {
          name: 'contact',
          value: 'invite',
        },
      ],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}
