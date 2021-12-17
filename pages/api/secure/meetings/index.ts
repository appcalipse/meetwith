import { NextApiRequest, NextApiResponse } from 'next'
import {
  DBSlotEnhanced,
  MeetingCreationRequest,
} from '../../../../types/Meeting'
import { initDB, saveMeeting } from '../../../../utils/database'
import { withSentry } from '@sentry/nextjs'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_id = req.headers.account as string

    const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

    if (
      meeting.participants_mapping.filter(
        participant => participant.account_id === account_id
      ).length === 0
    ) {
      res.status(403).send('You cant schedule a meeting for someone else')
    }

    const meetingResult: DBSlotEnhanced = await saveMeeting(meeting, account_id)

    res.status(200).json(meetingResult)
    return
  }

  res.status(404).send('Not found')
})
