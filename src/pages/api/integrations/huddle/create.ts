import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingProvider } from '@/types/Meeting'
import { HUDDLE_API_URL } from '@/utils/huddle.helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { title } = req.body

    try {
      const huddleMeeting = await (
        await fetch(`${HUDDLE_API_URL}/createroom`, {
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
      ).json()

      if (huddleMeeting.data) {
        return res.json({
          url: huddleMeeting.data.roomUrl,
          id: huddleMeeting.data.id,
          title: title || 'Meet with Wallet Meeting',
          provider: MeetingProvider.HUDDLE01,
        })
      }
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Huddle01 Unavailable')
    }
  }

  res.status(404).send('Not found')
})
