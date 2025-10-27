import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import Sentry from '@sentry/nextjs'
import { StripeService } from '@utils/services/stripe.service'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getOrCreatePaymentAccount,
  updatePaymentAccount,
} from '@/utils/database'

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
        return res.redirect(
          '/dashboard/details?stripeResult=error#connected-accounts'
        )
      }
      const account = await stripe.accounts.retrieve(accountId)
      if (account.details_submitted) {
        await updatePaymentAccount(provider.id, account_address, {
          status: PaymentAccountStatus.CONNECTED,
        })
        return res.redirect(
          '/dashboard/details?stripeResult=success#connected-accounts'
        )
      } else if (account) {
        await updatePaymentAccount(provider.id, account_address, {
          status: PaymentAccountStatus.PENDING,
        })
        return res.redirect(
          '/dashboard/details?stripeResult=pending#connected-accounts'
        )
      } else {
        await updatePaymentAccount(provider.id, account_address, {
          status: PaymentAccountStatus.FAILED,
        })
        return res.redirect(
          '/dashboard/details?stripeResult=error#connected-accounts'
        )
      }
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
