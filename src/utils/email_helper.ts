import nodemailer from 'nodemailer'
import Email from 'email-templates'
import dayjs from '../utils/dayjs_extender'
import { durationToHumanReadable } from './calendar_manager'
import * as Sentry from '@sentry/node'

const transporter = nodemailer.createTransport({
  host: 'smtppro.zoho.eu',
  port: 465,
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.NEXT_EMAIL_ACCOUNT,
    pass: process.env.NEXT_EMAIL_PASSWORD,
  },
})

const FROM = '"Meet with Wallet" <it_people@meetwithwallet.xyz>'

export const newMeetingEmail = async (
  toEmail: string,
  participantsDisplayNames: string[],
  timezone: string,
  start: Date,
  end: Date
): Promise<boolean> => {
  const email = new Email({
    message: {
      from: FROM,
    },
    // uncomment below to send emails in development/test env:
    // send: true,
    transport: transporter,
  })

  try {
    email.send({
      template: 'new_meeting',
      message: {
        to: toEmail,
      },
      locals: {
        participantsDisplay: participantsDisplayNames.join(', '),
        meeting: {
          start: `${dayjs(start).tz(timezone).format('LLLL')} - ${timezone}`,
          duration: durationToHumanReadable(
            dayjs.tz(end).diff(dayjs(start), 'minute')
          ),
        },
      },
    })
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }

  return true
}
