import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GuestMeetingCancel } from '@/types/Meeting'
import { MeetingUpdateRequest } from '@/types/Requests'
import {
  getConferenceDataBySlotId,
  handleGuestCancel,
  updateGuestMeeting,
} from '@/utils/database'
import {
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingNotFoundError,
  TimeNotAvailableError,
  UnauthorizedError,
} from '@/utils/errors'

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
  } else if (req.method === 'PATCH') {
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }

    const meeting: MeetingUpdateRequest = req.body as MeetingUpdateRequest
    const guest = meeting.participants_mapping.filter(
      p => p.guest_email && p.type === 'scheduler'
    )[0]

    if (!guest || !guest.guest_email) {
      return res.status(500).send('No guest scheduler found')
    }

    try {
      const meetingResult = await updateGuestMeeting(
        {
          name: guest.name,
          guest_email: guest.guest_email,
        },
        meeting,
        slotId
      )
      return res.status(200).json(meetingResult)
    } catch (e) {
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingCreationError) {
        return res.status(412).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        return res.status(417).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
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
