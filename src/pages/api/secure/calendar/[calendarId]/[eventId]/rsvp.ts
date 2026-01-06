import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    try {
      const account_address = req.session.account!.address
      const { calendarId, eventId } = req.query

      if (!account_address) {
        return res.status(401).send('Unauthorized')
      }

      if (
        !calendarId ||
        Array.isArray(calendarId) ||
        !eventId ||
        Array.isArray(eventId)
      ) {
        return res.status(400).send('Missing or invalid parameters')
      }

      const { rsvpStatus } = req.body
      return res.status(200)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
