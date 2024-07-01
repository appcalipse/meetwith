import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GroupInviteFilters } from '@/types/Group'
import { getGroupInvites, getUserGroups } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { group_id, user_id, email, discord_id, limit, offset } = req.query as {
    group_id?: string
    user_id?: string
    email?: string
    discord_id?: string
    limit?: string
    offset?: string
  }
  const session = req.session

  if (!session || !session.account) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const accountAddress = session.account.address
  const accountDiscordId = session.account.discord_account?.discord_id

  if (user_id && user_id !== session.account.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (discord_id && discord_id !== accountDiscordId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const filters: GroupInviteFilters = {
      address: accountAddress,
      group_id,
      user_id,
      email,
      discord_id,
      limit: Number(limit),
      offset: Number(offset),
    }

    const invites = await getGroupInvites(filters)
    return res.status(200).json(invites)
  } catch (error) {
    if (error instanceof Error) {
      return res.status(500).json({ error: error.message })
    } else {
      return res.status(500).json({ error: 'An unexpected error occurred' })
    }
  }
}

export default withSessionRoute(handle)
