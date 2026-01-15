import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  AddOrUpdateGuestParticipantRequest,
  PollVisibility,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import {
  addQuickPollParticipant,
  getQuickPollBySlug,
  getQuickPollParticipantByIdentifier,
  updateQuickPollGuestDetails,
  updateQuickPollParticipantAvailability,
  updateQuickPollParticipantStatus,
} from '@/utils/database'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, body } = req
  const slug = query.slug as string

  if (!slug) {
    return res.status(400).json({ error: 'Poll slug is required' })
  }

  try {
    const {
      guest_email,
      guest_name,
      available_slots,
      timezone,
    }: AddOrUpdateGuestParticipantRequest = body

    if (!guest_email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!available_slots || !Array.isArray(available_slots)) {
      return res
        .status(400)
        .json({ error: 'Available slots must be provided as an array' })
    }

    const pollData = await getQuickPollBySlug(slug)

    let participant
    let participantExists = false

    try {
      participant = await getQuickPollParticipantByIdentifier(
        pollData.poll.id,
        guest_email.trim().toLowerCase()
      )
      participantExists = true
    } catch (_error) {
      participantExists = false
    }

    if (
      pollData.poll.visibility === PollVisibility.PRIVATE &&
      !participantExists
    ) {
      return res.status(403).json({
        error:
          'This is a private poll. Only invited participants can add availability.',
      })
    }

    if (participantExists && participant) {
      // Update existing participant's details if name is provided
      if (guest_name) {
        participant = await updateQuickPollGuestDetails(
          participant.id,
          guest_name.trim(),
          guest_email.trim().toLowerCase()
        )
      }

      // Update availability
      participant = await updateQuickPollParticipantAvailability(
        participant.id,
        available_slots,
        timezone
      )
    } else {
      // Create new participant
      participant = await addQuickPollParticipant(pollData.poll.id, {
        guest_email: guest_email.trim().toLowerCase(),
        guest_name: guest_name?.trim() || 'Guest',
        participant_type: QuickPollParticipantType.INVITEE,
      })

      // Update availability for the new participant
      participant = await updateQuickPollParticipantAvailability(
        participant.id,
        available_slots,
        timezone
      )

      participant = await updateQuickPollParticipantStatus(
        participant.id,
        QuickPollParticipantStatus.ACCEPTED
      )
    }

    return res.status(200).json({ participant })
  } catch (error) {
    Sentry.captureException(error)

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default handler
