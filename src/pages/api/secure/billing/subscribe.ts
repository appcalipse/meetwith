import * as Sentry from '@sentry/nextjs'
import { addMonths, addYears } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  PaymentProvider,
  SubscribeRequest,
  SubscribeResponse,
} from '@/types/Billing'
import { appUrl } from '@/utils/constants'
import {
  getActiveSubscriptionPeriod,
  getBillingPlanById,
  getBillingPlanProvider,
  getStripeSubscriptionByAccount,
  hasSubscriptionHistory,
} from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Validate request body
      const { billing_plan_id } = req.body as SubscribeRequest

      if (!billing_plan_id) {
        return res.status(400).json({ error: 'billing_plan_id is required' })
      }

      const [billingPlan, stripeProductId] = await Promise.all([
        getBillingPlanById(billing_plan_id),
        getBillingPlanProvider(billing_plan_id, PaymentProvider.STRIPE),
      ])

      if (!billingPlan) {
        return res.status(404).json({ error: 'Billing plan not found' })
      }

      if (!stripeProductId) {
        return res
          .status(404)
          .json({ error: 'Stripe product not found for this plan' })
      }

      // Query Stripe API for price ID
      const stripe = new StripeService()
      const prices = await stripe.prices.list({
        product: stripeProductId,
        active: true,
      })

      if (!prices.data || prices.data.length === 0) {
        return res
          .status(404)
          .json({ error: 'No active Stripe price found for this product' })
      }

      // Get the first active price (should only be one per product based on our design)
      const priceId = prices.data[0].id

      // Get or create Stripe customer
      let customerId: string | undefined
      const existingStripeSubscription = await getStripeSubscriptionByAccount(
        accountAddress
      )

      if (existingStripeSubscription?.stripe_customer_id) {
        // Customer already exists, use existing customer ID
        customerId = existingStripeSubscription.stripe_customer_id
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          metadata: {
            account_address: accountAddress,
          },
        })
        customerId = customer.id
      }

      // Extension Logic: Check if user has existing active subscription
      // Fetch existing subscription and history status in parallel
      const [existingSubscription, hasHistory] = await Promise.all([
        getActiveSubscriptionPeriod(accountAddress),
        hasSubscriptionHistory(accountAddress),
      ])
      const isTrialEligible = !hasHistory
      let calculatedExpiryTime: Date

      if (existingSubscription) {
        // Extension: Add duration to existing farthest expiry
        const existingExpiry = new Date(existingSubscription.expiry_time)
        if (billingPlan.billing_cycle === 'monthly') {
          calculatedExpiryTime = addMonths(existingExpiry, 1)
        } else {
          // yearly
          calculatedExpiryTime = addYears(existingExpiry, 1)
        }
      } else {
        // First-time subscription: Add duration from now
        const now = new Date()
        if (billingPlan.billing_cycle === 'monthly') {
          calculatedExpiryTime = addMonths(now, 1)
        } else {
          // yearly
          calculatedExpiryTime = addYears(now, 1)
        }
      }

      // Create Stripe Checkout Session
      const successUrl = `${appUrl}/dashboard/settings/subscriptions?checkout=success&session_id={CHECKOUT_SESSION_ID}`
      const cancelUrl = `${appUrl}/dashboard/settings/subscriptions?checkout=cancel`

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          metadata: {
            account_address: accountAddress,
            billing_plan_id: billing_plan_id,
            calculated_expiry_time: calculatedExpiryTime.toISOString(),
            is_trial: isTrialEligible.toString(),
          },
          ...(isTrialEligible ? { trial_period_days: 14 } : {}),
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
      }

      const session = await stripe.checkout.sessions.create(sessionParams)

      const response: SubscribeResponse = {
        success: true,
        checkout_url: session.url || undefined,
        message: 'Checkout session created successfully',
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error creating subscription checkout:', error)
      Sentry.captureException(error)

      // Handle Stripe-specific errors
      if (error && typeof error === 'object' && 'type' in error) {
        const stripeError = error as { type: string; message?: string }
        return res.status(400).json({
          error:
            stripeError.message ||
            "We couldn't reach Stripe to create your subscription. Please try again in a moment.",
          type: stripeError.type,
        })
      }

      return res
        .status(500)
        .json({ error: 'Failed to create subscription checkout' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
