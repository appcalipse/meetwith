import { PaymentProvider } from '@meta/PaymentAccount'
import Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getActivePaymentAccountDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const account_address = req.session.account!.address
      const provider = await getActivePaymentAccountDB(
        account_address,
        PaymentProvider.STRIPE
      )
      return res.status(200).json(provider?.status)
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
