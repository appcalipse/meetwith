import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { saveQuickPollCalendar } from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req
  const participantId = query.participantId as string

  if (method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ error: `Method ${method} not allowed` })
  }

  if (!participantId) {
    return res.status(400).json({ error: 'Participant ID is required' })
  }

  const { email, provider, payload } = body

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
    console.error('Save participant calendar error:', error)
    Sentry.captureException(error)

    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    })
  }
}

export default handler
