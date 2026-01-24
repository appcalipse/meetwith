import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  PollVisibility,
  QuickPollParticipant,
  QuickPollParticipantStatus,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import {
  addQuickPollParticipant,
  findQuickPollParticipantByIdentifier,
  getQuickPollById,
  linkQuickPollParticipantAccount,
} from '@/utils/database'
import { QuickPollPrivatePollAccessDeniedError } from '@/utils/errors'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const address = req.session.account?.address
  if (!address) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const pollId = query.id as string
  const { notification_email, display_name } = body

  if (!pollId) {
    return res.status(400).json({ error: 'Poll ID is required' })
  }

  try {
    const pollData = await getQuickPollById(pollId, address)

    // Check if user is already a participant by account_address
    const existingByAddress = pollData.poll.participants.find(
      (p: QuickPollParticipant) =>
        p.account_address?.toLowerCase() === address.toLowerCase()
    )

    if (existingByAddress) {
      // Already a participant
      return res.status(200).json({
        participant: existingByAddress,
      })
    }

    // Check if there's a pending participant with matching email that we can link
    if (notification_email) {
      const existingByEmail = await findQuickPollParticipantByIdentifier(
        pollId,
        notification_email.toLowerCase()
      )

      if (existingByEmail && !existingByEmail.account_address) {
        // Link the account to this participant
        const updatedParticipant = await linkQuickPollParticipantAccount(
          existingByEmail.id,
          address
        )

        if (updatedParticipant) {
          return res.status(200).json({
            participant: updatedParticipant,
          })
        }
      }
    }

    // add as new participant
    if (pollData.poll.visibility === PollVisibility.PUBLIC) {
      const participant = await addQuickPollParticipant(
        pollId,
        {
          account_address: address.toLowerCase(),
          guest_email: notification_email || '',
          guest_name:
            display_name || req.session.account?.preferences?.name || 'Guest',
          participant_type: QuickPollParticipantType.INVITEE,
        },
        QuickPollParticipantStatus.ACCEPTED
      )

      return res.status(201).json({ participant })
    }

    // for private polls without matching email, reject
    throw new QuickPollPrivatePollAccessDeniedError()
  } catch (error) {
    Sentry.captureException(error)

    if (error instanceof QuickPollPrivatePollAccessDeniedError) {
      return res.status(403).json({ error: error.message })
    }

    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'An unexpected error occurred',
    })
  }
}

export default withSessionRoute(handler)
