import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getGroupsAndMembers, initDB } from '@/utils/database'
import { isProAccountAsync } from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }
    try {
      const allGroups = await getGroupsAndMembers(
        account_address,
        extractQuery(req.query, 'limit'),
        extractQuery(req.query, 'offset'),
        extractQuery(req.query, 'search'),
        extractQuery(req.query, 'includeInvites') === 'true'
      )

      // Check subscription status for filtering
      const isPro = await isProAccountAsync(account_address)

      if (!isPro) {
        // Free tier: return only first 5 groups
        const limitedGroups = allGroups.slice(0, 5)
        return res.status(200).json({
          groups: limitedGroups,
          total: allGroups.length,
          hidden: Math.max(0, allGroups.length - 5),
          upgradeRequired: allGroups.length > 5,
        })
      }

      // Pro: return all groups
      return res.status(200).json({
        groups: allGroups,
        total: allGroups.length,
        hidden: 0,
        upgradeRequired: false,
      })
    } catch (e) {
      return res.status(500).send(e)
    }
  }
  return res.status(405).send('Method not allowed')
}
export default withSessionRoute(handle)
