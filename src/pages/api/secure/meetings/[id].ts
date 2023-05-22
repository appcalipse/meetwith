import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { DBSlotEnhanced } from '@/types/Meeting'
import { MeetingCancelRequest, MeetingUpdateRequest } from '@/types/Requests'
import {
  deleteMeetingFromDB,
  getAccountFromDB,
  getMeetingFromDB,
  initDB,
  updateMeeting,
} from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingChangeConflictError,
  MeetingCreationError,
  TimeNotAvailableError,
} from '@/utils/errors'
import { getParticipantBaseInfoFromAccount } from '@/utils/user_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }

    // load the original slot information that is already stored in the database
    const existingSlot = await getMeetingFromDB(slotId)

    // validate ownership
    const account_address = req.session.account!.address
    const account = await getAccountFromDB(account_address)

    const meeting: MeetingUpdateRequest = req.body as MeetingUpdateRequest

    if (existingSlot.account_address !== account_address) {
      return res.status(403).send("You can't edit a meeting that is not yours")
    }

    if (
      meeting.participants_mapping.filter(
        participant =>
          participant.account_address?.toLowerCase() ===
          account.address.toLowerCase()
      ).length === 0
    ) {
      return res
        .status(403)
        .send('You cant schedule a meeting for someone else')
    }

    try {
      const meetingResult: DBSlotEnhanced = await updateMeeting(
        getParticipantBaseInfoFromAccount(account),
        meeting
      )
      return res.status(200).json(meetingResult)
    } catch (e) {
      if (e instanceof TimeNotAvailableError) {
        return res.status(409).send(e)
      } else if (e instanceof MeetingCreationError) {
        return res.status(412).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        return res.status(417).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        return res.status(405).send(e)
      } else {
        Sentry.captureException(e)
        return res.status(500).send(e)
      }
    }
  } else if (req.method === 'DELETE') {
    initDB()
    const slotId = req.query.id as string
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
        request.currentTimezone
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

export default withSentry(withSessionRoute(handle))
