import sgMail from '@sendgrid/mail'
import * as Sentry from '@sentry/node'
import { differenceInMinutes, format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import Email from 'email-templates'
import path from 'path'

import { durationToHumanReadable } from './calendar_manager'

const FROM = 'Meet with Wallet <no_reply@meetwithwallet.xyz>'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export const newMeetingEmail = async (
  toEmail: string,
  participantsDisplayNames: string[],
  timezone: string,
  start: Date,
  end: Date
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
    },
  }

  const rendered = await email.renderAll(
    `${path.resolve('src', 'emails', 'new_meeting')}`,
    locals
  )

  const msg = {
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
