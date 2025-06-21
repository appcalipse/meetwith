import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { DBSlot, SchedulingType } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { MeetingCreationRequest } from '@/types/Requests'
import { registerMeetingSession, saveMeeting } from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const meeting: MeetingCreationRequest = req.body
    const guest = meeting.participants_mapping.filter(
      p =>
        (p.guest_email || p.account_address) &&
        p.type === ParticipantType.Scheduler
    )[0]
    if (meeting.type === SchedulingType.GUEST && !guest) {
      return res.status(500).send('No guest scheduler found')
    }
    if (!meeting.txHash) {
      return res.status(400).send('Transaction hash is required')
    }
    try {
      const meetingResult: DBSlot = await saveMeeting(
        {
          name: guest.name,
          guest_email: guest.guest_email,
        },
        meeting
      )
      await registerMeetingSession(meeting.txHash, meeting.meeting_id)
      return res.status(200).json(meetingResult)
    } catch (e) {
      // TODO: add relevant error handlers everywhere
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingCreationError) {
        return res.status(412).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        return res.status(403).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
