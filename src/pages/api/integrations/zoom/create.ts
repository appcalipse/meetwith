import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

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

      const emails = await getAccountsNotificationSubscriptionEmails(
        validAddresses
      )

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
      const code = meeting.meeting_id.match(numberRegex)?.join('') || Date.now()
      const payload = {
        agenda: meeting.content || meeting.title,
        created_at: new Date(),
        duration,
        pre_schedule: false,
        settings: {
          allow_multiple_devices: true,
          approval_type: 0,
          calendar_type: 1,
          close_registration: false,
          cn_meeting: false,
          email_notification: true,
          encryption_type: 'enhanced_encryption',
          enforce_login: true,
          focus_mode: true,
          host_video: true,
          in_meeting: false,
          jbh_time: 0,
          join_before_host: true,
          meeting_authentication: false,
          mute_upon_entry: false,
          participant_video: false,
          private_meeting: false,
          registrants_confirmation_email: true,
          registrants_email_notification: true,
          registration_type: 1,
          show_share_button: true,
          use_pmi: false,
          waiting_room: false,
          watermark: false,
          host_save_video_order: true,
          internal_meeting: false,
          meeting_invitees,
          participant_focused_meeting: false,
          push_change_to_calendar: false,
          resources: [
            {
              resource_type: 'whiteboard',
              resource_id: 'X4Hy02w3QUOdskKofgb9Jg',
              permission_level: 'editor',
            },
          ],
          auto_start_meeting_summary: false,
          auto_start_ai_companion_questions: false,
          device_testing: false,
        },
        start_time: meeting.start,
        timezone: acccount?.preferences.timezone,
        topic: meeting.title,
        type: 2,
        dynamic_host_key: code.toString().substring(0, 6),
      }
      const raw = JSON.stringify(payload)

      const myHeaders = new Headers()
      myHeaders.append('Content-Type', 'application/json')
      myHeaders.append('Accept', 'application/json')
      myHeaders.append('Authorization', `Bearer ${await getAccessToken()}`)
      const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
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
