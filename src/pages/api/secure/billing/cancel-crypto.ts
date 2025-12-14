import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CancelSubscriptionResponse } from '@/types/Billing'
import { cancelCryptoSubscription } from '@/utils/services/crypto.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // Authentication is handled by withSessionRoute middleware
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Cancel crypto subscription
      await cancelCryptoSubscription(accountAddress)

      const response: CancelSubscriptionResponse = {
        success: true,
        message:
          'Subscription cancelled successfully. You will retain access until your current billing period ends.',
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error cancelling crypto subscription:', error)
      Sentry.captureException(error)

      return res.status(500).json({ error: 'Failed to cancel subscription' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
