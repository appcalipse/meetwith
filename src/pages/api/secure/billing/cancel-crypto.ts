import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  BillingEmailPeriod,
  BillingEmailPlan,
  CancelSubscriptionResponse,
  PaymentProvider as BillingPaymentProvider,
} from '@/types/Billing'
import {
  getBillingEmailAccountInfo,
  getBillingPlanById,
  getStripeSubscriptionByAccount,
  getSubscriptionPeriodsByAccount,
} from '@/utils/database'
import { sendSubscriptionCancelledEmail } from '@/utils/email_helper'
import { getDisplayNameForEmail } from '@/utils/email_utils'
import { cancelCryptoSubscription } from '@/utils/services/crypto.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // Authentication is handled by withSessionRoute middleware
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Cancel crypto subscription
      await cancelCryptoSubscription(accountAddress)

      // Send subscription cancellation email (best-effort, don't block flow)
      try {
        // Get all subscription periods to find the latest cancelled crypto period
        const allSubscriptions = await getSubscriptionPeriodsByAccount(
          accountAddress
        )

        // Get Stripe subscription to exclude Stripe periods
        const stripeSubscription = await getStripeSubscriptionByAccount(
          accountAddress
        )

        const now = new Date()
        let mostRecentCryptoPeriod: (typeof allSubscriptions)[0] | null = null

        // Find the most recent cancelled crypto billing period
        for (const sub of allSubscriptions) {
          if (!sub.billing_plan_id) {
            continue
          }

          // Check if this is a Stripe subscription
          const isStripeSubscription =
            stripeSubscription &&
            stripeSubscription.billing_plan_id === sub.billing_plan_id &&
            stripeSubscription.account_address.toLowerCase() === accountAddress

          // Only consider crypto subscriptions (not Stripe) that are cancelled and haven't expired
          if (
            !isStripeSubscription &&
            sub.status === 'cancelled' &&
            new Date(sub.expiry_time) > now &&
            (!mostRecentCryptoPeriod ||
              new Date(sub.expiry_time) >
                new Date(mostRecentCryptoPeriod.expiry_time))
          ) {
            mostRecentCryptoPeriod = sub
          }
        }

        // Send email if we found a cancelled crypto period
        if (mostRecentCryptoPeriod && mostRecentCryptoPeriod.billing_plan_id) {
          const accountInfo = await getBillingEmailAccountInfo(accountAddress)

          if (accountInfo) {
            // Process display name for email
            const processedDisplayName = getDisplayNameForEmail(
              accountInfo.displayName
            )

            // Get billing plan details
            const billingPlan = await getBillingPlanById(
              mostRecentCryptoPeriod.billing_plan_id
            )

            if (billingPlan) {
              const period: BillingEmailPeriod = {
                registered_at: mostRecentCryptoPeriod.registered_at,
                expiry_time: mostRecentCryptoPeriod.expiry_time,
              }

              const emailPlan: BillingEmailPlan = {
                id: billingPlan.id,
                name: billingPlan.name,
                price: billingPlan.price,
                billing_cycle: billingPlan.billing_cycle,
              }

              await sendSubscriptionCancelledEmail(
                { ...accountInfo, displayName: processedDisplayName },
                period,
                emailPlan,
                BillingPaymentProvider.CRYPTO
              )
            }
          }
        }
      } catch (error) {
        Sentry.captureException(error)
        // Don't fail the cancellation if email fails
      }

      const response: CancelSubscriptionResponse = {
        success: true,
        message:
          'Subscription cancelled successfully. You will retain access until your current billing period ends.',
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error cancelling crypto subscription:', error)
      Sentry.captureException(error)

      return res.status(500).json({ error: 'Failed to cancel subscription' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
