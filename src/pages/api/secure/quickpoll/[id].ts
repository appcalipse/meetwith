import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  PollStatus,
  QuickPollResponse,
  UpdateQuickPollRequest,
} from '@/types/QuickPoll'
import {
  QUICKPOLL_MAX_DURATION_MINUTES,
  QUICKPOLL_MIN_DURATION_MINUTES,
} from '@/utils/constants'
import {
  cancelQuickPoll,
  deleteQuickPoll,
  getQuickPollById,
  getQuickPollParticipants,
  updateQuickPoll,
} from '@/utils/database'
import {
  QuickPollAlreadyCancelledError,
  QuickPollAlreadyCompletedError,
  QuickPollCancellationError,
  QuickPollDeletionError,
  QuickPollNotFoundError,
  QuickPollParticipantCreationError,
  QuickPollUnauthorizedError,
  QuickPollUpdateError,
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
      const result = await getQuickPollById(pollId, address)

      const response: QuickPollResponse = {
        can_edit: result.can_edit,
        is_participant: result.is_participant,
        poll: result.poll,
      }

      return res.status(200).json(response)
    }

    if (method === 'PUT') {
      const updateData: UpdateQuickPollRequest = req.body

      // Validate dates if provided
      if (updateData.starts_at && updateData.ends_at) {
        const startsAt = new Date(updateData.starts_at)
        const endsAt = new Date(updateData.ends_at)

        if (startsAt >= endsAt) {
          throw new QuickPollValidationError(
            'Start date must be before end date'
          )
        }
      }

      if (updateData.expires_at) {
        const expiresAt = new Date(updateData.expires_at)
        const now = new Date()

        if (expiresAt <= now) {
          throw new QuickPollValidationError(
            'Expiry date must be in the future'
          )
        }
      }

      if (updateData.duration_minutes) {
        if (
          updateData.duration_minutes < QUICKPOLL_MIN_DURATION_MINUTES ||
          updateData.duration_minutes > QUICKPOLL_MAX_DURATION_MINUTES
        ) {
          throw new QuickPollValidationError(
            `Duration must be between ${QUICKPOLL_MIN_DURATION_MINUTES} minutes and ${QUICKPOLL_MAX_DURATION_MINUTES} minutes`
          )
        }
      }

      // Validate participant updates if provided
      if (updateData.participants) {
        // Validate participant data
        if (updateData.participants.toAdd) {
          for (const participant of updateData.participants.toAdd) {
            if (!participant.guest_email && !participant.guest_name) {
              throw new QuickPollValidationError(
                'Guest email or name are required for new participants'
              )
            }
          }
        }

        // Validate participant IDs for removal
        if (
          updateData.participants.toRemove &&
          updateData.participants.toRemove.length > 0
        ) {
          const existingParticipants = await getQuickPollParticipants(pollId)
          const existingParticipantIds = existingParticipants.map(p => p.id)

          const invalidIds = updateData.participants.toRemove.filter(
            id => !existingParticipantIds.includes(id)
          )
          if (invalidIds.length > 0) {
            throw new QuickPollValidationError(
              `Invalid participant IDs for removal: ${invalidIds.join(
                ', '
              )}. Valid IDs: ${existingParticipantIds.join(', ')}`
            )
          }
        }
      }

      // Trim string fields
      const cleanUpdateData = {
        ...updateData,
        description: updateData.description?.trim() || '',
        title: updateData.title?.trim(),
      }

      const poll = await updateQuickPoll(pollId, address, cleanUpdateData)

      return res.status(200).json({ poll })
    }

    if (method === 'DELETE') {
      await deleteQuickPoll(pollId, address)
      return res.status(200).json({ success: true })
    }

    if (method === 'PATCH') {
      const cancelledPoll = await cancelQuickPoll(pollId, address)

      return res.status(200).json({
        poll: cancelledPoll,
        success: true,
      })
    }
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollValidationError) {
      return res.status(400).json({ error: error.message })
    }

    if (error instanceof QuickPollNotFoundError) {
      return res.status(404).json({ error: error.message })
    }

    if (error instanceof QuickPollUnauthorizedError) {
      return res.status(403).json({ error: error.message })
    }

    if (
      error instanceof QuickPollUpdateError ||
      error instanceof QuickPollDeletionError ||
      error instanceof QuickPollCancellationError ||
      error instanceof QuickPollParticipantCreationError
    ) {
      return res.status(500).json({ error: error.message })
    }

    if (
      error instanceof QuickPollAlreadyCancelledError ||
      error instanceof QuickPollAlreadyCompletedError
    ) {
      return res.status(409).json({ error: error.message })
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
