import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getGroupInvitesFromDB } from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { group_id, user_id, email, discord_id } = req.query as {
    group_id?: string
    user_id?: string
    email?: string
    discord_id?: string
  }
  const session = req.session

  if (!session || !session.account) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Extract email from preferences if available - fix
  // const accountEmail = session.account.preferences?.email

  // Extract discord_id from discord_account if available
  const accountDiscordId = session.account.discord_account?.discord_id

  // Verify the user can only search for their own invites
  if (user_id && user_id !== session.account.id) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (email && email !== accountEmail) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (discord_id && discord_id !== accountDiscordId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const invites = await getGroupInvitesFromDB({
      group_id,
      user_id,
      email,
      discord_id,
    })
    return res.status(200).json(invites)
  } catch (error) {
    console.error('Error fetching group invites:', error)
    return res.status(500).json({ error: 'Failed to fetch group invites' })
  }
}

export default withSessionRoute(handle)
