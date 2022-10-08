import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getMeetingFromDB } from '@/utils/database'
import { notifyForNewMeeting } from '@/utils/notification_helper'
import { ExternalCalendarSync } from '@/utils/sync_helper'

import {
  MeetingICS,
  MeetingUpdateRequest,
  ParticipantInfo,
} from '../../../../types/Meeting'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const meetingICS = JSON.parse(req.body) as MeetingICS

    meetingICS.db_slot.start = new Date(meetingICS.db_slot.start)
    meetingICS.db_slot.end = new Date(meetingICS.db_slot.end)
    meetingICS.db_slot.created_at = new Date(meetingICS.db_slot.created_at!)
    meetingICS.db_slot.start = new Date(meetingICS.db_slot.start)
    meetingICS.db_slot.end = new Date(meetingICS.db_slot.end)

    try {
      await notifyForNewMeeting(meetingICS)
    } catch (error) {
      Sentry.captureException(error)
    }

    try {
      await ExternalCalendarSync.create(
        meetingICS.meeting,
        meetingICS.db_slot.created_at!
      )
    } catch (error) {
      Sentry.captureException(error)
    }

    res.status(200).send(true)
    return
  } else if (req.method === 'PATCH') {
    const meetingICS = JSON.parse(req.body) as MeetingICS

    meetingICS.db_slot.start = new Date(meetingICS.db_slot.start)
    meetingICS.db_slot.end = new Date(meetingICS.db_slot.end)
    meetingICS.db_slot.created_at = new Date(meetingICS.db_slot.created_at!)
    meetingICS.db_slot.start = new Date(meetingICS.db_slot.start)
    meetingICS.db_slot.end = new Date(meetingICS.db_slot.end)

    try {
      //     await notifyMeetingUpdate(meetingICS)
    } catch (error) {
      Sentry.captureException(error)
    }

    try {
      await ExternalCalendarSync.update(
        meetingICS.meeting as MeetingUpdateRequest
      )
    } catch (error) {
      Sentry.captureException(error)
    }

    res.status(200).send(true)
    return
  } else if (req.method === 'DELETE') {
    const meetingICS = JSON.parse(req.body) as MeetingICS

    meetingICS.db_slot.start = new Date(meetingICS.db_slot.start)
    meetingICS.db_slot.end = new Date(meetingICS.db_slot.end)
    meetingICS.db_slot.created_at = new Date(meetingICS.db_slot.created_at!)
    meetingICS.db_slot.start = new Date(meetingICS.db_slot.start)
    meetingICS.db_slot.end = new Date(meetingICS.db_slot.end)

    const payload = JSON.parse(req.body) as {
      slotIds: string[]
      guestsToRemove: ParticipantInfo[]
    }

    for (const slotId of payload.slotIds) {
      const owner = (await getMeetingFromDB(slotId)).account_address
      try {
        await ExternalCalendarSync.delete(owner, [slotId])
      } catch (error) {
        Sentry.captureException(error)
      }
    }

    try {
      //  await notifyMeetingCancelling(meetingICS, payload.guestsToRemove)
    } catch (error) {
      Sentry.captureException(error)
    }

    res.status(200).send(true)
    return
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
