import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { UpdateAvailabilityBlockMeetingTypesRequest } from '@/types/Requests'
import {
  getMeetingTypesForAvailabilityBlock,
  updateAvailabilityBlockMeetingTypes,
} from '@/utils/database'
import {
  AvailabilityBlockNotFoundError,
  UnauthorizedError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const account = req.session.account
    if (!account) {
      throw new UnauthorizedError()
    }

    const address = account.address
    const availability_block_id = req.query.id as string

    if (req.method === 'GET') {
      const meetingTypes = await getMeetingTypesForAvailabilityBlock(
        address,
        availability_block_id
      )
      return res.status(200).json(meetingTypes)
    }

    if (req.method === 'PATCH') {
      const { meeting_type_ids } =
        req.body as UpdateAvailabilityBlockMeetingTypesRequest

      if (!meeting_type_ids || !Array.isArray(meeting_type_ids)) {
        return res
          .status(400)
          .json({ error: 'meeting_type_ids must be an array' })
      }

      await updateAvailabilityBlockMeetingTypes(
        address,
        availability_block_id,
        meeting_type_ids
      )

      return res.status(200).json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    } else if (error instanceof AvailabilityBlockNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    console.error('Error in availability block meeting types API:', error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}

export default withSessionRoute(handler)
