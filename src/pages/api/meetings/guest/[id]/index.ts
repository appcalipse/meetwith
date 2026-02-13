import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { GuestMeetingCancel } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'
import { MeetingUpdateRequest } from '@/types/Requests'
import {
  getConferenceDataBySlotId,
  handleGuestCancel,
  updateMeeting,
} from '@/utils/database'
import {
  MeetingChangeConflictError,
  MeetingNotFoundError,
  MeetingSessionNotFoundError,
  TimeNotAvailableError,
  TransactionIsRequired,
  UnauthorizedError,
} from '@/utils/errors'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    if (!req.query.id) {
      return res.status(404).send('Id parameter required')
    }

    try {
      const meeting = await getConferenceDataBySlotId(req.query.id as string)
      if (!meeting) {
        return res.status(404).send('Not found')
      }
      return res.status(200).json(meeting)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  } else if (req.method === 'PUT') {
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }

    const meetingUpdateRequest: MeetingUpdateRequest =
      req.body as MeetingUpdateRequest
    if (!meetingUpdateRequest) {
      return res.status(400).send('Invalid update request')
    }

    try {
      const schedulerParticipant =
        meetingUpdateRequest.participants_mapping.find(
          p => p.type === ParticipantType.Scheduler
        )

      const participantActing = {
        account_address: schedulerParticipant?.account_address || '',
        guest_email: schedulerParticipant?.guest_email || '',
        name: schedulerParticipant?.name || 'Guest',
      }

      const meetingResult = await updateMeeting(
        participantActing,
        meetingUpdateRequest
      )
      return res.status(200).json(meetingResult)
    } catch (e) {
      Sentry.captureException(e)
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingNotFoundError) {
        return res.status(404).send(e.message)
      } else if (e instanceof UnauthorizedError) {
        return res.status(401).send(e.message)
      } else if (e instanceof MeetingChangeConflictError) {
        return res.status(417).send(e)
      } else if (e instanceof TransactionIsRequired) {
        return res.status(400).send(e)
      } else if (e instanceof MeetingSessionNotFoundError) {
        return res.status(404).send(e.message)
      }
      return res.status(500).send(e)
    }
  } else if (req.method === 'DELETE') {
    const { metadata, currentTimezone, reason } = req.body as GuestMeetingCancel
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }
    if (!metadata) {
      return res.status(400).send('Invalid cancel request')
    }

    try {
      await handleGuestCancel(metadata, slotId, currentTimezone, reason)
      return res.status(200).send({ success: true })
    } catch (e) {
      Sentry.captureException(e)
      if (e instanceof MeetingNotFoundError) {
        return res.status(404).send(e.message)
      } else if (e instanceof UnauthorizedError) {
        return res.status(401).send(e.message)
      } else if (e instanceof TransactionIsRequired) {
        return res.status(400).send(e)
      }
      return res.status(500).send(e)
    }
  }

  return res.status(404).send('Not found')
}

export default handler
