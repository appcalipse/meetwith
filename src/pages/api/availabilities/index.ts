import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CreateAvailabilityBlockRequest } from '@/types/Requests'
import {
  createAvailabilityBlock,
  getAvailabilityBlocks,
} from '@/utils/database'
import {
  InvalidAvailabilityBlockError,
  UnauthorizedError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const account = req.session.account
    if (!account) {
      throw new UnauthorizedError()
    }

    const address = account.address

    if (req.method === 'GET') {
      const blocks = await getAvailabilityBlocks(address)
      const transformedBlocks = blocks.map(block => ({
        ...block,
        availabilities: block.weekly_availability,
      }))
      return res.status(200).json(transformedBlocks)
    }

    if (req.method === 'POST') {
      const { title, timezone, weekly_availability, is_default } =
        req.body as CreateAvailabilityBlockRequest
      if (!title || !timezone || !weekly_availability) {
        throw new InvalidAvailabilityBlockError('Missing required fields')
      }

      const newBlock = await createAvailabilityBlock(
        address,
        title,
        timezone,
        weekly_availability,
        is_default
      )
      return res.status(200).json({
        ...newBlock,
        isDefault: is_default,
        availabilities: newBlock.weekly_availability,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    } else if (error instanceof InvalidAvailabilityBlockError) {
      return res.status(400).json({ error: error.message })
    }

    Sentry.captureException(error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}

export default withSessionRoute(handler)
