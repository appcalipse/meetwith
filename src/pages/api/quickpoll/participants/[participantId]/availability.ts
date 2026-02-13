import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { UpdateParticipantAvailabilityRequest } from '@/types/QuickPoll'
import { updateQuickPollParticipantAvailability } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req

  if (method !== 'PUT' && method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const participantId = query.participantId as string

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' })
  }

  const { available_slots, timezone }: UpdateParticipantAvailabilityRequest =
    body

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
    Sentry.captureException(error)

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default handler
