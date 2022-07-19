import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
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
import {
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '../../../../utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_address = req.session.account!.address
    const account = await getAccountFromDB(account_address)

    const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

    if (
      meeting.participants_mapping.filter(
        participant => participant.account_address === account.address
      ).length === 0
    ) {
      res.status(403).send('You cant schedule a meeting for someone else')
      return
    }

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
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
