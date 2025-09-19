import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  CreateQuickPollRequest,
  PollStatus,
  QuickPollListResponse,
} from '@/types/QuickPoll'
import {
  QUICKPOLL_DEFAULT_LIMIT,
  QUICKPOLL_DEFAULT_OFFSET,
  QUICKPOLL_MAX_DURATION_MINUTES,
  QUICKPOLL_MIN_DURATION_MINUTES,
} from '@/utils/constants'
import { createQuickPoll, getQuickPollsForAccount } from '@/utils/database'
import {
  QuickPollCreationError,
  QuickPollValidationError,
  UnauthorizedError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const address = req.session.account?.address

  if (!address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    if (method === 'GET') {
      const {
        limit = QUICKPOLL_DEFAULT_LIMIT.toString(),
        offset = QUICKPOLL_DEFAULT_OFFSET.toString(),
        status,
      } = req.query

      const result = await getQuickPollsForAccount(
        address,
        parseInt(limit as string),
        parseInt(offset as string),
        status as PollStatus
      )

      const response: QuickPollListResponse = {
        polls: result.polls,
        total_count: result.total_count,
        has_more: result.has_more,
      }

      return res.status(200).json(response)
    }

    if (method === 'POST') {
      const pollData: CreateQuickPollRequest = req.body

      // Validate required fields
      if (
        !pollData.title ||
        !pollData.description ||
        !pollData.duration_minutes
      ) {
        throw new QuickPollValidationError('Missing required fields')
      }

      if (!pollData.starts_at || !pollData.ends_at || !pollData.expires_at) {
        throw new QuickPollValidationError('Missing date fields')
      }

      if (!pollData.permissions || !Array.isArray(pollData.permissions)) {
        throw new QuickPollValidationError('Invalid permissions')
      }

      // Validate dates
      const startsAt = new Date(pollData.starts_at)
      const endsAt = new Date(pollData.ends_at)
      const expiresAt = new Date(pollData.expires_at)
      const now = new Date()

      if (startsAt >= endsAt) {
        throw new QuickPollValidationError('Start date must be before end date')
      }

      if (expiresAt <= now) {
        throw new QuickPollValidationError('Expiry date must be in the future')
      }

      if (
        pollData.duration_minutes < QUICKPOLL_MIN_DURATION_MINUTES ||
        pollData.duration_minutes > QUICKPOLL_MAX_DURATION_MINUTES
      ) {
        throw new QuickPollValidationError(
          `Duration must be between ${QUICKPOLL_MIN_DURATION_MINUTES} minutes and ${QUICKPOLL_MAX_DURATION_MINUTES} minutes`
        )
      }

      const poll = await createQuickPoll(address, {
        title: pollData.title.trim(),
        description: pollData.description.trim(),
        duration_minutes: pollData.duration_minutes,
        starts_at: pollData.starts_at,
        ends_at: pollData.ends_at,
        expires_at: pollData.expires_at,
        permissions: pollData.permissions,
        participants: pollData.participants || [],
      })

      return res.status(201).json({ poll })
    }

    res.setHeader('Allow', ['GET', 'POST'])
    return res.status(405).json({ error: `Method ${method} not allowed` })
  } catch (error) {
    console.error('QuickPoll API error:', error)
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }

    if (error instanceof QuickPollCreationError) {
      return res.status(500).json({ error: error.message })
    }

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}

export default withSessionRoute(handler)
