import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { hasSubscriptionHistory } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()
      const hasHistory = await hasSubscriptionHistory(accountAddress)

      return res.status(200).json({ eligible: !hasHistory })
    } catch (error) {
      console.error('Error checking trial eligibility:', error)
      Sentry.captureException(error)
      return res
        .status(500)
        .json({ error: 'Failed to check trial eligibility' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
