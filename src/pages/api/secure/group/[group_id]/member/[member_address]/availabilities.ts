import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getGroupMemberAvailabilities,
  initDB,
  updateGroupMemberAvailabilities,
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
    const member_address = req.query.member_address as string

    if (!group_id || !member_address) {
      return res
        .status(400)
        .json({ error: 'Group ID and member address are required' })
    }

    if (req.method === 'GET') {
      const availabilities = await getGroupMemberAvailabilities(
        group_id,
        member_address
      )
      return res.status(200).json(availabilities)
    }

    if (req.method === 'PUT') {
      // Only the member themselves can update their own availabilities
      if (account_address.toLowerCase() !== member_address.toLowerCase()) {
        return res.status(403).json({
          error: 'You can only update your own availability blocks',
        })
      }

      const { availability_ids } = req.body as { availability_ids: string[] }

      if (!Array.isArray(availability_ids)) {
        return res
          .status(400)
          .json({ error: 'availability_ids must be an array' })
      }

      await updateGroupMemberAvailabilities(
        group_id,
        member_address,
        availability_ids
      )

      return res.status(200).json({
        success: true,
      })
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
