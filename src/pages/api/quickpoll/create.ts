import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CreateGuestQuickPollRequest } from '@/types/QuickPoll'
import {
  QUICKPOLL_MAX_DURATION_MINUTES,
  QUICKPOLL_MIN_DURATION_MINUTES,
} from '@/utils/constants'
import {
  createGuestQuickPoll,
  getQuickPollSchedulerParticipantIdForPoll,
  saveQuickPollCalendar,
} from '@/utils/database'
import {
  QuickPollCreationError,
  QuickPollValidationError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const pollData: CreateGuestQuickPollRequest = req.body

    if (!pollData.title || !pollData.duration_minutes) {
      throw new QuickPollValidationError('Missing required fields')
    }

    if (!pollData.starts_at || !pollData.ends_at) {
      throw new QuickPollValidationError('Missing date fields')
    }

    if (!pollData.guest_email) {
      throw new QuickPollValidationError('Email is required')
    }

    if (!pollData.guest_identifier) {
      throw new QuickPollValidationError('Guest identifier is required')
    }

    if (!pollData.permissions || !Array.isArray(pollData.permissions)) {
      throw new QuickPollValidationError('Invalid permissions')
    }

    const startsAt = new Date(pollData.starts_at)
    const endsAt = new Date(pollData.ends_at)
    const now = new Date()

    if (startsAt >= endsAt) {
      throw new QuickPollValidationError('Start date must be before end date')
    }

    if (pollData.expires_at !== null && pollData.expires_at !== undefined) {
      const expiresAt = new Date(pollData.expires_at)
      if (expiresAt <= now) {
        throw new QuickPollValidationError('Expiry date must be in the future')
      }
    }

    if (
      pollData.duration_minutes < QUICKPOLL_MIN_DURATION_MINUTES ||
      pollData.duration_minutes > QUICKPOLL_MAX_DURATION_MINUTES
    ) {
      throw new QuickPollValidationError(
        `Duration must be between ${QUICKPOLL_MIN_DURATION_MINUTES} minutes and ${QUICKPOLL_MAX_DURATION_MINUTES} minutes`
      )
    }

    const createPayload: CreateGuestQuickPollRequest = {
      description: pollData.description?.trim() || '',
      duration_minutes: pollData.duration_minutes,
      ends_at: pollData.ends_at,
      expires_at: pollData.expires_at ?? null,
      guest_email: pollData.guest_email.trim().toLowerCase(),
      guest_identifier: pollData.guest_identifier,
      guest_name: pollData.guest_name?.trim() || '',
      participants: pollData.participants || [],
      permissions: pollData.permissions,
      starts_at: pollData.starts_at,
      title: pollData.title.trim(),
    }

    if (pollData.custom_availability) {
      createPayload.custom_availability = pollData.custom_availability
    }

    const poll = await createGuestQuickPoll(createPayload)

    const pending = req.session.quickPollPendingCalendar
    if (pending && poll?.id) {
      const schedulerId = await getQuickPollSchedulerParticipantIdForPoll(
        poll.id
      )
      if (schedulerId) {
        try {
          await saveQuickPollCalendar(
            schedulerId,
            pending.email,
            pending.provider,
            pending.payload,
            pending.calendars
          )
        } catch (calendarError) {
          Sentry.captureException(calendarError)
        }
      }
      delete req.session.quickPollPendingCalendar
      await req.session.save()
    }

    return res.status(201).json({ poll })
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }

    if (error instanceof QuickPollCreationError) {
      return res.status(500).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default withSessionRoute(handler)
