import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { UpdateGuestDetailsRequest } from '@/types/QuickPoll'
import { updateQuickPollGuestDetails } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req

  if (method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const participantId = query.participantId as string

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' })
  }

  const { guest_name, guest_email }: UpdateGuestDetailsRequest = body

  if (!guest_name || !guest_email) {
    return res.status(400).json({ error: 'Guest name and email are required' })
  }

  try {
    const participant = await updateQuickPollGuestDetails(
      participantId,
      guest_name,
      guest_email
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
