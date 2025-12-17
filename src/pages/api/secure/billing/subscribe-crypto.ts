import * as Sentry from '@sentry/nextjs'
import { DateTime } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'
import { v4 } from 'uuid'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  SubscribeRequestCrypto,
  SubscribeResponseCrypto,
  SubscriptionType,
} from '@/types/Billing'
import {
  BillingEmailPeriod,
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
} from '@/types/Billing'
import {
  createSubscriptionPeriod,
  getActiveSubscriptionPeriod,
  getBillingEmailAccountInfo,
  getBillingPlanById,
  hasSubscriptionHistory,
} from '@/utils/database'
import { sendSubscriptionConfirmationEmail } from '@/utils/email_helper'
import { getDisplayNameForEmail } from '@/utils/email_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // Authentication is handled by withSessionRoute middleware
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
        await createSubscriptionPeriod(
          accountAddress,
          billing_plan_id,
          'active',
          trialExpiry.toISOString(),
          null
        )

        // Send trial started email (best-effort, don't block flow)
        try {
          const accountInfo = await getBillingEmailAccountInfo(accountAddress)

          if (accountInfo) {
            // Process display name for email
            const processedDisplayName = getDisplayNameForEmail(
              accountInfo.displayName
            )

            const period: BillingEmailPeriod = {
              registered_at: new Date(),
              expiry_time: trialExpiry,
            }

            const emailPlan: BillingEmailPlan = {
              id: billingPlan.id,
              name: billingPlan.name,
              price: billingPlan.price,
              billing_cycle: billingPlan.billing_cycle,
            }

            await sendSubscriptionConfirmationEmail(
              { ...accountInfo, displayName: processedDisplayName },
              period,
              emailPlan,
              BillingPaymentProvider.CRYPTO,
              undefined,
              true // isTrial
            )
          }
        } catch (error) {
          Sentry.captureException(error)
        }

        const trialResponse: SubscribeResponseCrypto = {
          success: true,
          amount: 0,
          currency: 'USD',
          billing_plan_id,
          purchaseData: {
            subscription_type: SubscriptionType.INITIAL,
            billing_plan_id,
            account_address: accountAddress,
            message_channel: `subscription:trial:${v4()}:${billing_plan_id}`,
            meeting_type_id: null,
          },
        }

        return res.status(200).json(trialResponse)
      }

      // Extension Logic: Check if user has existing active subscription
      const existingSubscription = await getActiveSubscriptionPeriod(
        accountAddress
      )
      let calculatedExpiryTime: Date

      if (
        existingSubscription &&
        subscription_type === SubscriptionType.EXTENSION
      ) {
        // Extension: Add duration to existing farthest expiry
        const existingExpiry = DateTime.fromISO(
          existingSubscription.expiry_time
        )
        if (billingPlan.billing_cycle === 'monthly') {
          calculatedExpiryTime = existingExpiry.plus({ months: 1 }).toJSDate()
        } else {
          // yearly
          calculatedExpiryTime = existingExpiry.plus({ years: 1 }).toJSDate()
        }
      } else {
        // First-time subscription: Add duration from now
        const now = DateTime.now()
        if (billingPlan.billing_cycle === 'monthly') {
          calculatedExpiryTime = now.plus({ months: 1 }).toJSDate()
        } else {
          // yearly
          calculatedExpiryTime = now.plus({ years: 1 }).toJSDate()
        }
      }

      // Generate message channel for pub/sub communication
      const messageChannel = `subscription:${v4()}:${billing_plan_id}`

      // Prepare purchase data for Thirdweb payment widget
      const purchaseData = {
        subscription_type: subscription_type,
        billing_plan_id,
        account_address: accountAddress,
        message_channel: messageChannel,
        meeting_type_id: null,
      }

      const response: SubscribeResponseCrypto = {
        success: true,
        amount: billingPlan.price,
        currency: 'USD',
        billing_plan_id,
        purchaseData,
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
