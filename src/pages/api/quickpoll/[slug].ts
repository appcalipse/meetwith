import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { PollStatus } from '@/types/QuickPoll'
import { getQuickPollBySlug } from '@/utils/database'
import {
  QuickPollExpiredError,
  QuickPollSlugNotFoundError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req
  const slug = query.slug as string

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${method} not allowed` })
  }

  if (!slug) {
    return res.status(400).json({ error: 'Slug is required' })
  }

  try {
    const result = await getQuickPollBySlug(slug)

    // Check if poll is expired
    const now = new Date()
    const expiresAt = new Date(result.poll.expires_at)
    if (
      now > expiresAt ||
      result.poll.status === PollStatus.COMPLETED ||
      result.poll.status === PollStatus.CANCELLED
    ) {
      throw new QuickPollExpiredError()
    }

    return res.status(200).json(result)
  } catch (error) {
    console.error('QuickPoll Public API error:', error)
    Sentry.captureException(error)

    if (error instanceof QuickPollSlugNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof QuickPollExpiredError) {
      return res.status(410).json({ error: error.message })
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}

export default handler
