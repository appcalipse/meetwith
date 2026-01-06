import * as Sentry from '@sentry/nextjs'
import { addDays, endOfDay, startOfDay } from 'date-fns'
import { NextApiRequest, NextApiResponse } from 'next'

import { BillingEmailPeriod, BillingEmailPlan } from '@/types/Billing'
import {
  getBillingEmailAccountInfo,
  getBillingPeriodsByExpiryWindow,
  getBillingPlanById,
  getStripeSubscriptionByAccount,
  updateSubscriptionPeriodStatus,
} from '@/utils/database'
import {
  sendCryptoExpiryReminderEmail,
  sendSubscriptionExpiredEmail,
  sendSubscriptionRenewalDueEmail,
} from '@/utils/email_helper'
import { getDisplayNameForEmail } from '@/utils/email_utils'
import { EmailQueue } from '@/utils/workers/email.queue'

const emailQueue = new EmailQueue()

export default async function billingReminders(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const now = new Date()
      const todayStart = startOfDay(now)
      const todayEnd = endOfDay(now)

      // Get all billing periods expiring today
      const expiringToday = await getBillingPeriodsByExpiryWindow(
        todayStart,
        todayEnd,
        ['active', 'cancelled']
      )

      // Get periods expiring in 5 days (crypto reminders)
      const fiveDaysFromNow = addDays(now, 5)
      const fiveDaysStart = startOfDay(fiveDaysFromNow)
      const fiveDaysEnd = endOfDay(fiveDaysFromNow)
      const expiringIn5Days = await getBillingPeriodsByExpiryWindow(
        fiveDaysStart,
        fiveDaysEnd,
        ['active', 'cancelled']
      )

      // Get periods expiring in 3 days (crypto reminders)
      const threeDaysFromNow = addDays(now, 3)
      const threeDaysStart = startOfDay(threeDaysFromNow)
      const threeDaysEnd = endOfDay(threeDaysFromNow)
      const expiringIn3Days = await getBillingPeriodsByExpiryWindow(
        threeDaysStart,
        threeDaysEnd,
        ['active', 'cancelled']
      )

      // Get periods expiring in 4 days (Stripe renewal due)
      const fourDaysFromNow = addDays(now, 4)
      const fourDaysStart = startOfDay(fourDaysFromNow)
      const fourDaysEnd = endOfDay(fourDaysFromNow)
      const expiringIn4Days = await getBillingPeriodsByExpiryWindow(
        fourDaysStart,
        fourDaysEnd,
        ['active', 'cancelled']
      )

      // Process periods and enqueue emails
      const processedCount = {
        crypto5d: 0,
        crypto3d: 0,
        crypto0d: 0,
        stripe4d: 0,
        expired: 0,
      }

      // Helper to check if a period is a Stripe subscription
      const isStripeSubscription = async (
        accountAddress: string,
        billingPlanId: string
      ): Promise<boolean> => {
        try {
          const stripeSubscription = await getStripeSubscriptionByAccount(
            accountAddress
          )
          return (
            stripeSubscription?.billing_plan_id === billingPlanId &&
            stripeSubscription?.account_address.toLowerCase() ===
              accountAddress.toLowerCase()
          )
        } catch {
          return false
        }
      }

      // Process expiring today (expiry + crypto 0d reminder)
      for (const period of expiringToday) {
        if (!period.billing_plan_id) continue

        const accountAddress = period.owner_account.toLowerCase()
        const isStripe = await isStripeSubscription(
          accountAddress,
          period.billing_plan_id
        )

        if (!isStripe) {
          // Crypto: send 0d reminder
          processedCount.crypto0d++
          await emailQueue.add(async () => {
            try {
              const accountInfo = await getBillingEmailAccountInfo(
                accountAddress
              )
              if (!accountInfo) return false

              const billingPlan = await getBillingPlanById(
                period.billing_plan_id!
              )
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

              await sendCryptoExpiryReminderEmail(
                { ...accountInfo, displayName: processedDisplayName },
                emailPeriod,
                emailPlan,
                0
              )
              return true
            } catch (error) {
              Sentry.captureException(error)
              return false
            }
          })
        }

        // Mark as expired if status is active or cancelled
        if (period.status === 'active' || period.status === 'cancelled') {
          processedCount.expired++
          await emailQueue.add(async () => {
            try {
              await updateSubscriptionPeriodStatus(period.id, 'expired')

              const accountInfo = await getBillingEmailAccountInfo(
                accountAddress
              )
              if (!accountInfo) return false

              const billingPlan = await getBillingPlanById(
                period.billing_plan_id!
              )
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
              return true
            } catch (error) {
              Sentry.captureException(error)
              return false
            }
          })
        }
      }

      // Process expiring in 5 days (crypto reminders)
      for (const period of expiringIn5Days) {
        if (!period.billing_plan_id) continue

        const accountAddress = period.owner_account.toLowerCase()
        const isStripe = await isStripeSubscription(
          accountAddress,
          period.billing_plan_id
        )

        if (!isStripe) {
          processedCount.crypto5d++
          await emailQueue.add(async () => {
            try {
              const accountInfo = await getBillingEmailAccountInfo(
                accountAddress
              )
              if (!accountInfo) return false

              const billingPlan = await getBillingPlanById(
                period.billing_plan_id!
              )
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

              await sendCryptoExpiryReminderEmail(
                { ...accountInfo, displayName: processedDisplayName },
                emailPeriod,
                emailPlan,
                5
              )
              return true
            } catch (error) {
              Sentry.captureException(error)
              return false
            }
          })
        }
      }

      // Process expiring in 3 days (crypto reminders)
      for (const period of expiringIn3Days) {
        if (!period.billing_plan_id) continue

        const accountAddress = period.owner_account.toLowerCase()
        const isStripe = await isStripeSubscription(
          accountAddress,
          period.billing_plan_id
        )

        if (!isStripe) {
          processedCount.crypto3d++
          await emailQueue.add(async () => {
            try {
              const accountInfo = await getBillingEmailAccountInfo(
                accountAddress
              )
              if (!accountInfo) return false

              const billingPlan = await getBillingPlanById(
                period.billing_plan_id!
              )
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

              await sendCryptoExpiryReminderEmail(
                { ...accountInfo, displayName: processedDisplayName },
                emailPeriod,
                emailPlan,
                3
              )
              return true
            } catch (error) {
              Sentry.captureException(error)
              return false
            }
          })
        }
      }

      // Process expiring in 4 days (Stripe renewal due)
      for (const period of expiringIn4Days) {
        if (!period.billing_plan_id) continue

        const accountAddress = period.owner_account.toLowerCase()
        const isStripe = await isStripeSubscription(
          accountAddress,
          period.billing_plan_id
        )

        if (isStripe && period.status === 'cancelled') {
          processedCount.stripe4d++
          await emailQueue.add(async () => {
            try {
              const accountInfo = await getBillingEmailAccountInfo(
                accountAddress
              )
              if (!accountInfo) return false

              const billingPlan = await getBillingPlanById(
                period.billing_plan_id!
              )
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

              await sendSubscriptionRenewalDueEmail(
                { ...accountInfo, displayName: processedDisplayName },
                emailPeriod,
                emailPlan,
                4
              )
              return true
            } catch (error) {
              Sentry.captureException(error)
              return false
            }
          })
        }
      }

      return res.status(200).json({
        success: true,
        processed: processedCount,
        timestamp: now.toISOString(),
        message: `Successfully processed billing reminders: ${JSON.stringify(
          processedCount
        )}`,
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
