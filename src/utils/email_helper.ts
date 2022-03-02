import * as Sentry from '@sentry/node'
import { differenceInMinutes, format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import Email from 'email-templates'
import nodemailer from 'nodemailer'
import path from 'path'

import { durationToHumanReadable } from './calendar_manager'
import { ellipsizeAddress } from './user_manager'

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
  end: Date,
  guest_email?: string
): Promise<boolean> => {
  const email = new Email({
    message: {
      from: FROM,
    },
    send: process.env.NEXT_PUBLIC_ENV !== 'local',
    transport: transporter,
  })

  const participants: string[] = []

  if (guest_email && guest_email !== '') {
    participants.push(guest_email)
  }

  participantsDisplayNames.forEach(participant => {
    if (participant !== '') {
      participant = ellipsizeAddress(participant)
      participants.push(participant)
    }
  })

  try {
    await email.send({
      template: path.resolve('src', 'emails', 'new_meeting'),
      message: {
        to: toEmail,
      },
      locals: {
        participantsDisplay: participants.join(', '),
        meeting: {
          start: `${format(
            utcToZonedTime(start, timezone),
            'PPPPpp'
          )} - ${timezone}`,
          duration: durationToHumanReadable(differenceInMinutes(end, start)),
        },
      },
    })
  } catch (err) {
    console.error(err)
    Sentry.captureException(err)
  }

  return true
}
