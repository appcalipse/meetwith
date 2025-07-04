import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GuestMeetingCancel } from '@/types/Meeting'
import { MeetingUpdateRequest } from '@/types/Requests'
import {
  getConferenceDataBySlotId,
  handleGuestCancel,
  updateMeetingForGuest,
} from '@/utils/database'
import { MeetingNotFoundError, UnauthorizedError } from '@/utils/errors'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    if (!req.query.id) {
      return res.status(404).send('Id parameter required')
    }

    try {
      const meeting = await getConferenceDataBySlotId(req.query.id as string)
      if (!meeting) {
        return res.status(404).send('Not found')
      }
      if (meeting.slots) {
        meeting.slots = [] // we don't want other users slots to be exposed
      }
      if (meeting.meeting_url) {
        meeting.meeting_url = '' // we don't want private data to be exposed
      }
      return res.status(200).json(meeting)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  } else if (req.method === 'PUT') {
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }

    const meetingUpdateRequest: MeetingUpdateRequest =
      req.body as MeetingUpdateRequest
    if (!meetingUpdateRequest) {
      return res.status(400).send('Invalid update request')
    }

    try {
      const meetingResult = await updateMeetingForGuest(
        slotId,
        meetingUpdateRequest
      )
      return res.status(200).json(meetingResult)
    } catch (e) {
      Sentry.captureException(e)
      if (e instanceof MeetingNotFoundError) {
        return res.status(404).send(e.message)
      } else if (e instanceof UnauthorizedError) {
        return res.status(401).send(e.message)
      }
      return res.status(500).send(e)
    }
  } else if (req.method === 'DELETE') {
    const { metadata, currentTimezone, reason } = req.body as GuestMeetingCancel
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }
    if (!metadata) {
      return res.status(400).send('Invalid cancel request')
    }

    try {
      await handleGuestCancel(metadata, slotId, currentTimezone, reason)
      return res.status(200).send({ success: true })
    } catch (e) {
      Sentry.captureException(e)
      if (e instanceof MeetingNotFoundError) {
        return res.status(404).send(e.message)
      } else if (e instanceof UnauthorizedError) {
        return res.status(401).send(e.message)
      }
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default handler
