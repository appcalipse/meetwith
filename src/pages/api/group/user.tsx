import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GetGroupsResponse, MemberType } from '@/types/Group'
import { getUserGroups, initDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    try {
      const groups = await getUserGroups(
        account_address,
        Number(req.query.limit as string),
        Number(req.query.offset as string),
        req.query.search as string,
        req.query.role as MemberType
      )
      const responseJson: Array<GetGroupsResponse> = groups.map(group => ({
        id: group.group.id,
        name: group.group.name,
        slug: group.group.slug,
        role: group.role,
        invitePending: group.invite_pending,
      }))

      return res.status(200).json(responseJson)
    } catch (e) {
      return res.status(500).send(e)
    }
  }
}
export default withSessionRoute(handle)
