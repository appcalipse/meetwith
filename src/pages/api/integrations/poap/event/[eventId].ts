import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getPOAPEventDetails } from '@/utils/services/poap.helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const event = await getPOAPEventDetails(
      parseInt(req.query.eventId as string)
    )

    if (event) {
      res.status(200).json(event)
    } else {
      res.status(404).send('Not found')
    }
    return
  }

  res.status(404).send('Not found')
})
