import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { TimeSlotSource } from '@/types/Meeting'

import { encryptContent } from '../../../../utils/cryptography'
import { addOrUpdateConnectedCalendar } from '../../../../utils/database'

const APPLE_WEBDAV_URL = 'https://caldav.icloud.com'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!req.session.account) {
    return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
  }

  if (req.method === 'POST') {
    const symetricKey = process.env.SYMETRIC_KEY!
    const details: any = req.body as any

    await addOrUpdateConnectedCalendar(
      req.session.account.address,
      details.username!,
      TimeSlotSource.ICLOUD,
      details.calendars,
      {
        username: details.username,
        url: APPLE_WEBDAV_URL,
        password: encryptContent(symetricKey, details.password),
      }
    )
    return res.status(200).send({ connected: true })
  }

  return res.status(404).send('Method Not found')
}

export default withSessionRoute(handler)
