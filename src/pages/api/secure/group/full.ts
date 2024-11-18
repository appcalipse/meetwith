import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GetGroupsResponse } from '@/types/Group'
import {
  getAccountNotificationSubscriptionEmail,
  getGroupsAndMembers,
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
      const groups = await getGroupsAndMembers(
        account_address,
        Number(req.query.limit as string),
        Number(req.query.offset as string)
      )
      console.log(groups)
      return res.status(200).json([])
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
