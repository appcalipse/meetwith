import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  DBSlotEnhanced,
  MeetingCreationRequest,
} from '../../../../types/Meeting'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { initDB, saveMeeting } from '../../../../utils/database'
import {
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '../../../../utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    if (!req.session.account?.address) {
      const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

      try {
        const meetingResult: DBSlotEnhanced = await saveMeeting(meeting)

        res.status(200).json(meetingResult)
      } catch (e) {
        if (e instanceof TimeNotAvailableError) {
          res.status(409).send(e)
        } else if (e instanceof MeetingCreationError) {
          res.status(412).send(e)
        } else if (e instanceof GateConditionNotValidError) {
          res.status(403).send(e)
        } else {
          Sentry.captureException(e)
          res.status(500).send(e)
        }
      }
      return
    } else {
      res.status(503).send('You cant schedule a meeting as guest')
      return
    }
  }
  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
