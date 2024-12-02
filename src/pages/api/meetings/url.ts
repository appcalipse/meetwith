import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingProvider } from '@/types/Meeting'
import { UrlCreationRequest } from '@/types/Requests'
import {
  createGoogleRoom,
  createHuddleRoom,
  createZoomMeeting,
} from '@/utils/api_helper'
import {
  GoogleServiceUnavailable,
  Huddle01ServiceUnavailable,
  UrlCreationError,
  ZoomServiceUnavailable,
} from '@/utils/errors'

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
      if (error instanceof Huddle01ServiceUnavailable) {
        return res.status(503).send(error.name)
      }
      if (error instanceof GoogleServiceUnavailable) {
        return res.status(503).send(error.name)
      }
      if (error instanceof ZoomServiceUnavailable) {
        return res.status(503).send(error.name)
      }
      if (error instanceof UrlCreationError) {
        return res.status(500).send(error.name)
      } else {
        Sentry.captureException(error)
        return res.status(500).send(error)
      }
    }
  }

  return res.status(404).send('Not found')
}

export default handle
