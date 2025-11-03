import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getQuickPollParticipantById } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req
  const participantId = query.participantId as string

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' })
  }

  try {
    const participant = await getQuickPollParticipantById(participantId)
    return res.status(200).json(participant)
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: 'Participant not found' })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default handler
