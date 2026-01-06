import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getActiveSubscriptionPeriod } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Get active subscription period
      const subscriptionPeriod = await getActiveSubscriptionPeriod(
        accountAddress
      )

      const hasActive =
        subscriptionPeriod &&
        new Date(subscriptionPeriod.expiry_time) > new Date()

      return res.status(200).json({ hasActive })
    } catch (error) {
      console.error('Error checking active subscription:', error)
      Sentry.captureException(error)
      return res
        .status(500)
        .json({ error: 'Failed to check subscription status' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
