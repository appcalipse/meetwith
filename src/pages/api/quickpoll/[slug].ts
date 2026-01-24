import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { PollStatus } from '@/types/QuickPoll'
import { getQuickPollBySlug } from '@/utils/database'
import {
  QuickPollAlreadyCancelledError,
  QuickPollAlreadyCompletedError,
  QuickPollExpiredError,
  QuickPollSlugNotFoundError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const slug = query.slug as string

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' })
  }

  try {
    const result = await getQuickPollBySlug(slug)

    // Check if poll is expired or has ended
    if (result.poll.expires_at !== null) {
      const now = new Date()
      const expiresAt = new Date(result.poll.expires_at)

      if (now > expiresAt) {
        throw new QuickPollExpiredError()
      }
    }

    if (result.poll.status === PollStatus.COMPLETED) {
      throw new QuickPollAlreadyCompletedError()
    }

    if (result.poll.status === PollStatus.CANCELLED) {
      throw new QuickPollAlreadyCancelledError()
    }

    return res.status(200).json(result)
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollSlugNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof QuickPollExpiredError) {
      return res.status(410).json({ error: error.message })
    }

    if (error instanceof QuickPollAlreadyCompletedError) {
      return res.status(410).json({ error: error.message })
    }

    if (error instanceof QuickPollAlreadyCancelledError) {
      return res.status(410).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default handler
