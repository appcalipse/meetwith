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

  const {
    available_slots,
    timezone,
    availability_block_ids,
  }: UpdateParticipantAvailabilityRequest = body

  const hasBlockIds =
    availability_block_ids &&
    Array.isArray(availability_block_ids) &&
    availability_block_ids.filter(Boolean).length > 0

  if (!hasBlockIds && (!available_slots || !Array.isArray(available_slots))) {
    return res.status(400).json({
      error:
        'Either available_slots or availability_block_ids must be provided',
    })
  }

  try {
    const participant = await updateQuickPollParticipantAvailability(
      participantId,
      hasBlockIds ? [] : available_slots,
      timezone,
      hasBlockIds ? { availability_block_ids } : undefined
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
