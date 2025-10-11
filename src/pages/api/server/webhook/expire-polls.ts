import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { expireStalePolls } from '@/utils/database'

export default async function expirePolls(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const result = await expireStalePolls()
      return res.status(200).json({
        success: true,
        expiredCount: result.expiredCount,
        timestamp: result.timestamp,
        message: `Successfully expired ${result.expiredCount} poll(s)`,
      })
    } catch (error) {
      Sentry.captureException(error)
      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      })
    }
  }

  return res.status(404).send('Not found')
}
