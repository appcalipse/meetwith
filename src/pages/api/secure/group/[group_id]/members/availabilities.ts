import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getGroup,
  getGroupMembersAvailabilities,
  initDB,
} from '@/utils/database'
import { GroupNotExistsError, NotGroupMemberError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    initDB()
    const account_address = req.session.account!.address
    if (!account_address) {
      return res.status(401).send('Unauthorized')
    }

    const group_id = req.query.group_id as string

    if (!group_id) {
      return res.status(400).json({ error: 'Group ID is required' })
    }

    if (req.method === 'GET') {
      // Verify user is a member of the group
      await getGroup(group_id, account_address)

      // Get all members' availabilities
      const membersAvailabilities =
        await getGroupMembersAvailabilities(group_id)

      return res.status(200).json(membersAvailabilities)
    }
  } catch (error: unknown) {
    if (error instanceof NotGroupMemberError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof GroupNotExistsError) {
      return res.status(404).json({ error: error.message })
    }
    return res.status(500).json({
      details:
        typeof error === 'object' && error !== null && 'details' in error
          ? error.details
          : undefined,
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return res.status(405).send('Method not allowed')
}

export default withSessionRoute(handle)
