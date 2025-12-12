import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  GetSubscriptionHistoryResponse,
  SubscriptionHistoryItem,
  SubscriptionPeriod,
  SubscriptionStatus,
} from '@/types/Billing'
import { PaymentStatus } from '@/utils/constants/meeting-types'
import {
  getBillingPlanById,
  getSubscriptionHistory,
  getTransactionsById,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      // Authentication is handled by withSessionRoute middleware
      if (!req.session.account?.address) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const accountAddress = req.session.account.address.toLowerCase()

      // Get pagination parameters
      const limit = req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : 10
      const offset = req.query.offset
        ? parseInt(req.query.offset as string, 10)
        : 0

      // Validate pagination
      if (limit < 1 || limit > 100) {
        return res
          .status(400)
          .json({ error: 'Limit must be between 1 and 100' })
      }
      if (offset < 0) {
        return res.status(400).json({ error: 'Offset must be >= 0' })
      }

      // Get subscription periods with pagination
      const { periods, total } = await getSubscriptionHistory(
        accountAddress,
        limit,
        offset
      )

      // Map database periods to SubscriptionPeriod type
      const statusMap: Record<string, SubscriptionStatus> = {
        active: SubscriptionStatus.ACTIVE,
        cancelled: SubscriptionStatus.CANCELLED,
        expired: SubscriptionStatus.EXPIRED,
      }

      const mappedPeriods: SubscriptionPeriod[] = periods.map(period => ({
        id: period.id,
        owner_account: period.owner_account,
        plan_id: period.plan_id,
        billing_plan_id: period.billing_plan_id,
        chain: period.chain,
        domain: period.domain,
        config_ipfs_hash: period.config_ipfs_hash,
        status: statusMap[period.status] || SubscriptionStatus.EXPIRED,
        expiry_time: period.expiry_time,
        transaction_id: period.transaction_id,
        registered_at: period.registered_at,
        updated_at: period.updated_at,
      }))

      // Fetch transaction and billing plan data for each period
      const historyItems: SubscriptionHistoryItem[] = []

      for (const period of periods) {
        if (!period.transaction_id || !period.billing_plan_id) {
          continue // Skip if missing required data
        }

        // Get transaction (only completed ones)
        const transaction = await getTransactionsById(period.transaction_id)
        if (!transaction || transaction.status !== PaymentStatus.COMPLETED) {
          continue
        }

        // Get billing plan
        const billingPlan = await getBillingPlanById(period.billing_plan_id)
        if (!billingPlan) {
          continue
        }

        // Format plan name
        const planName =
          billingPlan.billing_cycle === 'yearly' ? `Pro Yearly` : `Pro Monthly`

        // Format date from transaction.confirmed_at
        const date = transaction.confirmed_at
          ? new Date(transaction.confirmed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })
          : new Date(period.registered_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            })

        // Determine payment method
        const paymentMethod = transaction.method

        // Format amount with currency
        const currency = transaction.currency || 'USD'

        const amount = transaction.amount
          ? `${transaction.amount.toFixed(2)} ${currency}`
          : '0.00'

        historyItems.push({
          plan: planName,
          date,
          paymentMethod,
          amount,
        })
      }

      const response: GetSubscriptionHistoryResponse = {
        periods: mappedPeriods,
        total,
        items: historyItems,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
      }

      return res.status(200).json(response)
    } catch (error) {
      console.error('Error fetching subscription history:', error)
      Sentry.captureException(error)
      return res
        .status(500)
        .json({ error: 'Failed to fetch subscription history' })
    }
  }
  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
