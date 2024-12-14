import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CouponSubscriptionRequest } from '@/types/Requests'
import { subscribeWithCoupon } from '@/utils/database'
import {
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      const account_address = req.session.account!.address
      const { coupon, domain } = req.body as CouponSubscriptionRequest
      const subscription = await subscribeWithCoupon(
        coupon,
        account_address,
        domain
      )
      return res.status(201).json(subscription)
    } catch (e: unknown) {
      if (e instanceof CouponNotValid) {
        return res.status(400).json({ error: e.message })
      } else if (e instanceof CouponExpired) {
        return res.status(410).json({ error: e.message })
      } else if (e instanceof CouponAlreadyUsed) {
        return res.status(409).json({ error: e.message })
      } else if (e instanceof Error) {
        return res.status(500).json({ error: e.message })
      } else {
        return res.status(500).json({ error: 'Unknown error' })
      }
    }
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
