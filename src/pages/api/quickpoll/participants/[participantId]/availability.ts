import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { updateQuickPollParticipantAvailability } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req
  const participantId = query.participantId as string

  if (method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH'])
    return res.status(405).json({ error: `Method ${method} not allowed` })
  }

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' })
  }

  const { available_slots, timezone } = body

  if (!available_slots || !Array.isArray(available_slots)) {
    return res
      .status(400)
      .json({ error: 'Available slots must be provided as an array' })
  }

  try {
    const participant = await updateQuickPollParticipantAvailability(
      participantId,
      available_slots,
      timezone
    )

    return res.status(200).json(participant)
  } catch (error) {
    console.error('Update participant availability error:', error)
    Sentry.captureException(error)

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}

export default handler
