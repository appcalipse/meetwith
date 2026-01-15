import * as Sentry from '@sentry/nextjs'
import { DateTime } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'
import { v4 } from 'uuid'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
  SubscribeRequestCrypto,
  SubscribeResponseCrypto,
  SubscriptionType,
} from '@/types/Billing'
import { ISubscriptionData } from '@/types/Transactions'
import {
  createSubscriptionPeriod,
  getActiveSubscriptionPeriod,
  getBillingPlanById,
  hasSubscriptionHistory,
} from '@/utils/database'
import { sendSubscriptionConfirmationEmailForAccount } from '@/utils/email_helper'
import { EmailQueue } from '@/utils/workers/email.queue'

const emailQueue = new EmailQueue()

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Validate request body
      const {
        billing_plan_id,
        subscription_type = SubscriptionType.INITIAL,
        is_trial,
      } = req.body as SubscribeRequestCrypto

      if (!billing_plan_id) {
        return res.status(400).json({ error: 'billing_plan_id is required' })
      }

      if (
        subscription_type &&
        subscription_type !== SubscriptionType.INITIAL &&
        subscription_type !== SubscriptionType.EXTENSION
      ) {
        return res.status(400).json({
          error: 'subscription_type must be "initial" or "extension"',
        })
      }

      // Get billing plan from database
      const billingPlan = await getBillingPlanById(billing_plan_id)
      if (!billingPlan) {
        return res.status(404).json({ error: 'Billing plan not found' })
      }

      // Trial flow: auto-create 14-day subscription without payment
      if (is_trial) {
        const hasHistory = await hasSubscriptionHistory(accountAddress)
        if (hasHistory) {
          return res.status(400).json({
            error:
              'Trial not available: account already has subscription history',
          })
        }

        const trialExpiry = DateTime.now().plus({ days: 14 }).toJSDate()
        const createdPeriod = await createSubscriptionPeriod(
          accountAddress,
          billing_plan_id,
          'active',
          trialExpiry.toISOString(),
          null
        )

        // Send trial started email (non-blocking, queued)
        const emailPlan: BillingEmailPlan = {
          billing_cycle: billingPlan.billing_cycle,
          id: billingPlan.id,
          name: billingPlan.name,
          price: billingPlan.price,
        }

        emailQueue.add(async () => {
          try {
            await sendSubscriptionConfirmationEmailForAccount(
              accountAddress,
              emailPlan,
              createdPeriod.registered_at,
              createdPeriod.expiry_time,
              BillingPaymentProvider.CRYPTO,
              undefined,
              true // isTrial
            )
            return true
          } catch (error) {
            Sentry.captureException(error)
            return false
          }
        })

        const trialResponse: SubscribeResponseCrypto = {
          amount: 0,
          billing_plan_id,
          currency: 'USD',
          subscriptionData: {
            account_address: accountAddress,
            billing_plan_id,
            subscription_channel: `crypto-subscription:trial:${v4()}:${billing_plan_id}`,
            subscription_type: SubscriptionType.INITIAL,
          },
          success: true,
        }

        return res.status(200).json(trialResponse)
      }

      // Extension Logic: Check if user has existing active subscription
      const existingSubscription = await getActiveSubscriptionPeriod(
        accountAddress
      )
      let _calculatedExpiryTime: Date

      if (
        existingSubscription &&
        subscription_type === SubscriptionType.EXTENSION
      ) {
        // Extension: Add duration to existing farthest expiry
        const existingExpiry = DateTime.fromISO(
          existingSubscription.expiry_time
        )
        if (billingPlan.billing_cycle === 'monthly') {
          _calculatedExpiryTime = existingExpiry.plus({ months: 1 }).toJSDate()
        } else {
          // yearly
          _calculatedExpiryTime = existingExpiry.plus({ years: 1 }).toJSDate()
        }
      } else {
        // First-time subscription: Add duration from now
        const now = DateTime.now()
        if (billingPlan.billing_cycle === 'monthly') {
          _calculatedExpiryTime = now.plus({ months: 1 }).toJSDate()
        } else {
          // yearly
          _calculatedExpiryTime = now.plus({ years: 1 }).toJSDate()
        }
      }

      // Generate subscription channel for pub/sub communication
      const subscriptionChannel = `crypto-subscription:${v4()}:${billing_plan_id}`

      // Prepare subscription data for Thirdweb payment widget
      const subscriptionData: ISubscriptionData = {
        account_address: accountAddress,
        billing_plan_id,
        subscription_channel: subscriptionChannel,
        subscription_type: subscription_type,
      }

      const response: SubscribeResponseCrypto = {
        amount: billingPlan.price,
        billing_plan_id,
        currency: 'USD',
        subscriptionData,
        success: true,
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error creating crypto subscription config:', error)
      Sentry.captureException(error)

      return res
        .status(500)
        .json({ error: 'Failed to create subscription configuration' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
