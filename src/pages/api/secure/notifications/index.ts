import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  AccountNotifications,
  NotificationChannel,
  VerificationChannel,
} from '@/types/AccountNotifications'
import {
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
  verifyVerificationCode,
} from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const account_address = req.session.account!.address
    const code = extractQuery<string>(req.query, 'code')
    const newSubscriptions: AccountNotifications =
      req.body as AccountNotifications

    try {
      const currentSubscriptions =
        await getAccountNotificationSubscriptions(account_address)

      const newEmailNotification = newSubscriptions.notification_types.find(
        type => type.channel === NotificationChannel.EMAIL
      )

      const existingEmailNotification =
        currentSubscriptions.notification_types.find(
          type => type.channel === NotificationChannel.EMAIL
        )

      const isChangingEmail =
        existingEmailNotification &&
        newEmailNotification &&
        newEmailNotification.destination !==
          existingEmailNotification.destination

      if (isChangingEmail) {
        if (!code) {
          return res.status(400).json({
            error:
              'Email notification already exists. Cannot override existing email.',
          })
        }

        const isCodeValid = await verifyVerificationCode(
          account_address,
          code,
          VerificationChannel.RESET_EMAIL
        )

        if (!isCodeValid) {
          return res.status(400).json({
            error:
              'Your onboarding token has expired, please update your email notification from the notifications setting.',
          })
        }
      }

      const subscriptions = await setAccountNotificationSubscriptions(
        account_address,
        newSubscriptions
      )

      return res.status(200).json(subscriptions)
    } catch (error) {
      Sentry.captureException(error)
      console.error('Error updating notification subscriptions:', error)
      return res.status(500).json({
        error: 'Failed to update notification subscriptions',
      })
    }
  } else if (req.method === 'GET') {
    const account_address = req.session.account!.address
    const subscriptions =
      await getAccountNotificationSubscriptions(account_address)
    return res.status(200).json(subscriptions)
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
