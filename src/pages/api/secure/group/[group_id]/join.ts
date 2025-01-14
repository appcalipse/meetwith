import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { InviteType } from '@/types/Dashboard'
import {
  getAccountNotificationSubscriptions,
  initDB,
  manageGroupInvite,
  publicGroupJoin,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const { group_id, email_address, type } = req.query as {
        group_id: string
        email_address?: string
        type?: InviteType
      }
      if (type === InviteType.PUBLIC) {
        await publicGroupJoin(group_id, account_address)
      } else {
        const notifications = await getAccountNotificationSubscriptions(
          account_address
        )
        const userEmail = notifications?.notification_types.find(
          n => n.channel === NotificationChannel.EMAIL
        )?.destination
        await manageGroupInvite(
          group_id,
          account_address,
          undefined,
          email_address || userEmail
        )
      }
      return res.status(200).json({
        success: true,
      })
    } catch (e: any) {
      return res.status(500).send({
        error: e.message,
      })
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
