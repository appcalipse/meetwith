import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { HUDDLE_API_URL } from '@/utils/huddle.helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { title } = req.body

    try {
      const huddleResponse = await fetch(`${HUDDLE_API_URL}/createroom`, {
        method: 'POST',
        headers: {
          Accept: '*/*',
          'Content-Type': 'application/json',
          'x-api-key': process.env.HUDDLE_API_KEY!,
        },
        body: JSON.stringify({
          title: title || 'Meet with Wallet Meeting',
          roomLock: false,
        }),
      })

      if (huddleResponse.status !== 200) {
        Sentry.captureException(huddleResponse.statusText)
        return res.status(503).send('Huddle01 Unavailable')
      }

      const huddleMeeting = await huddleResponse.json()

      if (huddleMeeting) {
        return res.json({
          url: huddleMeeting.roomUrl,
        })
      }
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Huddle01 Unavailable')
    }
  }

  res.status(404).send('Not found')
})
