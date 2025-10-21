import { ConnectedAccount } from '@meta/ConnectedAccounts'
import Sentry from '@sentry/nextjs'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getDiscordAccountAndInfo,
  getTelegramAccountAndInfo,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const {} = req.body
    const accountId =
      req.session.account?.payment_preferences?.stripe_account_id
    if (!accountId) {
      const stripe = new StripeService()
      const account = await stripe.accounts.create({
        type: 'express',
      })
    }

    try {
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
