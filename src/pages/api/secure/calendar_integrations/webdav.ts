import type { NextApiRequest, NextApiResponse } from 'next'

import {
  ConnectedCalendarCorePayload,
  ConnectedCalendarProvider,
} from '../../../../types/CalendarConnections'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { encryptContent } from '../../../../utils/cryptography'
import { addOrUpdateConnectedCalendar } from '../../../../utils/database'
import CaldavCalendarService from '../../../../utils/services/caldav.service'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!req.session.account) {
    res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
    return
  }

  if (req.method === 'POST') {
    const symetricKey = process.env.SYMETRIC_KEY!
    const details: any = req.body as any

    const payload: ConnectedCalendarCorePayload = {
      provider: ConnectedCalendarProvider.WEBDAV,
      email: details.username!,
      sync: false,
      payload: {
        username: details.username,
        url: details.url,
        password: encryptContent(symetricKey, details.password),
      },
    }

    await addOrUpdateConnectedCalendar(req.session.account.address, payload)
    res.status(200).send({ connected: true })
    return
  } else if (req.method === 'PROPFIND') {
    try {
      const { username, url, password } = req.body as any
      const caldavService = new CaldavCalendarService(
        req.session.account.address,
        username,
        { password, username, url },
        false
      )
      const calendars = await caldavService.listCalendars()
      if (calendars.length) {
        res.status(200).send('Valid Credentials')
      } else {
        res.status(401).send('Invalid Credentials')
      }
      return
    } catch {
      res.status(401).send('Invalid Credentials')
      return
    }
  }

  res.status(404).send('Method Not found')
}

export default withSessionRoute(handler)
