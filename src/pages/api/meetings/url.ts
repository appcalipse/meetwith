import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingProvider, TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { RequestParticipantMapping, UrlCreationRequest } from '@/types/Requests'
import { createHuddleRoom, createZoomMeeting } from '@/utils/api_helper'
import { getAccountFromDB, getConnectedCalendars } from '@/utils/database'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const meeting: UrlCreationRequest = req.body as UrlCreationRequest

  return handleMeetingSchedule(meeting, req, res)
}

export const handleMeetingSchedule = async (
  meeting: UrlCreationRequest,
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method === 'POST') {
    try {
      let url = ''
      switch (meeting.meetingProvider) {
        case MeetingProvider.GOOGLE_MEET:
          let owner = meeting.participants_mapping.filter(
            participant => participant.type == ParticipantType.Owner
          )[0]

          if (!owner) {
            owner = meeting.participants_mapping.filter(
              participant => participant.type == ParticipantType.Scheduler
            )[0]
          }
          if (!owner) {
            return res
              .status(412)
              .send('No owner with connected Google Calendar')
          }
          if (!owner.account_address) {
            return res
              .status(412)
              .send('Owner does not have an account address')
          }
          const account = await getAccountFromDB(owner.account_address)
          const calendars = await getConnectedCalendars(owner.account_address, {
            syncOnly: false,
            activeOnly: true,
          })

          let eventAdded = false
          for (const calendar of calendars) {
            if (eventAdded) break
            if (calendar.provider == TimeSlotSource.GOOGLE) {
              const integration = getConnectedCalendarIntegration(
                calendar.account_address,
                calendar.email,
                calendar.provider,
                calendar.payload
              )

              const promises = []
              for (const innerCalendar of calendar.calendars!) {
                if (innerCalendar.enabled && innerCalendar.sync) {
                  promises.push(
                    integration.createEvent(
                      owner.account_address!,
                      {
                        meeting_url: '',
                        participants:
                          meeting.participants_mapping as RequestParticipantMapping[],
                        title: meeting.title,
                        content: meeting.content,
                        meetingProvider: MeetingProvider.GOOGLE_MEET,
                        participantActing: {}, // actor not needed to generate link
                        meeting_id: meeting.meeting_id,
                        start: new Date(meeting.start),
                        end: new Date(meeting.end),
                        created_at: new Date(),
                        timezone: account.preferences.timezone,
                        meetingReminders: meeting.meetingReminders,
                        meetingRepeat: meeting.meetingRepeat,
                      },
                      new Date(),
                      innerCalendar.calendarId
                    )
                  )
                }
              }
              const results = await Promise.all(promises)
              url = results[0].additionalInfo.hangoutLink
              eventAdded = true
              break
            }
          }
          break
        case MeetingProvider.HUDDLE:
          const huddleResponse = await createHuddleRoom(meeting.title)
          url = huddleResponse?.url
          break
        case MeetingProvider.JITSI_MEET:
          url = `https://meet.jit.si/meetwithwallet/${meeting.meeting_id}`
          break
        case MeetingProvider.ZOOM:
          const zoomResponse = await createZoomMeeting(meeting)
          url = zoomResponse.url
          break
        default:
          break
      }

      return res.status(200).json({
        url,
      })
    } catch (e) {
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default handle
