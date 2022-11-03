import type { NextApiRequest, NextApiResponse } from 'next'

import { TimeSlotSource } from '@/types/Meeting'

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

    await addOrUpdateConnectedCalendar(
      req.session.account.address,
      details.username!,
      TimeSlotSource.WEBDAV,
      details.calendars,
      {
        username: details.username,
        url: details.url,
        password: encryptContent(symetricKey, details.password),
      }
    )
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
        res.status(200).send(calendars)
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
