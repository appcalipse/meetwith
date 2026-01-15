import * as Sentry from '@sentry/nextjs'
import { differenceInMinutes } from 'date-fns'
import Email from 'email-templates'
import path from 'path'
import puppeteer from 'puppeteer'
import { CreateEmailOptions, Resend } from 'resend'

import {
  BillingEmailAccountInfo,
  BillingEmailPeriod,
  BillingEmailPlan,
  PaymentProvider,
} from '@/types/Billing'
import { EditMode, Intents, SettingsSection } from '@/types/Dashboard'
import { Group } from '@/types/Group'
import { MeetingChangeType } from '@/types/Meeting'
import { ParticipantInfo, ParticipantType } from '@/types/ParticipantInfo'
import {
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
} from '@/types/Requests'
import { InvoiceMetadata, ReceiptMetadata } from '@/types/Transactions'
import { ParticipantInfoForInviteNotification } from '@/utils/notification_helper'

import {
  dateToHumanReadable,
  durationToHumanReadable,
  generateIcs,
} from './calendar_manager'
import { appUrl } from './constants'
import { MeetingPermissions } from './constants/schedule'
import { mockEncrypted } from './cryptography'
import { getBillingEmailAccountInfo, getOwnerPublicUrlServer } from './database'
import {
  formatDateForEmail,
  formatDaysRemainingForEmail,
  getDisplayNameForEmail,
} from './email_utils'
import { generateIcsServer } from './services/calendar.backend.helper'
import { getCalendars } from './sync_helper'
import { getAllParticipantsDisplayName } from './user_manager'

const FROM = process.env.FROM_MAIL!

const resend = new Resend(process.env.RESEND_API_KEY)
const defaultResendOptions = {
  from: FROM,
  headers: {
    'List-Unsubscribe': `<${appUrl}/dashboard/settings/${SettingsSection.NOTIFICATIONS}>`,
  },
}

// Helper function to generate change URL for meeting emails
const generateChangeUrl = async (
  destinationAccountAddress: string | undefined,
  ownerAccountAddress: string | undefined,
  meeting_id: string,
  participantType: ParticipantType,
  participants?: ParticipantInfo[],
  meetingTypeId?: string
): Promise<string | undefined> => {
  // For guests, only scheduler gets reschedule link
  if (!destinationAccountAddress) {
    return ownerAccountAddress
      ? participantType === ParticipantType.Scheduler
        ? `${await getOwnerPublicUrlServer(
            ownerAccountAddress,
            meetingTypeId
          )}?conferenceId=${meeting_id}`
        : undefined
      : `${appUrl}/dashboard/schedule?conferenceId=${meeting_id}&intent=${Intents.UPDATE_MEETING}`
  }

  const isGuestScheduling = participants?.some(p => !p.account_address)

  if (isGuestScheduling && participantType === ParticipantType.Owner) {
    return undefined
  }

  return `${appUrl}/dashboard/schedule?conferenceId=${meeting_id}&intent=${Intents.UPDATE_MEETING}`
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
export const sendPollInviteEmail = async (
  toEmail: string,
  inviterName: string,
  pollTitle: string,
  pollSlug: string
): Promise<boolean> => {
  const email = new Email()
  const pollLink = `${appUrl}/poll/${pollSlug}`
  const locals = {
    inviterName,
    pollTitle,
    pollLink,
  }

  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'poll_invite')}`,
    locals
  )

  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: `${inviterName} invited you to participate in "${pollTitle}". View the poll and add your availability here: ${pollLink}`,
    ...defaultResendOptions,
    tags: [
      {
        name: 'quickpoll',
        value: 'invite',
      },
    ],
  }

  try {
    await resend.emails.send(msg)
    return true
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
    return false
  }
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
  slot_id: string,
  meetingDetails: MeetingCreationSyncRequest,
  destinationAccountAddress?: string
): Promise<boolean> => {
  const participants = meetingDetails.participants
  const email = new Email()
  const title = meetingDetails.title
  const description = meetingDetails.content
  const meetingUrl = meetingDetails.meeting_url
  const start = new Date(meetingDetails.start)
  const end = new Date(meetingDetails.end)
  const timezone = meetingDetails.timezone
  const meeting_id = meetingDetails.meeting_id
  const meetingPermissions = meetingDetails.meetingPermissions
  const meetingTypeId = meetingDetails.meeting_type_id

  const isSchedulerOrOwner = [
    ParticipantType.Scheduler,
    ParticipantType.Owner,
  ].includes(participantType)
  const canSeeGuestList =
    meetingPermissions === undefined ||
    !!meetingPermissions?.includes(MeetingPermissions.SEE_GUEST_LIST) ||
    isSchedulerOrOwner

  // Find the owner's account address for generating the public calendar URL
  const ownerParticipant = participants.find(
    p => p.type === ParticipantType.Owner
  )
  const ownerAccountAddress = ownerParticipant?.account_address

  const changeUrl = await generateChangeUrl(
    destinationAccountAddress,
    ownerAccountAddress,
    meeting_id,
    participantType,
    participants,
    meetingTypeId
  )

  const locals = {
    participantsDisplay: getAllParticipantsDisplayName(
      participants,
      destinationAccountAddress,
      canSeeGuestList
    ),
    meeting: {
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(differenceInMinutes(end, start)),
      url: meetingUrl,
      title,
      description,
    },
    // Only include reschedule link for guests
    changeUrl,
    cancelUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.CANCEL_MEETING}`
      : `${appUrl}/meeting/cancel/${meetingDetails.meeting_id}?type=conference`,
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
  let hasCalendarSyncing
  const ownerAddress =
    participants
      .filter(p => p.type === ParticipantType.Owner)
      ?.map(p => p.account_address)
      .filter((p): p is string => !!p) || []
  if (destinationAccountAddress) {
    const accountCalendar = await getCalendars(
      destinationAccountAddress,
      meetingTypeId
    )
    hasCalendarSyncing = accountCalendar.some(val => {
      return val.calendars?.some(cal => cal.enabled && cal.sync)
    })
  } else {
    hasCalendarSyncing = ownerAddress.some(async accountAddress => {
      const accountCalendar = await getCalendars(accountAddress, meetingTypeId)
      return accountCalendar.some(val => {
        return val.calendars?.some(cal => cal.enabled && cal.sync)
      })
    })
  }
  const icsFile = await generateIcsServer(
    meetingDetails,
    destinationAccountAddress || '',
    MeetingChangeType.CREATE,
    changeUrl,
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
  meetingDetails: MeetingCancelSyncRequest,
  destinationAccountAddress: string | undefined
): Promise<boolean> => {
  const start = new Date(meetingDetails.start)
  const end = new Date(meetingDetails.end)
  const title = meetingDetails.title
  const reason = meetingDetails.reason

  const created_at = new Date(meetingDetails.created_at)
  const timezone = meetingDetails.timezone
  const meeting_id = meetingDetails.meeting_id

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
  // Generate ICS file for cancellation meeting participants aren't included in deleted events so this should be efficient
  const icsFile = await generateIcs(
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
  participantType: ParticipantType,
  slot_id: string,
  meetingDetails: MeetingCreationSyncRequest,
  destinationAccountAddress?: string
): Promise<boolean> => {
  const participants = meetingDetails.participants
  const title = meetingDetails.title
  const description = meetingDetails.content
  const meetingUrl = meetingDetails.meeting_url
  const start = new Date(meetingDetails.start)
  const end = new Date(meetingDetails.end)
  const meeting_id = meetingDetails.meeting_id
  const timezone = meetingDetails.timezone
  const meetingPermissions = meetingDetails.meetingPermissions
  const meetingTypeId = meetingDetails.meeting_type_id
  const changes = meetingDetails.changes
  if (!changes?.dateChange) {
    return true
  }
  const isSchedulerOrOwner = [
    ParticipantType.Scheduler,
    ParticipantType.Owner,
  ].includes(participantType)

  const canSeeGuestList =
    meetingPermissions === undefined ||
    !!meetingPermissions?.includes(MeetingPermissions.SEE_GUEST_LIST) ||
    isSchedulerOrOwner

  // Find the owner's account address for generating the public calendar URL
  const ownerParticipant = participants.find(
    p => p.type === ParticipantType.Owner
  )
  const ownerAccountAddress = ownerParticipant?.account_address

  const changeUrl = await generateChangeUrl(
    destinationAccountAddress,
    ownerAccountAddress,
    meeting_id,
    participantType,
    participants,
    meetingTypeId
  )

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
      destinationAccountAddress,
      canSeeGuestList
    ),
    meeting: {
      start: dateToHumanReadable(start, timezone, true),
      duration: durationToHumanReadable(newDuration),
      url: meetingUrl,
      title,
      description,
    },
    // Only include reschedule link for guests
    changeUrl,
    cancelUrl: destinationAccountAddress
      ? `${appUrl}/dashboard/meetings?conferenceId=${meetingDetails.meeting_id}&intent=${Intents.CANCEL_MEETING}`
      : `${appUrl}/meeting/cancel/${meetingDetails.meeting_id}?type=conference`,
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
    participants
      .filter(p => p.type === ParticipantType.Owner)
      ?.map(p => p.account_address)
      .filter((p): p is string => !!p) || []
  if (destinationAccountAddress) {
    const accountCalendar = await getCalendars(
      destinationAccountAddress,
      meetingTypeId
    )
    hasCalendarSyncing = accountCalendar.some(val => {
      return val.calendars?.some(cal => cal.enabled && cal.sync)
    })
  } else {
    hasCalendarSyncing = ownerAddress.some(async accountAddress => {
      const accountCalendar = await getCalendars(accountAddress, meetingTypeId)
      return accountCalendar.some(val => {
        return val.calendars?.some(cal => cal.enabled && cal.sync)
      })
    })
  }
  const icsFile = await generateIcsServer(
    meetingDetails,
    destinationAccountAddress || '',
    MeetingChangeType.UPDATE,
    changeUrl,
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
  invitationLink: string,
  declineLink: string
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
    declineLink,
  }

  try {
    const rendered = await email.render('html', locals)
    const subject = await email.render('subject', locals)

    const msg: CreateEmailOptions = {
      to: toEmail,
      from: FROM,
      subject: subject,
      html: rendered,
      text: `${inviterName} invited you to join their contact list on MeetWith.
            Click here to accept the invitation: ${invitationLink}
          If you weren’t expecting this, you can safely ignore this email.`,
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
const createPdfBuffer = async (html: string): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  })
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'networkidle0' })
  const buffer = await page.pdf({
    format: 'a4',
    printBackground: true,
    preferCSSPageSize: true,
    pageRanges: '1',
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
  })
  await browser.close()
  return buffer
}
export const sendReceiptEmail = async (
  toEmail: string,
  receiptMetadata: ReceiptMetadata
) => {
  const email = new Email({
    views: {
      root: path.resolve('src', 'emails', 'receipt_email'),
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

  const pdf_email = new Email({
    views: {
      root: path.resolve('src', 'emails', 'receipt'),
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
    ...receiptMetadata,
  }

  try {
    const rendered = await email.render('html', locals)
    const subject = await email.render('subject', locals)
    const pdfBuffer: Buffer = await createPdfBuffer(
      await pdf_email.render('html', locals)
    )

    const msg: CreateEmailOptions = {
      to: toEmail,
      subject: subject,
      html: rendered,
      text: `Receipt for your payment: ${receiptMetadata.plan}`,
      ...defaultResendOptions,
      attachments: [
        {
          content: pdfBuffer,
          filename: `receipt-${
            receiptMetadata.transaction_hash || Date.now()
          }.pdf`,
          contentType: 'application/pdf',
        },
      ],
      tags: [
        {
          name: 'receipt',
          value: 'email',
        },
      ],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

// Billing / subscriptions
export const sendSubscriptionConfirmationEmailForAccount = async (
  accountAddress: string,
  billingPlan: BillingEmailPlan,
  registeredAt: Date | string,
  expiryTime: Date | string,
  provider: PaymentProvider,
  transaction?: { amount?: number; currency?: string },
  isTrial?: boolean
): Promise<void> => {
  try {
    const accountInfo = await getBillingEmailAccountInfo(accountAddress)

    if (!accountInfo) {
      return // Silently return if account info not found
    }

    // Process display name for email
    const processedDisplayName = getDisplayNameForEmail(accountInfo.displayName)

    const period: BillingEmailPeriod = {
      registered_at: registeredAt,
      expiry_time: expiryTime,
    }

    await sendSubscriptionConfirmationEmail(
      { ...accountInfo, displayName: processedDisplayName },
      period,
      billingPlan,
      provider,
      transaction,
      isTrial
    )
  } catch (error) {
    Sentry.captureException(error)
  }
}

export const sendSubscriptionConfirmationEmail = async (
  account: BillingEmailAccountInfo,
  period: BillingEmailPeriod,
  billingPlan: BillingEmailPlan,
  provider: PaymentProvider,
  transaction?: { amount?: number; currency?: string },
  isTrial?: boolean
): Promise<void> => {
  const email = new Email()

  const periodStart = formatDateForEmail(period.registered_at)
  const periodEnd = formatDateForEmail(period.expiry_time)

  const manageUrl = `${appUrl}/dashboard/settings/subscriptions`

  const locals = {
    appUrl,
    displayName: getDisplayNameForEmail(account.displayName),
    planName: billingPlan.name,
    price: isTrial ? 0 : transaction?.amount ?? billingPlan.price,
    periodStart,
    periodEnd,
    provider,
    isTrial: isTrial || false,
    manageUrl,
  }

  try {
    const rendered = await email.renderAll(
      path.resolve('src', 'emails', 'billing', 'subscription_confirmation'),
      locals
    )

    const msg: CreateEmailOptions = {
      to: account.email,
      subject: rendered.subject!,
      html: rendered.html!,
      text: rendered.text,
      ...defaultResendOptions,
      tags: [
        { name: 'billing', value: 'subscription_confirmation' },
        { name: 'payment_provider', value: provider },
      ],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendSubscriptionCancelledEmailForAccount = async (
  accountAddress: string,
  billingPlan: BillingEmailPlan,
  registeredAt: Date | string,
  expiryTime: Date | string,
  provider: PaymentProvider
): Promise<void> => {
  try {
    const accountInfo = await getBillingEmailAccountInfo(accountAddress)

    if (!accountInfo) {
      return // Silently return if account info not found
    }

    // Process display name for email
    const processedDisplayName = getDisplayNameForEmail(accountInfo.displayName)

    const period: BillingEmailPeriod = {
      registered_at: registeredAt,
      expiry_time: expiryTime,
    }

    await sendSubscriptionCancelledEmail(
      { ...accountInfo, displayName: processedDisplayName },
      period,
      billingPlan,
      provider
    )
  } catch (error) {
    Sentry.captureException(error)
  }
}

export const sendSubscriptionCancelledEmail = async (
  account: BillingEmailAccountInfo,
  period: BillingEmailPeriod,
  billingPlan: BillingEmailPlan,
  provider: PaymentProvider
): Promise<void> => {
  const email = new Email()

  const periodStart = formatDateForEmail(period.registered_at)
  const periodEnd = formatDateForEmail(period.expiry_time)

  const manageUrl = `${appUrl}/dashboard/settings/subscriptions`

  const locals = {
    appUrl,
    displayName: getDisplayNameForEmail(account.displayName),
    planName: billingPlan.name,
    price: billingPlan.price,
    periodStart,
    periodEnd,
    provider,
    manageUrl,
  }

  try {
    const rendered = await email.renderAll(
      path.resolve('src', 'emails', 'billing', 'subscription_cancelled'),
      locals
    )

    const msg: CreateEmailOptions = {
      to: account.email,
      subject: rendered.subject!,
      html: rendered.html!,
      text: rendered.text,
      ...defaultResendOptions,
      tags: [
        { name: 'billing', value: 'subscription_cancelled' },
        { name: 'payment_provider', value: provider },
      ],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendSubscriptionExpiredEmail = async (
  account: BillingEmailAccountInfo,
  period: BillingEmailPeriod,
  billingPlan: BillingEmailPlan
): Promise<void> => {
  const email = new Email()

  const periodEnd = formatDateForEmail(period.expiry_time)
  const renewUrl = `${appUrl}/dashboard/settings/subscriptions/billing`

  const locals = {
    appUrl,
    displayName: getDisplayNameForEmail(account.displayName),
    periodEnd,
    renewUrl,
    planName: billingPlan.name,
  }

  try {
    const rendered = await email.renderAll(
      path.resolve('src', 'emails', 'billing', 'subscription_expired'),
      locals
    )

    const msg: CreateEmailOptions = {
      to: account.email,
      subject: rendered.subject!,
      html: rendered.html!,
      text: rendered.text,
      ...defaultResendOptions,
      tags: [{ name: 'billing', value: 'subscription_expired' }],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendSubscriptionRenewalDueEmail = async (
  account: BillingEmailAccountInfo,
  period: BillingEmailPeriod,
  billingPlan: BillingEmailPlan,
  daysRemaining: number
): Promise<void> => {
  const email = new Email()

  const periodEnd = formatDateForEmail(period.expiry_time)
  const renewUrl = `${appUrl}/dashboard/settings/subscriptions/billing`

  const locals = {
    appUrl,
    displayName: getDisplayNameForEmail(account.displayName),
    periodEnd,
    renewUrl,
    daysRemaining,
    daysText: formatDaysRemainingForEmail(daysRemaining),
    planName: billingPlan.name,
  }

  try {
    const rendered = await email.renderAll(
      path.resolve('src', 'emails', 'billing', 'subscription_renewal_due'),
      locals
    )

    const msg: CreateEmailOptions = {
      to: account.email,
      subject: rendered.subject!,
      html: rendered.html!,
      text: rendered.text,
      ...defaultResendOptions,
      tags: [{ name: 'billing', value: 'subscription_renewal_due' }],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendCryptoExpiryReminderEmail = async (
  account: BillingEmailAccountInfo,
  period: BillingEmailPeriod,
  billingPlan: BillingEmailPlan,
  daysRemaining: number
): Promise<void> => {
  const email = new Email()

  const periodEnd = formatDateForEmail(period.expiry_time)
  const renewUrl = `${appUrl}/dashboard/settings/subscriptions/billing`

  const locals = {
    appUrl,
    displayName: getDisplayNameForEmail(account.displayName),
    periodEnd,
    renewUrl,
    daysRemaining,
    daysText: formatDaysRemainingForEmail(daysRemaining),
    planName: billingPlan.name,
  }

  try {
    const rendered = await email.renderAll(
      path.resolve('src', 'emails', 'billing', 'subscription_crypto_reminder'),
      locals
    )

    const msg: CreateEmailOptions = {
      to: account.email,
      subject: rendered.subject!,
      html: rendered.html!,
      text: rendered.text,
      ...defaultResendOptions,
      tags: [{ name: 'billing', value: 'subscription_crypto_reminder' }],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendInvoiceEmail = async (
  toEmail: string,
  userName: string,
  receiptMetadata: InvoiceMetadata
) => {
  const email = new Email({
    views: {
      root: path.resolve('src', 'emails', 'invoice_email'),
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
  const pdf_email = new Email({
    views: {
      root: path.resolve('src', 'emails', 'invoice'),
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
    ...receiptMetadata,
  }

  try {
    const rendered = await email.render('html', locals)
    const subject = await email.render('subject', locals)
    const pdfBuffer: Buffer = await createPdfBuffer(
      await pdf_email.render('html', locals)
    )

    const msg: CreateEmailOptions = {
      to: toEmail,
      subject: subject,
      html: rendered,
      text: `Invoice for your payment: ${receiptMetadata.plan}`,
      ...defaultResendOptions,
      attachments: [
        {
          content: pdfBuffer,
          filename: `invoice-${receiptMetadata.plan}-${Date.now()}.pdf`,
          contentType: 'application/pdf',
        },
      ],
      tags: [
        {
          name: 'invoice',
          value: 'email',
        },
      ],
    }

    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
}

export const sendResetPinEmail = async (
  toEmail: string,
  resetUrl: string
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    resetUrl,
    appUrl,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'reset_pin')}`,
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
        name: 'security',
        value: 'reset_pin',
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

export const sendChangeEmailEmail = async (
  toEmail: string,
  changeUrl: string
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    changeUrl,
    appUrl,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'change_email')}`,
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
        name: 'account',
        value: 'change_email',
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

export const sendPinResetSuccessEmail = async (
  toEmail: string
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    appUrl,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'pin_reset_success')}`,
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
        name: 'security',
        value: 'pin_reset_success',
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

export const sendEnablePinEmail = async (
  toEmail: string,
  enableUrl: string
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    enableUrl,
    appUrl,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'enable_pin')}`,
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
        name: 'security',
        value: 'enable_pin',
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

export const sendVerificationCodeEmail = async (
  toEmail: string,
  verificationCode: string
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    verificationCode,
    appUrl,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'verification_code')}`,
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
        name: 'security',
        value: 'verification_code',
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

// New: Crypto debit notification email to sender
export const sendCryptoDebitEmail = async (
  toEmail: string,
  locals: {
    amount: number
    currency: string
    recipientName: string
    transactionId: string
    transactionDate: string
    userName?: string
  }
): Promise<boolean> => {
  const email = new Email()
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'crypto_debit')}`,
    { ...locals, appUrl }
  )
  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    ...defaultResendOptions,
    tags: [{ name: 'wallet', value: 'crypto_debit' }],
  }
  try {
    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
  return true
}
// New: Session booking income notification to host
export const sendSessionBookingIncomeEmail = async (
  toEmail: string,
  locals: {
    amount: number
    currency: string
    senderName: string
    transactionId: string
    transactionDate: string
    userName?: string
  }
): Promise<boolean> => {
  const email = new Email()
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'session_booking_income')}`,
    { ...locals, appUrl }
  )
  const msg: CreateEmailOptions = {
    to: toEmail,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    ...defaultResendOptions,
    tags: [{ name: 'wallet', value: 'session_income' }],
  }
  try {
    await resend.emails.send(msg)
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }
  return true
}

export const sendEmailChangeSuccessEmail = async (
  toEmail: string,
  oldEmail: string,
  newEmail: string,
  userName?: string
): Promise<boolean> => {
  const email = new Email()
  const now = new Date()
  const changeDate = now.toLocaleDateString()
  const changeTime = now.toLocaleTimeString()

  const locals = {
    userName: userName || 'there',
    oldEmail,
    newEmail,
    changeDate,
    changeTime,
    appUrl,
  }
  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'email_change_success')}`,
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
        name: 'security',
        value: 'email_change_success',
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
