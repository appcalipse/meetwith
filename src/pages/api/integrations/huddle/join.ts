import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { HUDDLE_API_URL } from '@/utils/huddle.helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { name, roomId } = req.body

    try {
      const response = await fetch(`${HUDDLE_API_URL}/joinroom`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'x-api-key': process.env.HUDDLE_API_KEY!,
        },
        body: JSON.stringify({
          type: 'guest',
          name,
          roomId,
        }),
      })

      const joinData = await response.json()

      if (joinData) {
        return res.json({ joiningLink: joinData.joiningLink })
      }
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Huddle01 Unavailable')
    }
  }

  return res.status(404).send('Not found')
})
