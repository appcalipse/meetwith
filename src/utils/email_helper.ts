import sgMail from '@sendgrid/mail'
import * as Sentry from '@sentry/node'
import { differenceInMinutes, format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import Email from 'email-templates'
import { Blob } from 'node:buffer'
import path from 'path'

import { durationToHumanReadable, generateIcs } from './calendar_manager'

const FROM = 'Meet with Wallet <no_reply@meetwithwallet.xyz>'

sgMail.setApiKey(
  process.env.NEXT_PUBLIC_ENV !== 'production'
    ? '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'
    : process.env.SENDGRID_API_KEY!
)

export const newMeetingEmail = async (
  toEmail: string,
  participantsDisplayNames: string[],
  timezone: string,
  start: Date,
  end: Date,
  meeting_info_file_path: string,
  meetingUrl?: string,
  id?: string | undefined,
  created_at?: Date
): Promise<boolean> => {
  const email = new Email()
  const locals = {
    participantsDisplay: participantsDisplayNames.join(', '),
    meeting: {
      start: `${format(
        utcToZonedTime(start, timezone),
        'PPPPpp'
      )} - ${timezone}`,
      duration: durationToHumanReadable(differenceInMinutes(end, start)),
      url: meetingUrl,
    },
  }

  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'new_meeting')}`,
    locals
  )

  const icsFile = generateIcs({
    meeting_url: meetingUrl as string,
    start: utcToZonedTime(start, timezone),
    end,
    id: id as string,
    created_at: created_at as Date,
    meeting_info_file_path,
    participants: [],
  })

  const blob = new Blob([icsFile.value], { type: 'text/plain' })
  const base64content = Buffer.from(await blob.text()).toString('base64')

  const msg: sgMail.MailDataRequired = {
    to: toEmail,
    from: FROM,
    subject: rendered.subject!,
    html: rendered.html!,
    text: rendered.text,
    attachments: [
      {
        content: base64content,
        filename: 'meeting.ics',
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
