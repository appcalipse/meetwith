import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { HUDDLE_API_URL } from '@/utils/huddle.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { title } = req.body

    try {
      const huddleResponse = await fetch(
        `${HUDDLE_API_URL}/v2/platform/rooms/create-room`,
        {
          method: 'POST',
          headers: {
            Accept: '*/*',
            'Content-Type': 'application/json',
            'x-api-key': process.env.HUDDLE_API_KEY!,
          },
          body: JSON.stringify({
            title: title || 'Meetwith Meeting',
            roomLocked: false,
            hostDetails: [],
          }),
        }
      )
      if (![200, 201].includes(huddleResponse.status)) {
        Sentry.captureException(huddleResponse.statusText)
        return res.status(503).send('Huddle01 Unavailable')
      }
      const huddleMeeting = await huddleResponse.json()
      if (huddleMeeting) {
        return res.json({
          url: huddleMeeting.meetingLink,
        })
      }
    } catch (e) {
      Sentry.captureException(e)
      return res.status(503).send('Huddle01 Unavailable')
    }
  }

  return res.status(404).send('Not found')
}

export default handler
