import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
  CancelSubscriptionResponse,
} from '@/types/Billing'
import {
  getBillingPlanById,
  getStripeSubscriptionByAccount,
  getSubscriptionPeriodsByAccount,
} from '@/utils/database'
import { sendSubscriptionCancelledEmailForAccount } from '@/utils/email_helper'
import { cancelCryptoSubscription } from '@/utils/services/crypto.helper'
import { EmailQueue } from '@/utils/workers/email.queue'

const emailQueue = new EmailQueue()

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Cancel crypto subscription
      await cancelCryptoSubscription(accountAddress)

      // Prepare email data
      try {
        // Fetch subscription periods and Stripe subscription in parallel
        const [allSubscriptions, stripeSubscription] = await Promise.all([
          getSubscriptionPeriodsByAccount(accountAddress),
          getStripeSubscriptionByAccount(accountAddress),
        ])

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

        // Send email if we found a cancelled crypto period (non-blocking, queued)
        if (mostRecentCryptoPeriod && mostRecentCryptoPeriod.billing_plan_id) {
          // Get billing plan details
          const billingPlan = await getBillingPlanById(
            mostRecentCryptoPeriod.billing_plan_id
          )

          if (billingPlan) {
            const emailPlan: BillingEmailPlan = {
              billing_cycle: billingPlan.billing_cycle,
              id: billingPlan.id,
              name: billingPlan.name,
              price: billingPlan.price,
            }

            emailQueue.add(async () => {
              try {
                await sendSubscriptionCancelledEmailForAccount(
                  accountAddress,
                  emailPlan,
                  mostRecentCryptoPeriod!.registered_at,
                  mostRecentCryptoPeriod!.expiry_time,
                  BillingPaymentProvider.CRYPTO
                )
                return true
              } catch (error) {
                Sentry.captureException(error)
                return false
              }
            })
          }
        }
      } catch (error) {
        Sentry.captureException(error)
        // Don't fail the cancellation if email fails
      }

      const response: CancelSubscriptionResponse = {
        message:
          'Subscription cancelled successfully. You will retain access until your current billing period ends.',
        success: true,
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
