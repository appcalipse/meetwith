import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingCreationRequest } from '@/types/Requests'

import { handleMeetingSchedule } from '../../secure/meetings'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.body.scheduler_address
  const meeting: MeetingCreationRequest = req.body as MeetingCreationRequest

  return handleMeetingSchedule(account_address, meeting, req, res)
}

export default withSentry(handle)
