import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { getAccountNotificationSubscriptions } from '@/utils/database'
import { getTelegramUserInfo } from '@/utils/services/telegram.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const account_address = req.session.account!.address

      const subs = await getAccountNotificationSubscriptions(account_address)

      const telegramNotification = subs.notification_types.find(
        n => n.channel === NotificationChannel.TELEGRAM
      )

      if (!telegramNotification) {
        return res
          .status(404)
          .json({ error: 'Telegram notification not found' })
      }

      const userInfo = await getTelegramUserInfo(
        telegramNotification.destination
      )

      if (!userInfo) {
        return res.status(404).json({ error: 'Failed to fetch user info' })
      }

      return res.status(200).json(userInfo)
    } catch (error) {
      console.error('Error fetching Telegram user info:', error)
      return res.status(500).json({ error: 'Failed to fetch user info' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

export default withSessionRoute(handle)
