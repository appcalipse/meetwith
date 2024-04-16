import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GetGroupsResponse } from '@/types/Group'
import { createGroupInDB } from '@/utils/database'
import { AccountNotFoundError, GroupCreationError } from '@/utils/errors'
import { getSlugFromText } from '@/utils/generic_utils'

// Main API handler function named 'handle'
const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name } = req.body

  // Check if there is a valid session with an account address
  if (!req.session || !req.session.account || !req.session.account.address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check if the name parameter is provided
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const slug = getSlugFromText(name) // Generate a slug from the name
  try {
    const newGroup: GetGroupsResponse = await createGroupInDB(name, slug)
    return res.status(201).json(newGroup)
  } catch (error) {
    if (error instanceof AccountNotFoundError) {
      return res.status(404).json({ error: 'User account not found' })
    } else if (error instanceof GroupCreationError) {
      return res
        .status(500)
        .json({ error: error.message, details: error.details })
    } else {
      return res
        .status(500)
        .json({ error: 'Internal server error', details: error.message })
    }
  }
}

// Wrap the handler function with session handling middleware
export default withSessionRoute(handle)
