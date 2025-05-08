import { NextApiRequest, NextApiResponse } from 'next'

import { eventExists } from '@/utils/test-utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.body.scheduler_address
  const meeting_id = req.body.meeting_id
  return res.status(200).json(await eventExists(meeting_id, account_address))
}

export default handle
