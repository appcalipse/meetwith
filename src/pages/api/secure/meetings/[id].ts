import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  DBSlotEnhanced,
  MeetingDecrypted,
  MeetingUpdateRequest,
} from '@/types/Meeting'
import { withSessionRoute } from '@/utils/auth/withSessionApiRoute'
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
      res.status(403).send("You can't edit a meeting that is not yours")
      return
    }

    if (
      meeting.participants_mapping.filter(
        participant => participant.account_address === account.address
      ).length === 0
    ) {
      res.status(403).send('You cant schedule a meeting for someone else')
      return
    }

    try {
      const meetingResult: DBSlotEnhanced = await updateMeeting(meeting)
      res.status(200).json(meetingResult)
    } catch (e) {
      console.error(e)
      if (e instanceof TimeNotAvailableError) {
        res.status(409).send(e)
      } else if (e instanceof MeetingCreationError) {
        res.status(412).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        res.status(417).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        res.status(405).send(e)
      } else {
        Sentry.captureException(e)
        res.status(500).send(e)
      }
    }

    return
  } else if (req.method === 'DELETE') {
    initDB()
    const slotId = req.query.id as string
    if (!slotId) {
      return res.status(400).send('Required parameter not provided')
    }

    const decrypted = req.body as MeetingDecrypted

    // TODO: validate decrypted hash to make sure the user is not changing unwanted data

    // load the original slot information that is already stored in the database
    const slotsToRemove = [slotId, ...(decrypted.related_slot_ids || [])]

    try {
      await deleteMeetingFromDB(req.session.account!.address, slotsToRemove)
      res.status(200).json({ removed: slotsToRemove })
    } catch (e) {
      console.error(e)
      if (e instanceof TimeNotAvailableError) {
        res.status(409).send(e)
      } else if (e instanceof MeetingChangeConflictError) {
        res.status(417).send(e) // this is really bad, we will run out of http codes to use
      } else if (e instanceof MeetingCreationError) {
        res.status(412).send(e)
      } else if (e instanceof GateConditionNotValidError) {
        res.status(403).send(e)
      } else {
        Sentry.captureException(e)
        res.status(500).send(e)
      }
    }

    return
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
