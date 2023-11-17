import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { encryptContent } from '@/utils/cryptography'
import { addOrUpdateConnectedCalendar } from '@/utils/database'
import CaldavCalendarService from '@/utils/services/caldav.service'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!req.session.account) {
    return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
  }

  const body: {
    url?: string
    username?: string
    password?: string
    calendars?: CalendarSyncInfo[]
  } = req.body

  // Route Validation
  if (!body.username || !body.password || !body.url) {
    return res
      .status(400)
      .json({ message: 'MUST HAVE USERNAME AND PASSWORD AND URL' })
  }

  if (!body.calendars) {
    body.calendars = []
  }

  if (req.method === 'POST') {
    const synmetricKey = process.env.SYNMETRIC_KEY!

    await addOrUpdateConnectedCalendar(
      req.session.account.address,
      body.username!,
      TimeSlotSource.WEBDAV,
      body.calendars,
      {
        username: body.username,
        url: body.url,
        password: encryptContent(synmetricKey, body.password),
      }
    )
    return res.status(200).send({ connected: true })
  } else if (req.method === 'PUT') {
    // Should be propfind, but cloudfront fucks it up by not allowing it
    try {
      const caldavService = new CaldavCalendarService(
        req.session.account.address,
        body.username,
        {
          password: body.password,
          username: body.username,
          url: body.url,
        },
        false
      )
      const calendars = await caldavService.listCalendars()

      if (calendars.length) {
        return res.status(200).send(calendars)
      } else {
        return res.status(401).send('Invalid Credentials')
      }
    } catch (err) {
      return res.status(401).send('Invalid Credentials')
    }
  }

  return res.status(404).send('Method Not found')
}

export default withSessionRoute(handler)
