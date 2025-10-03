import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { PollStatus, QuickPollListResponse } from '@/types/QuickPoll'
import {
  QUICKPOLL_DEFAULT_LIMIT,
  QUICKPOLL_DEFAULT_OFFSET,
} from '@/utils/constants'
import { getQuickPollsForAccount } from '@/utils/database'
import { UnauthorizedError } from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req
  const address = req.session.account?.address

  if (!address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const {
      limit = QUICKPOLL_DEFAULT_LIMIT.toString(),
      offset = QUICKPOLL_DEFAULT_OFFSET.toString(),
      searchQuery,
    } = req.query

    // For past polls, we get both COMPLETED and CANCELLED statuses
    const result = await getQuickPollsForAccount(
      address,
      parseInt(limit as string),
      parseInt(offset as string),
      [PollStatus.COMPLETED, PollStatus.CANCELLED], // Pass multiple statuses
      searchQuery as string
    )

    const response: QuickPollListResponse = {
      polls: result.polls,
      total_count: result.total_count,
      has_more: result.has_more,
    }

    return res.status(200).json(response)
  } catch (error) {
    Sentry.captureException(error)

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
