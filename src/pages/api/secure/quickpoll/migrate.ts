import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { MigrateGuestPollsRequest } from '@/types/QuickPoll'
import { migrateGuestPollsToAccount } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const address = req.session.account?.address
  if (!address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const { guest_identifier } = req.body as MigrateGuestPollsRequest

    if (!guest_identifier || typeof guest_identifier !== 'string') {
      return res.status(400).json({ error: 'guest_identifier is required' })
    }

    const result = await migrateGuestPollsToAccount(guest_identifier, address)

    return res.status(200).json(result)
  } catch (error) {
    Sentry.captureException(error)
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default withSessionRoute(handler)
