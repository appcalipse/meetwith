import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { BillingEmailPeriod, BillingEmailPlan } from '@/types/Billing'
import {
  expireStaleSubscriptionPeriods,
  getBillingEmailAccountInfo,
  getBillingPlanById,
} from '@/utils/database'
import { sendSubscriptionExpiredEmail } from '@/utils/email_helper'
import { getDisplayNameForEmail } from '@/utils/email_utils'
import { EmailQueue } from '@/utils/workers/email.queue'

const emailQueue = new EmailQueue()

export default async function expireSubscriptions(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      // Expire all stale subscription periods
      const result = await expireStaleSubscriptionPeriods()

      // Send expiry emails for each expired period
      let emailCount = 0
      for (const period of result.expiredPeriods) {
        if (!period.billing_plan_id) continue

        const accountAddress = period.owner_account.toLowerCase()
        const billingPlanId = period.billing_plan_id // Type narrowing

        await emailQueue.add(async () => {
          try {
            const accountInfo = await getBillingEmailAccountInfo(accountAddress)
            if (!accountInfo) return false

            const billingPlan = await getBillingPlanById(billingPlanId)
            if (!billingPlan) return false

            const processedDisplayName = getDisplayNameForEmail(
              accountInfo.displayName
            )

            const emailPeriod: BillingEmailPeriod = {
              registered_at: period.registered_at,
              expiry_time: period.expiry_time,
            }

            const emailPlan: BillingEmailPlan = {
              id: billingPlan.id,
              name: billingPlan.name,
              price: billingPlan.price,
              billing_cycle: billingPlan.billing_cycle,
            }

            await sendSubscriptionExpiredEmail(
              { ...accountInfo, displayName: processedDisplayName },
              emailPeriod,
              emailPlan
            )
            emailCount++
            return true
          } catch (error) {
            Sentry.captureException(error)
            return false
          }
        })
      }

      return res.status(200).json({
        success: true,
        expiredCount: result.expiredCount,
        emailCount,
        timestamp: result.timestamp,
        message: `Successfully expired ${result.expiredCount} subscription period(s) and sent ${emailCount} email(s)`,
      })
    } catch (error) {
      Sentry.captureException(error)
      return res.status(500).json({
        success: false,
        error: (error as Error).message,
      })
    }
  }

  return res.status(404).send('Not found')
}
