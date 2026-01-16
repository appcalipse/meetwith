import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { AddParticipantRequest } from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  addQuickPollParticipant,
  getQuickPollById,
  getQuickPollParticipants,
} from '@/utils/database'
import {
  QuickPollNotFoundError,
  QuickPollParticipantCreationError,
  QuickPollPermissionDeniedError,
  QuickPollUnauthorizedError,
  QuickPollValidationError,
  UnauthorizedError,
} from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query } = req
  const address = req.session.account?.address
  const pollId = query.id as string

  if (!address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!pollId) {
    return res.status(400).json({ error: 'Poll ID is required' })
  }

  try {
    if (method === 'GET') {
      const participants = await getQuickPollParticipants(pollId)
      return res.status(200).json({ participants })
    }

    if (method === 'POST') {
      const participantData: AddParticipantRequest = req.body

      // Validate required fields
      if (!participantData.guest_email) {
        throw new QuickPollValidationError('Email is required')
      }

      if (!participantData.participant_type) {
        throw new QuickPollValidationError('Participant type is required')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(participantData.guest_email)) {
        throw new QuickPollValidationError('Invalid email format')
      }

      // Check if user has permission to add participants
      const pollDetails = await getQuickPollById(pollId, address)
      if (
        !pollDetails.can_edit &&
        !pollDetails.poll.permissions.includes(MeetingPermissions.INVITE_GUESTS)
      ) {
        throw new QuickPollPermissionDeniedError(
          'You do not have permission to add participants'
        )
      }

      const participant = await addQuickPollParticipant(pollId, {
        account_address: participantData.account_address,
        guest_email: participantData.guest_email.trim().toLowerCase(),
        guest_name: participantData.guest_name?.trim() || 'Guest',
        participant_type: participantData.participant_type,
      })

      return res.status(201).json({ participant })
    }
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }

    if (error instanceof QuickPollNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    if (
      error instanceof QuickPollUnauthorizedError ||
      error instanceof QuickPollPermissionDeniedError
    ) {
      return res.status(403).json({ error: error.message })
    }

    if (error instanceof QuickPollParticipantCreationError) {
      return res.status(500).json({ error: error.message })
    }

    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default withSessionRoute(handler)
