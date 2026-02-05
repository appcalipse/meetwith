import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  getMeetingFromDB,
  getSlotInstance,
  getSlotSeries,
} from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const id = extractQuery(req.query, 'id')
    if (!id) {
      return res.status(404).send('Id parameter required')
    }

    try {
      const meeting = await getSlotSeries(id)
      return res.status(200).json(meeting)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
