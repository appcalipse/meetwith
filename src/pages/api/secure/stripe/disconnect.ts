import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import * as Sentry from '@sentry/nextjs'
import { apiUrl } from '@utils/constants'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getOrCreatePaymentAccount,
  updatePaymentAccount,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    try {
      const account_address = req.session.account!.address
      const _stripe = new StripeService()
      const provider = await getOrCreatePaymentAccount(
        account_address,
        PaymentProvider.STRIPE
      )
      const accountId = provider.provider_account_id
      if (!accountId) {
        return res.status(404).send('Stripe account not found.')
      }
      await updatePaymentAccount(provider.id, account_address, {
        provider_account_id: accountId,
        status: PaymentAccountStatus.DISCONNECTED,
      })
      return res.status(200).json({
        success: true,
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
