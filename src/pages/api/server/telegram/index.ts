import { NextApiRequest, NextApiResponse } from 'next'

import { NotificationChannel } from '@/types/AccountNotifications'
import { SetTelegramNotificationOptionRequest } from '@/types/Requests'
import {
  deleteAllTgConnections,
  getAccountNotificationSubscriptions,
  getTgConnectionByTgId,
  setAccountNotificationSubscriptions,
} from '@/utils/database'

export default async function discordInfo(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { chat_id, tg_id } = req.body as SetTelegramNotificationOptionRequest
    const tgConnection = await getTgConnectionByTgId(tg_id)
    if (!tgConnection) {
      return res
        .status(404)
        .send({ success: false, message: 'Telegram connection not found' })
    }
    const subscriptions = await getAccountNotificationSubscriptions(
      tgConnection.account_address
    )
    if (
      subscriptions.notification_types.find(
        n => n.channel === NotificationChannel.TELEGRAM
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Telegram notification already added',
      })
    }
    subscriptions.notification_types.push({
      channel: NotificationChannel.TELEGRAM,
      destination: chat_id,
      disabled: false,
    })
    await setAccountNotificationSubscriptions(
      tgConnection.account_address,
      subscriptions
    )
    await deleteAllTgConnections(tgConnection.account_address)
    return res.status(200).json({
      success: true,
      message: 'Telegram notification added successfully',
      account_address: tgConnection.account_address,
    })
  }

  return res.status(404).send('Not found')
}
