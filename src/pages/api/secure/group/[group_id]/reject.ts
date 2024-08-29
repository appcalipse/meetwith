import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import {
  getAccountNotificationSubscriptions,
  initDB,
  rejectGroupInvite,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const { group_id, email_address } = req.query as {
        group_id: string
        email_address?: string
      }
      const notifications = await getAccountNotificationSubscriptions(address)
      const userEmail = notifications?.notification_types.find(
        n => n.channel === NotificationChannel.EMAIL
      )?.destination
      await rejectGroupInvite(
        group_id,
        account_address,
        email_address || userEmail
      )
      return res.status(200).json({
        success: true,
      })
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
