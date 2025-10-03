import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { SaveParticipantCalendarRequest } from '@/types/QuickPoll'
import { saveQuickPollCalendar } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, body } = req
  const participantId = query.participantId as string

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' })
  }

  const { email, provider, payload }: SaveParticipantCalendarRequest = body

  if (!email || !provider) {
    return res.status(400).json({ error: 'Email and provider are required' })
  }

  try {
    const calendar = await saveQuickPollCalendar(
      participantId,
      email,
      provider,
      payload
    )

    return res.status(201).json(calendar)
  } catch (error) {
    Sentry.captureException(error)

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default handler
