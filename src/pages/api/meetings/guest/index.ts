import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { ParticipantType } from '@/types/ParticipantInfo'

import { DBSlotEnhanced, SchedulingType } from '../../../../types/Meeting'
import { MeetingCreationRequest } from '../../../../types/Requests'
import { initDB, saveMeeting } from '../../../../utils/database'
import {
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '../../../../utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    if (req.session.account?.address) {
      const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest
      const guest = meeting.participants_mapping.filter(
        p => p.guest_email && p.type === ParticipantType.Scheduler
      )[0]
      if (meeting.type === SchedulingType.GUEST && !guest) {
        return res.status(500).send('No guest scheduler found')
      }
      try {
        const meetingResult: DBSlotEnhanced = await saveMeeting(
          {
            name: guest.name,
            guest_email: guest.guest_email,
          },
          meeting
        )

        return res.status(200).json(meetingResult)
      } catch (e) {
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
    } else {
      return res.status(503).send("You can't schedule a meeting as guest")
    }
  }
  return res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
