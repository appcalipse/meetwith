import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { UpdateGuestQuickPollRequest } from '@/types/QuickPoll'
import { updateGuestQuickPoll } from '@/utils/database'
import {
  QuickPollNotFoundError,
  QuickPollUnauthorizedError,
  QuickPollUpdateError,
  QuickPollValidationError,
} from '@/utils/errors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { slug } = req.query
    if (!slug || typeof slug !== 'string') {
      throw new QuickPollValidationError('Poll slug is required')
    }

    const body: UpdateGuestQuickPollRequest = req.body

    if (!body.guest_identifier) {
      throw new QuickPollValidationError('Guest identifier is required')
    }

    const poll = await updateGuestQuickPoll(slug, body.guest_identifier, body)

    return res.status(200).json({ poll })
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }
    if (error instanceof QuickPollNotFoundError) {
      return res.status(404).json({ error: error.message })
    }
    if (error instanceof QuickPollUnauthorizedError) {
      return res.status(403).json({ error: error.message })
    }
    if (error instanceof QuickPollUpdateError) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}
