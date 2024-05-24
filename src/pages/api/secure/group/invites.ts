import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GroupInvite } from '@/types/Group'
import { getGroupInvitesFromDB } from '@/utils/database'
import { validateUserPermissions } from '@/utils/user_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { group_id, user_id, email, discord_id } = req.query

  if (!req.session || !req.session.account) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const currentUser = req.session.account

  let groupInvites: GroupInvite[] = []
  try {
    groupInvites = await getGroupInvitesFromDB({
      group_id: group_id as string,
      user_id: user_id as string,
      email: email as string,
      discord_id: discord_id as string,
    })
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch group invites' })
  }

  if (
    !validateUserPermissions(
      currentUser,
      {
        group_id: group_id as string,
        user_id: user_id as string,
        email: email as string,
        discord_id: discord_id as string,
      },
      groupInvites
    )
  ) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  return res.status(200).json(groupInvites)
}

export default withSessionRoute(handle)
