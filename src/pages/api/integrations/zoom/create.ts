import * as Sentry from '@sentry/node'
import { utcToZonedTime } from 'date-fns-tz'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingRepeat } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { UrlCreationRequest } from '@/types/Requests'
import { getAccountsNotificationSubscriptionEmails } from '@/utils/database'
import { getAccessToken, ZOOM_API_URL } from '@/utils/zoom.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const meeting: UrlCreationRequest = req.body as UrlCreationRequest
      const duration =
        (new Date(meeting.end).getTime() - new Date(meeting.start).getTime()) /
        1000 /
        60

      const addresses = meeting.participants_mapping
        .filter(val => val.account_address && !val.guest_email)
        .map(val => val.account_address)

      const validAddresses = addresses.filter(
        (address): address is string => address !== undefined
      )

      const emails =
        await getAccountsNotificationSubscriptionEmails(validAddresses)

      const meeting_invitees = meeting.participants_mapping
        .filter(val => val.guest_email)
        .map(val => val.guest_email)
        .concat(emails)
        .map(email => ({
          email,
        }))

      let owner = meeting.participants_mapping.find(
        participant => participant.type == ParticipantType.Owner
      )

      if (!owner) {
        owner = meeting.participants_mapping.find(
          participant => participant.type == ParticipantType.Scheduler
        )
      }
      if (!owner) {
        return res.status(412).send('No host found')
      }
      const acccount =
        meeting.accounts?.find(
          account => account.address === owner?.account_address
        ) || meeting.accounts?.[0]
      const numberRegex = /\d+/g
      type Json =
        | string
        | number
        | Date
        | undefined
        | boolean
        | null
        | { [key: string]: Json | undefined }
        | Json[]
      const code = meeting.meeting_id.match(numberRegex)?.join('') || Date.now()
      const payload: Record<string, Json> = {
        agenda: meeting.content || meeting.title,
        created_at: new Date(),
        duration,
        dynamic_host_key: code.toString().substring(0, 6),
        pre_schedule: false,
        settings: {
          allow_multiple_devices: true,
          approval_type: 0,
          auto_start_ai_companion_questions: false,
          auto_start_meeting_summary: false,
          calendar_type: 1,
          close_registration: false,
          cn_meeting: false,
          device_testing: false,
          email_notification: true,
          encryption_type: 'enhanced_encryption',
          enforce_login: true,
          focus_mode: true,
          host_save_video_order: true,
          host_video: true,
          in_meeting: false,
          internal_meeting: false,
          jbh_time: 0,
          join_before_host: true,
          meeting_authentication: false,
          meeting_invitees,
          mute_upon_entry: false,
          participant_focused_meeting: false,
          participant_video: false,
          private_meeting: false,
          push_change_to_calendar: false,
          registrants_confirmation_email: true,
          registrants_email_notification: true,
          registration_type: 1,
          show_share_button: true,
          use_pmi: false,
          waiting_room: false,
          watermark: false,
        },
        start_time: meeting.start,
        timezone: acccount?.preferences?.timezone || 'UTC',
        topic: meeting.title,
        type: 2,
      }
      if (
        meeting.meetingRepeat &&
        meeting?.meetingRepeat !== MeetingRepeat.NO_REPEAT
      ) {
        let type!: number
        switch (meeting.meetingRepeat) {
          case MeetingRepeat.DAILY:
            type = 1
            break
          case MeetingRepeat.WEEKLY:
            type = 2
            break
          case MeetingRepeat.MONTHLY:
            type = 3
            break
          default:
            type = 1
            break
        }
        payload['recurrence'] = {
          repeat_interval: 1,
          type,
        }
        if (type === 2) {
          const meetingDate = new Date(meeting.start)

          const timeZone = acccount?.preferences.timezone || 'UTC'

          const zonedDate = utcToZonedTime(meetingDate, timeZone)

          const day_of_week = zonedDate.getDay() + 1

          payload['recurrence']['weekly_days'] = day_of_week
        }
      }
      const raw = JSON.stringify(payload)

      const myHeaders = new Headers()
      myHeaders.append('Content-Type', 'application/json')
      myHeaders.append('Accept', 'application/json')
      myHeaders.append('Authorization', `Bearer ${await getAccessToken()}`)
      const requestOptions = {
        body: raw,
        headers: myHeaders,
        method: 'POST',
      }

      const zoomResponse = await fetch(
        `${ZOOM_API_URL}/users/me/meetings`,
        requestOptions
      )
      const zoomMeeting = await zoomResponse.json()
      if (![200, 201].includes(zoomResponse.status)) {
        Sentry.captureException(zoomResponse.statusText)
        return res.status(503).send('Zoom Unavailable')
      }
      return res.json({
        url: zoomMeeting.join_url,
      })
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Zoom Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
