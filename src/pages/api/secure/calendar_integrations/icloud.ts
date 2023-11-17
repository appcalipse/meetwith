import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { encryptContent } from '@/utils/cryptography'
import { addOrUpdateConnectedCalendar } from '@/utils/database'

const APPLE_WEBDAV_URL = 'https://caldav.icloud.com'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!req.session.account) {
    return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
  }

  if (req.method === 'POST') {
    const symmetricKey = process.env.SYNMETRIC_KEY!

    const details: {
      url: string
      username?: string
      password?: string
      calendars: CalendarSyncInfo[]
    } = req.body

    if (!details.username || !details.password) {
      return res
        .status(400)
        .json({ message: 'MUST HAVE USERNAME AND PASSWORD' })
    }

    await addOrUpdateConnectedCalendar(
      req.session.account.address,
      details.username!,
      TimeSlotSource.ICLOUD,
      details.calendars,
      {
        username: details.username,
        url: APPLE_WEBDAV_URL,
        password: encryptContent(symmetricKey, details.password),
      }
    )
    return res.status(200).send({ connected: true })
  }

  return res.status(404).send('Method Not found')
}

export default withSessionRoute(handler)
