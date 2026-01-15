import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { DBSlot } from '@/types/Meeting'
import {
  MeetingCancelRequest,
  MeetingInstanceUpdateRequest,
} from '@/types/Requests'
import {
  deleteMeetingFromDB,
  getAccountFromDB,
  getSlotInstance,
  updateMeetingInstance,
} from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingSessionNotFoundError,
  TimeNotAvailableError,
  TransactionIsRequired,
} from '@/utils/errors'
import { getParticipantBaseInfoFromAccount } from '@/utils/user_manager'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const identifier = req.query.identifier as string
      const meeting = await getSlotInstance(identifier)
      return res.status(200).json(meeting)
    } catch (error) {
      console.error(error)
      res.status(500).json({ error: 'Unknown error occurred' })
    }
  }
  if (req.method === 'POST') {
    const identifier = req.query.identifier as string
    const account_address = req.session.account!.address

    const existingSlot = await getSlotInstance(identifier)
    if (existingSlot.account_address !== account_address) {
      return res.status(403).send("You can't edit a meeting that is not yours")
    }

    const account = await getAccountFromDB(account_address)
    const meeting: MeetingInstanceUpdateRequest = req.body

    try {
      const meetingResult: DBSlot = await updateMeetingInstance(
        getParticipantBaseInfoFromAccount(account),
        meeting
      )
      return res.status(200).json(meetingResult)
    } catch (e) {
      console.error(e)
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingCreationError) {
        return res.status(412).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        return res.status(417).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        return res.status(405).send(e)
      } else if (e instanceof MeetingSessionNotFoundError) {
        return res.status(404).send(e.message)
      } else if (e instanceof TransactionIsRequired) {
        return res.status(400).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
    }
  } else if (req.method === 'DELETE') {
    const slotId = req.query.identifier as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }

    const request = req.body as MeetingCancelRequest

    // TODO: validate decrypted hash to make sure the user is not changing unwanted data

    // load the original slot information that is already stored in the database
    const slotsToRemove = [slotId, ...(request.meeting.related_slot_ids || [])]

    const guestsToRemove = request.meeting.participants.filter(
      p => p.guest_email
    )

    const participantActing = getParticipantBaseInfoFromAccount(
      await getAccountFromDB(req.session.account!.address)
    )

    try {
      await deleteMeetingFromDB(
        participantActing,
        slotsToRemove,
        guestsToRemove,
        request.meeting.meeting_id,
        request.currentTimezone,
        undefined,
        request.meeting?.title
      )
      return res.status(200).json({ removed: slotsToRemove })
    } catch (e) {
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        return res.status(417).send(e) // this is really bad, we will run out of http codes to use
      } else if (e instanceof MeetingCreationError) {
        return res.status(412).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        return res.status(403).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handler)
