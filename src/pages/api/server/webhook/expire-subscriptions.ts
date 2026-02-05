import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { NotificationChannel } from '@/types/AccountNotifications'
import { BillingEmailPeriod, BillingEmailPlan } from '@/types/Billing'
import { appUrl } from '@/utils/constants'
import {
  expireStaleSubscriptionPeriods,
  getAccountNotificationSubscriptions,
  getBillingEmailAccountInfo,
  getBillingPlanById,
  getDiscordAccount,
} from '@/utils/database'
import { sendSubscriptionExpiredEmail } from '@/utils/email_helper'
import { getDisplayNameForEmail } from '@/utils/email_utils'
import { dmAccount } from '@/utils/services/discord.helper'
import { sendDm } from '@/utils/services/telegram.helper'
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

      // Send expiry emails and notifications for each expired period
      let emailCount = 0
      let discordCount = 0
      let telegramCount = 0

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
              expiry_time: period.expiry_time,
              registered_at: period.registered_at,
            }

            const emailPlan: BillingEmailPlan = {
              billing_cycle: billingPlan.billing_cycle,
              id: billingPlan.id,
              name: billingPlan.name,
              price: billingPlan.price,
            }

            // Send email
            await sendSubscriptionExpiredEmail(
              { ...accountInfo, displayName: processedDisplayName },
              emailPeriod,
              emailPlan
            )
            emailCount++

            // Get notification subscriptions
            const notifications =
              await getAccountNotificationSubscriptions(accountAddress)

            // Prepare renewal URL
            const renewUrl = `${appUrl}/dashboard/settings/subscriptions/billing`

            const message = `Your ${billingPlan.name} subscription has expired. You can renew your subscription at any time to continue enjoying Pro features.\n\nRenew [here](${renewUrl})`

            // Send Discord notification if enabled
            const discordNotification = notifications.notification_types.find(
              n => n.channel === NotificationChannel.DISCORD && !n.disabled
            )
            if (discordNotification) {
              const discordAccount = await getDiscordAccount(accountAddress)
              if (discordAccount?.discord_id) {
                try {
                  await dmAccount(
                    accountAddress,
                    discordAccount.discord_id,
                    message
                  )
                  discordCount++
                } catch (error) {
                  Sentry.captureException(error, {
                    extra: {
                      accountAddress,
                      context: 'Discord notification for subscription expiry',
                    },
                  })
                }
              }
            }

            // Send Telegram notification if enabled
            const telegramNotification = notifications.notification_types.find(
              n => n.channel === NotificationChannel.TELEGRAM && !n.disabled
            )
            if (telegramNotification) {
              try {
                await sendDm(telegramNotification.destination, message)
                telegramCount++
              } catch (error) {
                Sentry.captureException(error, {
                  extra: {
                    accountAddress,
                    context: 'Telegram notification for subscription expiry',
                  },
                })
              }
            }

            return true
          } catch (error) {
            Sentry.captureException(error)
            return false
          }
        })
      }

      return res.status(200).json({
        discordCount,
        emailCount,
        expiredCount: result.expiredCount,
        message: `Successfully expired ${result.expiredCount} subscription period(s) and sent ${emailCount} email(s), ${discordCount} Discord message(s), and ${telegramCount} Telegram message(s)`,
        success: true,
        telegramCount,
        timestamp: result.timestamp,
      })
    } catch (error) {
      Sentry.captureException(error)
      return res.status(500).json({
        error: (error as Error).message,
        success: false,
      })
    }
  }

  return res.status(404).send('Not found')
}
