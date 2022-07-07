import sgMail from '@sendgrid/mail'
import * as Sentry from '@sentry/node'
import { differenceInMinutes } from 'date-fns'
import Email from 'email-templates'
import path from 'path'

import { ParticipantInfo } from '../types/Meeting'
import {
  dateToHumanReadable,
  durationToHumanReadable,
  generateIcs,
} from './calendar_manager'
import { getAllParticipantsDisplayName } from './user_manager'

const FROM = 'Meet with Wallet <no_reply@meetwithwallet.xyz>'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export const newMeetingEmail = async (
  toEmail: string,
  participants: ParticipantInfo[],
  timezone: string,
  start: Date,
  end: Date,
  meeting_info_file_path: string,
  forGuest: boolean,
  destinationAccountAddress?: string,
  meetingUrl?: string,
  id?: string | undefined,
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
    },
  }
  const rendered = await email.renderAll(
    `${path.resolve(
      'src',
      'emails',
      `${!forGuest ? 'new_meeting' : 'new_meeting_guest'}`
    )}`,
    locals
  )

  const icsFile = generateIcs(
    {
      meeting_url: meetingUrl as string,
      start: new Date(start),
      end: new Date(end),
      id: id as string,
      created_at: new Date(created_at as Date),
      meeting_info_file_path,
      participants,
    },
    destinationAccountAddress || ''
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
        filename: `meeting_${id}.ics`,
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
