import { init, withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  DBSlotEnhanced,
  MeetingCreationRequest,
} from '../../../../types/Meeting'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import {
  getAccountFromDB,
  initDB,
  saveMeeting,
} from '../../../../utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    if (!req.session.account?.address) {
      const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

      const meetingResult: DBSlotEnhanced = await saveMeeting(meeting)

      res.status(200).json(meetingResult)
      return
    } else {
      res.status(503).send('You cant schedule a meeting as guest')
      return
    }
  }
  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
