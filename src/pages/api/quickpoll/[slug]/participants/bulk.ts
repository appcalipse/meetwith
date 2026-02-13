import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import { QuickPollBulkAddParticipants } from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  getQuickPollBySlug,
  updateQuickPollParticipants,
} from '@/utils/database'

type GuestBulkAddParticipantsRequest = {
  participants: QuickPollBulkAddParticipants
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method, query } = req

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const slug = query.slug as string
  if (!slug) {
    return res.status(400).json({ error: 'Poll slug is required' })
  }

  try {
    const body: GuestBulkAddParticipantsRequest = req.body
    const { participants } = body || {}

    if (
      !participants ||
      !Array.isArray(participants) ||
      participants.length === 0
    ) {
      return res.status(400).json({ error: 'Participants array is required' })
    }

    const pollData = await getQuickPollBySlug(slug)
    const pollId = pollData.poll.id

    const hasInvitePermission =
      pollData.poll.permissions?.includes(MeetingPermissions.INVITE_GUESTS) ||
      false

    if (!hasInvitePermission) {
      return res
        .status(403)
        .json({ error: 'You do not have permission to add participants' })
    }

    const participantData = participants.map(p => ({
      account_address: p.account_address,
      guest_email: p.guest_email.trim().toLowerCase(),
      guest_name: p.guest_name,
      participant_type: p.participant_type,
      status: p.status,
    }))

    await updateQuickPollParticipants(pollId, { toAdd: participantData })

    return res.status(200).json({ success: true })
  } catch (error) {
    Sentry.captureException(error)
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}
