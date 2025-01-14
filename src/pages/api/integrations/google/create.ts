import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { createSpace } from '@/utils/services/master.google.service'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const link = await createSpace()
      if (!link) {
        return res.status(503).send('Google Meet Unavailable')
      }
      return res.json({ url: link })
    } catch (e) {
      console.log(e)
      Sentry.captureException(e)
      return res.status(503).send('Google Meet Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
