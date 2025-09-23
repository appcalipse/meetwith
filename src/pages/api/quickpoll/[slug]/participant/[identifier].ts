import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  getQuickPollBySlug,
  getQuickPollParticipantByIdentifier,
} from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req
  const slug = query.slug as string
  const identifier = decodeURIComponent(query.identifier as string)

  if (method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).json({ error: `Method ${method} not allowed` })
  }

  if (!slug || !identifier) {
    return res
      .status(400)
      .json({ error: 'Poll slug and identifier are required' })
  }

  try {
    // First get the poll by slug to get the poll ID
    const pollData = await getQuickPollBySlug(slug)

    const participant = await getQuickPollParticipantByIdentifier(
      pollData.poll.id,
      identifier
    )

    return res.status(200).json(participant)
  } catch (error) {
    console.error('Get participant by identifier error:', error)
    Sentry.captureException(error)

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}

export default handler
