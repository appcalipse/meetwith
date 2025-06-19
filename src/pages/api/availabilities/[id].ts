import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  DuplicateAvailabilityBlockRequest,
  UpdateAvailabilityBlockRequest,
} from '@/types/Requests'
import {
  deleteAvailabilityBlock,
  duplicateAvailabilityBlock,
  getAvailabilityBlock,
  updateAvailabilityBlock,
} from '@/utils/database'
import {
  AvailabilityBlockNotFoundError,
  DefaultAvailabilityBlockError,
  InvalidAvailabilityBlockError,
  UnauthorizedError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid availability block ID' })
  }

  try {
    const account = req.session.account
    if (!account) {
      throw new UnauthorizedError()
    }

    if (req.method === 'GET') {
      const availability = await getAvailabilityBlock(id, account.address)
      return res.status(200).json({
        ...availability,
        availabilities: availability.weekly_availability,
      })
    }

    if (req.method === 'PUT') {
      const { title, timezone, weekly_availability, is_default } =
        req.body as UpdateAvailabilityBlockRequest
      if (!title || !timezone || !weekly_availability) {
        throw new InvalidAvailabilityBlockError('Missing required fields')
      }

      const updatedAvailability = await updateAvailabilityBlock(
        id,
        account.address,
        title,
        timezone,
        weekly_availability,
        is_default
      )

      return res.status(200).json({
        ...updatedAvailability,
        isDefault: is_default,
        availabilities: updatedAvailability.weekly_availability,
      })
    }

    if (req.method === 'DELETE') {
      await deleteAvailabilityBlock(id, account.address)
      return res.status(200).json({ success: true })
    }

    if (req.method === 'POST') {
      const modifiedData =
        req.body as DuplicateAvailabilityBlockRequest['modifiedData']
      const duplicatedBlock = await duplicateAvailabilityBlock(
        id,
        account.address,
        modifiedData
      )

      return res.status(200).json({
        ...duplicatedBlock,
        isDefault: modifiedData.is_default,
        availabilities: duplicatedBlock.weekly_availability,
      })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (error: unknown) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    } else if (error instanceof AvailabilityBlockNotFoundError) {
      return res.status(404).json({ error: error.message })
    } else if (error instanceof DefaultAvailabilityBlockError) {
      return res.status(409).json({ error: error.message })
    } else if (error instanceof InvalidAvailabilityBlockError) {
      return res.status(400).json({ error: error.message })
    }

    Sentry.captureException(error)
    return res.status(500).json({ error: 'An error occurred' })
  }
}

export default withSessionRoute(handler)
