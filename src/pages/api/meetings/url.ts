import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingProvider, TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { RequestParticipantMapping, UrlCreationRequest } from '@/types/Requests'
import {
  createGoogleRoom,
  createHuddleRoom,
  createZoomMeeting,
} from '@/utils/api_helper'
import { getAccountFromDB, getConnectedCalendars } from '@/utils/database'
import { UrlCreationError } from '@/utils/errors'
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
          const googleResponse = await createGoogleRoom()
          url = googleResponse?.url
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
      if (!url) {
        throw new UrlCreationError()
      }

      return res.status(200).json({
        url,
      })
    } catch (error) {
      if (error instanceof UrlCreationError) {
        return res.status(500).json(error.name)
      } else {
        Sentry.captureException(error)
        return res.status(500).json(error)
      }
    }
  }

  return res.status(404).send('Not found')
}

export default handle
