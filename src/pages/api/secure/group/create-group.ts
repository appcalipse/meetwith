import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { GetGroupsResponse } from '@/types/Group'
import { createGroupInDB } from '@/utils/database'
import { AccountNotFoundError, GroupCreationError } from '@/utils/errors'
import { getSlugFromText } from '@/utils/generic_utils'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const { name } = req.body

  if (!req.session || !req.session.account || !req.session.account.address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  const slug = getSlugFromText(name)
  const userAddress = req.session.account.address.toLowerCase()

  try {
    const newGroup: GetGroupsResponse = await createGroupInDB(
      name,
      slug,
      userAddress
    )
    return res.status(201).json(newGroup)
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

export default withSessionRoute(handle)
