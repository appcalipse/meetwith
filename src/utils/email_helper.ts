import sgMail from '@sendgrid/mail'
import * as Sentry from '@sentry/node'
import { differenceInMinutes, format } from 'date-fns'
import { utcToZonedTime } from 'date-fns-tz'
import Email from 'email-templates'
import path from 'path'

import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '../types/Meeting'
import { durationToHumanReadable, generateIcs } from './calendar_manager'

const FROM = 'Meet with Wallet <no_reply@meetwithwallet.xyz>'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

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

  const participants: ParticipantInfo[] = []
  participantsDisplayNames.map(participant => {
    participants.push({
      name: participant,
      slot_id: 'null',
      status: ParticipationStatus.Accepted,
      type: ParticipantType.Guest,
    })
  })
  const icsFile = generateIcs({
    meeting_url: meetingUrl as string,
    start: new Date(utcToZonedTime(start, timezone)),
    end: new Date(end),
    id: id as string,
    created_at: new Date(created_at as Date),
    meeting_info_file_path,
    participants,
  })

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
