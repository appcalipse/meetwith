import { NextApiRequest, NextApiResponse } from 'next'
import {
  DBSlotEnhanced,
  MeetingCreationRequest,
  ParticipantType,
} from '../../../../types/Meeting'
import { initDB, saveMeeting } from '../../../../utils/database'
import { withSentry } from '@sentry/nextjs';

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_id = req.headers.account as string

    const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

    if (
      meeting.participants.filter(
        participant => participant.account_identifier === account_id
      )[0].type !== ParticipantType.Scheduler
    ) {
      res.status(403).send('You cant schedule a meeting for someone else')
    }

    const meetingResult: DBSlotEnhanced = await saveMeeting(meeting)

    res.status(200).json(meetingResult)
    return
  }

  res.status(404).send('Not found')
})
