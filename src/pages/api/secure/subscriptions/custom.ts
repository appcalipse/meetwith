import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  CouponSubscriptionRequest,
  SubscriptionUpdateRequest,
} from '@/types/Requests'
import {
  subscribeWithCoupon,
  updateCustomSubscriptionDomain,
} from '@/utils/database'
import {
  CouponAlreadyUsed,
  CouponExpired,
  CouponNotValid,
  NoActiveSubscription,
  SubscriptionNotCustom,
} from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const account_address = req.session.account!.address
  if (req.method === 'POST') {
    try {
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
  } else if (req.method === 'PATCH') {
    try {
      const { domain } = req.body as SubscriptionUpdateRequest
      const subscription = await updateCustomSubscriptionDomain(
        account_address,
        domain
      )
      return res.status(201).json(subscription)
    } catch (e: unknown) {
      if (e instanceof NoActiveSubscription) {
        return res.status(400).json({ error: e.message })
      } else if (e instanceof SubscriptionNotCustom) {
        return res.status(410).json({ error: e.message })
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
