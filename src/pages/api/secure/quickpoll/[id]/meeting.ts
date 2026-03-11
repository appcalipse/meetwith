import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { createQuickPollMeeting } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req
  const address = req.session.account?.address
  const pollId = query.id as string

  if (!address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!pollId) {
    return res.status(400).json({ error: 'Poll ID is required' })
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { meeting_id } = body as { meeting_id?: string }

    if (!meeting_id) {
      return res.status(400).json({ error: 'meeting_id is required' })
    }

    await createQuickPollMeeting(pollId, meeting_id)

    return res.status(201).json({ success: true })
  } catch (error) {
    Sentry.captureException(error)

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default withSessionRoute(handler)
