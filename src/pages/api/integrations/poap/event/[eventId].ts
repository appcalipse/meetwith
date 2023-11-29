import { NextApiRequest, NextApiResponse } from 'next'

import { getPOAPEventDetails } from '@/utils/services/poap.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const event = await getPOAPEventDetails(
      parseInt(req.query.eventId as string)
    )

    if (event) {
      return res.status(200).json(event)
    } else {
      return res.status(200).json({ id: null })
    }
  }

  return res.status(404).send('Not found')
}

export default handler
