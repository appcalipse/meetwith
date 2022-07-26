import type { NextApiRequest, NextApiResponse } from 'next'

import { TimeSlotSource } from '@/types/Meeting'

import { ConnectedCalendarCorePayload } from '../../../../types/CalendarConnections'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { encryptContent } from '../../../../utils/cryptography'
import { addOrUpdateConnectedCalendar } from '../../../../utils/database'

const APPLE_WEBDAV_URL = 'https://caldav.icloud.com'

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
      provider: TimeSlotSource.ICLOUD,
      email: details.username!,
      sync: false,
      payload: {
        username: details.username,
        url: APPLE_WEBDAV_URL,
        password: encryptContent(symetricKey, details.password),
      },
    }

    await addOrUpdateConnectedCalendar(req.session.account.address, payload)
    res.status(200).send({ connected: true })
    return
  }

  res.status(404).send('Method Not found')
}

export default withSessionRoute(handler)
