import { NextApiRequest, NextApiResponse } from 'next'

import { getSlotInstance } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const identifier = req.query.identifier as string
      const meeting = await getSlotInstance(identifier)
      return res.status(200).json(meeting)
    } catch (error) {
      res.status(500).json({ error: 'Unknown error occurred' })
    }
  }
  return res.status(404).send('Not found')
}

export default handler
