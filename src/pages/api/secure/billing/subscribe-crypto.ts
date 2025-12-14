import * as Sentry from '@sentry/nextjs'
import { addMonths, addYears } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'
import { v4 } from 'uuid'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  SubscribeRequestCrypto,
  SubscribeResponseCrypto,
} from '@/types/Billing'
import {
  getActiveSubscriptionPeriod,
  getBillingPlanById,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    try {
      // Authentication is handled by withSessionRoute middleware
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Validate request body
      const { billing_plan_id, subscription_type = 'initial' } =
        req.body as SubscribeRequestCrypto

      if (!billing_plan_id) {
        return res.status(400).json({ error: 'billing_plan_id is required' })
      }

      if (
        subscription_type &&
        !['initial', 'extension'].includes(subscription_type)
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

      // Extension Logic: Check if user has existing active subscription
      const existingSubscription = await getActiveSubscriptionPeriod(
        accountAddress
      )
      let calculatedExpiryTime: Date

      if (existingSubscription && subscription_type === 'extension') {
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

      // Generate message channel for pub/sub communication
      const messageChannel = `subscription:${v4()}:${billing_plan_id}`

      // Prepare purchase data for Thirdweb payment widget
      const purchaseData = {
        subscription_type: subscription_type as 'initial' | 'extension',
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
