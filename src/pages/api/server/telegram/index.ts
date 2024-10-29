import { NextApiRequest, NextApiResponse } from 'next'

import { NotificationChannel } from '@/types/AccountNotifications'
import { SetTelegramNotificationOptionRequest } from '@/types/Requests'
import {
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
} from '@/utils/database'

export default async function discordInfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { account_address, chat_id } =
      req.body as SetTelegramNotificationOptionRequest
    const subscriptions = await getAccountNotificationSubscriptions(
      account_address
    )
    subscriptions.notification_types.push({
      channel: NotificationChannel.TELEGRAM,
      destination: chat_id,
      disabled: false,
    })
    await setAccountNotificationSubscriptions(account_address, subscriptions)
    return res.status(200).json({
      success: true,
      message: 'Telegram notification added successfully',
    })
  }

  return res.status(404).send('Not found')
}
