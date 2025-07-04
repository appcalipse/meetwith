import { NextApiRequest, NextApiResponse } from 'next'

import { getSlotsByIds } from '@/utils/database'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { ids } = req.query

    if (!ids || typeof ids !== 'string') {
      return res.status(400).send('Slot IDs parameter required')
    }

    try {
      const slotIds = ids.split(',')
      const slots = await getSlotsByIds(slotIds)
      return res.status(200).json(slots)
    } catch (error) {
      console.error('Error fetching slots:', error)
      return res.status(500).send('Internal server error')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
