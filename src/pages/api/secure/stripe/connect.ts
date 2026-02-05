import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import * as Sentry from '@sentry/nextjs'
import { apiUrl } from '@utils/constants'
import { extractQuery } from '@utils/generic_utils'
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
      const countryCode = extractQuery(req.query, 'country_code')
      const account_address = req.session.account!.address
      const stripe = new StripeService()
      const provider = await getOrCreatePaymentAccount(
        account_address,
        PaymentProvider.STRIPE
      )
      let accountId = provider.provider_account_id
      if (provider.status !== PaymentAccountStatus.CONNECTED) {
        await updatePaymentAccount(provider.id, account_address, {
          status: PaymentAccountStatus.PENDING,
        })
      }
      if (!accountId) {
        const account = await stripe.accounts.create({
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          country: countryCode,
          type: 'express',
        })
        accountId = account.id
        await updatePaymentAccount(provider.id, account_address, {
          provider_account_id: accountId,
          status: PaymentAccountStatus.PENDING,
        })
      }
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${apiUrl}/secure/stripe/refresh`,
        return_url: `${apiUrl}/secure/stripe/callback`,
        type: 'account_onboarding',
      })
      return res.status(200).json({
        url: accountLink.url,
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
