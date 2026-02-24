import { NextApiRequest, NextApiResponse } from 'next'

import { getSlotInstance } from '@/utils/database'
import { MeetingNotFoundError } from '@/utils/errors'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const identifier = req.query.identifier as string
      const meeting = await getSlotInstance(identifier)
      return res.status(200).json(meeting)
    } catch (error: unknown) {
      if (error instanceof MeetingNotFoundError) {
        return res.status(404).json({ error: 'Meeting not found' })
      }
      res.status(404).json({ error: 'Unknown error occurred' })
    }
  }
  return res.status(404).send('Not found')
}

export default handler
