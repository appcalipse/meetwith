import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { BulkAddParticipantsRequest } from '@/utils/api_helper'
import { updateQuickPollParticipants } from '@/utils/database'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    const { participants }: BulkAddParticipantsRequest = req.body

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Poll ID is required' })
    }

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return res.status(400).json({ error: 'Participants array is required' })
    }

    const participantData = participants.map(p => ({
      account_address: p.account_address,
      guest_email: p.guest_email,
      guest_name: p.guest_name,
      participant_type: p.participant_type,
      status: p.status,
    }))

    await updateQuickPollParticipants(id, {
      toAdd: participantData,
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}
