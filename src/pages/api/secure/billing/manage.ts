import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { appUrl } from '@/utils/constants'
import { getStripeSubscriptionByAccount } from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Get active Stripe subscription for account
      const stripeSubscription = await getStripeSubscriptionByAccount(
        accountAddress
      )

      if (!stripeSubscription) {
        return res.status(404).json({
          error: 'No active Stripe subscription found for this account',
        })
      }

      if (!stripeSubscription.stripe_customer_id) {
        return res.status(400).json({
          error: 'Stripe customer ID not found for this subscription',
        })
      }

      // Create Stripe Customer Portal session
      const stripe = new StripeService()
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: stripeSubscription.stripe_customer_id,
        return_url: `${appUrl}/dashboard/settings/subscriptions?portal_success=true`,
      })

      return res.status(200).json({ url: portalSession.url })
    } catch (error) {
      console.error('Error creating customer portal session:', error)
      Sentry.captureException(error)

      // Handle Stripe-specific errors
      if (error && typeof error === 'object' && 'type' in error) {
        const stripeError = error as { type: string; message?: string }
        return res.status(400).json({
          error:
            stripeError.message ||
            "We couldn't reach Stripe to manage your subscription. Please try again in a moment.",
          type: stripeError.type,
        })
      }

      return res
        .status(500)
        .json({ error: 'Failed to create customer portal session' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
