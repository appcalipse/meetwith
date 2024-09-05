import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { InvitedGroupsResponse } from '@/types/Group'
import {
  getAccountNotificationSubscriptions,
  getGroupInvites,
  initDB,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    const address = req.query.address as string
    try {
      const notifications = await getAccountNotificationSubscriptions(address)
      const userEmail = notifications?.notification_types.find(
        n => n.channel === NotificationChannel.EMAIL
      )?.destination
      const groups = await getGroupInvites({ address, email: userEmail })
      const responseJson: Array<InvitedGroupsResponse> = groups.map(group => ({
        id: group.group.id,
        name: group.group.name,
        slug: group.group.slug,
      }))

      return res.status(200).json(responseJson)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
