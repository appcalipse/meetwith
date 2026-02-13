import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { InvitedGroupsResponse } from '@/types/Group'
import {
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getGroupInvites,
  getGroupInvitesCount,
  initDB,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const userEmail =
        await getAccountNotificationSubscriptionEmail(account_address)
      const count = await getGroupInvitesCount({
        address: account_address,
        email: userEmail,
      })

      return res.status(200).json(count)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
