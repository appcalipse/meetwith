import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { selectTeamMeetingRequest } from '../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query

    const teamMeetingRequest = await selectTeamMeetingRequest(id as string)
    if (teamMeetingRequest) {
      res.status(200).json(teamMeetingRequest)
      return
    }
  }
  res.status(404)
})
