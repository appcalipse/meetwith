import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CreateGroupPayload, CreateGroupsResponse } from '@/types/Group'
import { createGroupInDB } from '@/utils/database'
import { AccountNotFoundError, GroupCreationError } from '@/utils/errors'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const { name, slug } = req.body as CreateGroupPayload

  const account_address = req.session.account!.address

  if (!account_address) {
    return res.status(401).send('Unauthorized')
  }
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const newGroupData: CreateGroupsResponse = await createGroupInDB(
      name,
      account_address,
      slug
    )
    return res.status(201).json(newGroupData)
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return res.status(404).json({ error: 'User account not found' })
    } else if (error instanceof GroupCreationError) {
      return res
        .status(500)
        .json({ error: error.message, details: error.details })
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        details: (error as Error).message,
      })
    }
  }
}

// Wrap the handler function with session handling middleware
export default withSessionRoute(handle)
