import { NextApiRequest, NextApiResponse } from 'next'

import { selectTeamMeetingRequest } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { id } = req.query

    const teamMeetingRequest = await selectTeamMeetingRequest(id as string)
    if (teamMeetingRequest) {
      return res.status(200).json(teamMeetingRequest)
    }
  }
  return res.status(404).send('Not found')
}

export default handler
