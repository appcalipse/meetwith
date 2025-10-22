import { PaymentProvider } from '@meta/PaymentAccount'
import Sentry from '@sentry/nextjs'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getOrCreatePaymentAccount } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const account_address = req.session.account!.address
      const stripe = new StripeService()
      const provider = await getOrCreatePaymentAccount(
        account_address,
        PaymentProvider.STRIPE
      )
      const accountId = provider.provider_account_id
      if (!accountId) {
        return res.status(404).send('Stripe account not found.')
      }
      const loginLink = await stripe.accounts.createLoginLink(accountId)
      return res.status(200).json({
        url: loginLink.url,
      })
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
