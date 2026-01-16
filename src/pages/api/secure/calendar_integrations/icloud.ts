import type { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CalendarSyncInfo } from '@/types/CalendarConnections'
import { TimeSlotSource } from '@/types/Meeting'
import { encryptContent } from '@/utils/cryptography'
import {
  addOrUpdateConnectedCalendar,
  connectedCalendarExists,
  countCalendarIntegrations,
  isProAccountAsync,
} from '@/utils/database'
import { CalendarIntegrationLimitExceededError } from '@/utils/errors'

const APPLE_WEBDAV_URL = 'https://caldav.icloud.com'

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (!req.session.account) {
    return res.status(400).json({ message: 'SHOULD BE LOGGED IN' })
  }

  if (req.method === 'POST') {
    const symmetricKey = process.env.SYMETRIC_KEY!

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

    // Check subscription status for feature limits
    const accountAddress = req.session.account.address
    const isPro = await isProAccountAsync(accountAddress)

    if (!isPro) {
      // Check if this is a new integration (not updating existing)
      const existingIntegration = await connectedCalendarExists(
        accountAddress,
        details.username!,
        TimeSlotSource.ICLOUD
      )

      // If it's a new integration, check the limit
      if (!existingIntegration) {
        const integrationCount = await countCalendarIntegrations(accountAddress)
        if (integrationCount >= 2) {
          throw new CalendarIntegrationLimitExceededError()
        }
      }
    }

    try {
      await addOrUpdateConnectedCalendar(
        accountAddress,
        details.username!,
        TimeSlotSource.ICLOUD,
        details.calendars,
        {
          password: encryptContent(symmetricKey, details.password),
          url: APPLE_WEBDAV_URL,
          username: details.username,
        }
      )
      return res.status(200).send({ connected: true })
    } catch (error) {
      if (error instanceof CalendarIntegrationLimitExceededError) {
        return res.status(403).json({ error: error.message })
      }
      return res.status(500).json({ error: 'An unexpected error occurred' })
    }
  }

  return res.status(404).send('Method Not found')
}

export default withSessionRoute(handler)
