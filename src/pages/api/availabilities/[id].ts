import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getAccountFromDB } from '@/utils/database'
import {
  deleteAvailabilityBlock,
  duplicateAvailabilityBlock,
  getAvailabilityBlock,
  updateAvailabilityBlock,
} from '@/utils/database'
import { UnauthorizedError } from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get the account from the session
    const account = req.session.account
    if (!account) {
      throw new UnauthorizedError()
    }

    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid availability block ID' })
    }

    switch (req.method) {
      case 'GET':
        const availability = await getAvailabilityBlock(id, account.address)
        return res.status(200).json(availability)

      case 'PUT':
        const { title, timezone, weekly_availability } = req.body
        const updatedAvailability = await updateAvailabilityBlock(
          id,
          account.address,
          title,
          timezone,
          weekly_availability
        )
        return res.status(200).json(updatedAvailability)

      case 'DELETE':
        if (id === 'default') {
          return res
            .status(400)
            .json({ error: 'Cannot delete default availability block' })
        }
        await deleteAvailabilityBlock(id, account.address)
        return res.status(200).json({ success: true })

      case 'POST':
        // Handle duplication
        const duplicatedBlock = await duplicateAvailabilityBlock(
          id,
          account.address
        )
        return res.status(200).json(duplicatedBlock)

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE', 'POST'])
        return res.status(405).end(`Method ${req.method} Not Allowed`)
    }
  } catch (error: any) {
    console.error(error)
    return res.status(error.status || 500).json({ error: error.message })
  }
}

export default withSessionRoute(handler)
