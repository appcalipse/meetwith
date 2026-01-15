import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getGroupsAndMembers,
  initDB,
  isProAccountAsync,
} from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      // Check subscription status first
      const isPro = await isProAccountAsync(account_address)

      if (!isPro) {
        const allGroups = await getGroupsAndMembers(
          account_address,
          '5',
          '0',
          '',
          extractQuery(req.query, 'includeInvites') === 'true'
        )

        // Get total count for all groups
        const allGroupsUnlimited = await getGroupsAndMembers(
          account_address,
          undefined,
          undefined,
          '',
          extractQuery(req.query, 'includeInvites') === 'true'
        )

        return res.status(200).json({
          groups: allGroups,
          hidden: Math.max(0, allGroupsUnlimited.length - 5),
          total: allGroupsUnlimited.length,
          upgradeRequired: allGroupsUnlimited.length >= 5,
        })
      }

      // Pro: fetch all groups with search/limit/offset from query params
      const allGroups = await getGroupsAndMembers(
        account_address,
        extractQuery(req.query, 'limit'),
        extractQuery(req.query, 'offset'),
        extractQuery(req.query, 'search'),
        extractQuery(req.query, 'includeInvites') === 'true'
      )

      // Get total count for pagination
      const allGroupsForCount = await getGroupsAndMembers(
        account_address,
        undefined,
        undefined,
        extractQuery(req.query, 'search'),
        extractQuery(req.query, 'includeInvites') === 'true'
      )

      return res.status(200).json({
        groups: allGroups,
        hidden: 0,
        total: allGroupsForCount.length,
        upgradeRequired: false,
      })
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
