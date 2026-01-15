import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  BillingCycle,
  BillingPlan,
  GetSubscriptionResponse,
  PaymentProvider,
  StripeSubscription,
  SubscriptionPeriod,
  SubscriptionStatus,
} from '@/types/Billing'
import {
  getActiveSubscriptionPeriod,
  getBillingPlanById,
  getStripeSubscriptionByAccount,
  getTransactionsById,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Get active subscription period for account
      const subscriptionPeriod = await getActiveSubscriptionPeriod(
        accountAddress
      )

      // If no active subscription, return null values
      if (!subscriptionPeriod) {
        return res.status(200).json({
          billing_plan: null,
          expires_at: null,
          is_active: false,
          payment_provider: null,
          stripe_subscription: null,
          subscription: null,
        } as GetSubscriptionResponse)
      }

      // Map subscription period to SubscriptionPeriod type
      // Map status string to SubscriptionStatus enum
      const statusMap: Record<string, SubscriptionStatus> = {
        active: SubscriptionStatus.ACTIVE,
        cancelled: SubscriptionStatus.CANCELLED,
        expired: SubscriptionStatus.EXPIRED,
      }
      const status =
        statusMap[subscriptionPeriod.status] || SubscriptionStatus.EXPIRED

      const subscription: SubscriptionPeriod = {
        billing_plan_id: subscriptionPeriod.billing_plan_id,
        chain: subscriptionPeriod.chain,
        config_ipfs_hash: subscriptionPeriod.config_ipfs_hash,
        domain: subscriptionPeriod.domain,
        expiry_time: subscriptionPeriod.expiry_time,
        id: subscriptionPeriod.id,
        owner_account: subscriptionPeriod.owner_account,
        plan_id: subscriptionPeriod.plan_id,
        registered_at: subscriptionPeriod.registered_at,
        status,
        transaction_id: subscriptionPeriod.transaction_id,
        updated_at: subscriptionPeriod.updated_at,
      }

      // Get Stripe subscription if this is a billing subscription
      let stripeSubscription: StripeSubscription | null = null
      if (subscriptionPeriod.billing_plan_id) {
        const stripeSub = await getStripeSubscriptionByAccount(accountAddress)
        if (stripeSub) {
          stripeSubscription = {
            account_address: stripeSub.account_address,
            billing_plan_id: stripeSub.billing_plan_id,
            created_at: stripeSub.created_at,
            id: stripeSub.id,
            stripe_customer_id: stripeSub.stripe_customer_id,
            stripe_subscription_id: stripeSub.stripe_subscription_id,
            updated_at: stripeSub.updated_at,
          }
        }
      }

      // Get billing plan if this is a billing subscription
      let billingPlan: BillingPlan | null = null
      const billingPlanIdToUse =
        stripeSubscription?.billing_plan_id ||
        subscriptionPeriod.billing_plan_id
      if (billingPlanIdToUse) {
        const plan = await getBillingPlanById(billingPlanIdToUse)
        if (plan) {
          // Map billing_cycle string to BillingCycle enum
          const billingCycleMap: Record<string, BillingCycle> = {
            monthly: BillingCycle.MONTHLY,
            yearly: BillingCycle.YEARLY,
          }
          const billingCycle =
            billingCycleMap[plan.billing_cycle] || BillingCycle.MONTHLY

          billingPlan = {
            billing_cycle: billingCycle,
            created_at: plan.created_at,
            id: plan.id,
            name: plan.name,
            price: Number(plan.price),
            updated_at: plan.updated_at,
          }
        }
      }

      // Determine payment provider
      let paymentProvider: PaymentProvider | null = null

      if (stripeSubscription) {
        paymentProvider = PaymentProvider.STRIPE
      } else if (subscriptionPeriod.billing_plan_id) {
        paymentProvider = null
      } else if (subscriptionPeriod.transaction_id) {
        const transaction = await getTransactionsById(
          subscriptionPeriod.transaction_id
        )
        if (transaction?.provider === 'stripe') {
          paymentProvider = PaymentProvider.STRIPE
        }
      }

      // Check if subscription is actually active
      const isActive =
        subscriptionPeriod.status === 'active' &&
        new Date(subscriptionPeriod.expiry_time) > new Date()

      const response: GetSubscriptionResponse = {
        billing_plan: billingPlan,
        expires_at: subscriptionPeriod.expiry_time,
        is_active: isActive,
        payment_provider: paymentProvider,
        stripe_subscription: stripeSubscription,
        subscription,
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error fetching subscription:', error)
      Sentry.captureException(error)
      return res.status(500).json({ error: 'Failed to fetch subscription' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
