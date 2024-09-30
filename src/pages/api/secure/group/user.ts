import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { NotificationChannel } from '@/types/AccountNotifications'
import { GetGroupsResponse } from '@/types/Group'
import {
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getUserGroups,
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
      const userEmail = await getAccountNotificationSubscriptionEmail(
        account_address
      )
      const groups = await getUserGroups(
        account_address,
        Number(req.query.limit as string),
        Number(req.query.offset as string),
        userEmail
      )
      const responseJson: Array<GetGroupsResponse> = groups.map(group => ({
        id: group.group.id,
        name: group.group.name,
        slug: group.group.slug,
        role: group.role,
        invitePending: group.invitePending,
      }))

      return res.status(200).json(responseJson)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
