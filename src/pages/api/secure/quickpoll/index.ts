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
import {
  countActiveQuickPolls,
  createQuickPoll,
  getQuickPollsForAccount,
} from '@/utils/database'
import { isProAccountAsync } from '@/utils/database'
import {
  QuickPollCreationError,
  QuickPollLimitExceededError,
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
        searchQuery,
      } = req.query

      const result = await getQuickPollsForAccount(
        address,
        parseInt(limit as string),
        parseInt(offset as string),
        status as PollStatus,
        searchQuery as string
      )

      // Check subscription status for filtering
      const isPro = await isProAccountAsync(address)

      if (!isPro && (status === PollStatus.ONGOING || !status)) {
        // Free tier: return only first 2 active polls
        // Filter active polls (ONGOING status and not expired)
        const now = new Date()
        const activePolls = result.polls.filter(
          poll =>
            poll.status === PollStatus.ONGOING &&
            new Date(poll.expires_at) > now
        )
        const otherPolls = result.polls.filter(
          poll =>
            poll.status !== PollStatus.ONGOING ||
            new Date(poll.expires_at) <= now
        )

        const limitedActivePolls = activePolls.slice(0, 2)
        const filteredPolls = [...limitedActivePolls, ...otherPolls]

        const hiddenActivePolls = Math.max(0, activePolls.length - 2)

        const response: QuickPollListResponse = {
          polls: filteredPolls,
          total_count: result.total_count,
          has_more: result.has_more,
          hidden: hiddenActivePolls,
          upgradeRequired: activePolls.length > 2,
        }

        return res.status(200).json(response)
      }

      // Pro: return all polls
      const response: QuickPollListResponse = {
        polls: result.polls,
        total_count: result.total_count,
        has_more: result.has_more,
        hidden: 0,
        upgradeRequired: false,
      }

      return res.status(200).json(response)
    }

    if (method === 'POST') {
      const pollData: CreateQuickPollRequest = req.body

      // Validate required fields
      if (!pollData.title || !pollData.duration_minutes) {
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

      // Check subscription status for feature limits
      const isPro = await isProAccountAsync(address)

      if (!isPro) {
        // Free tier restriction: Maximum 2 active polls
        const activePollCount = await countActiveQuickPolls(address)
        if (activePollCount >= 2) {
          throw new QuickPollLimitExceededError()
        }
      }

      const poll = await createQuickPoll(address, {
        title: pollData.title.trim(),
        description: pollData.description?.trim() || '',
        duration_minutes: pollData.duration_minutes,
        starts_at: pollData.starts_at,
        ends_at: pollData.ends_at,
        expires_at: pollData.expires_at,
        permissions: pollData.permissions,
        participants: pollData.participants || [],
      })

      return res.status(201).json({ poll })
    }
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }

    if (error instanceof QuickPollLimitExceededError) {
      return res.status(403).json({ error: error.message })
    }

    if (error instanceof QuickPollCreationError) {
      return res.status(500).json({ error: error.message })
    }

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default withSessionRoute(handler)
