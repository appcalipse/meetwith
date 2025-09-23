import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { updateQuickPollGuestDetails } from '@/utils/database'

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

  const { guest_name, guest_email } = body

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
    console.error('Update guest details error:', error)
    Sentry.captureException(error)

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}

export default handler
