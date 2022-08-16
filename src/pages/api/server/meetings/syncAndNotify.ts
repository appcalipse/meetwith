import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { notifyForNewMeeting } from '@/utils/notification_helper'
import { syncCalendarForMeeting } from '@/utils/sync_helper'

import { MeetingICS } from '../../../../types/Meeting'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const syncRequest = JSON.parse(req.body) as MeetingICS & {
      guestMeetingId: string
    }

    syncRequest.db_slot.start = new Date(syncRequest.db_slot.start)
    syncRequest.db_slot.end = new Date(syncRequest.db_slot.end)
    syncRequest.db_slot.created_at = new Date(syncRequest.db_slot.created_at!)
    syncRequest.db_slot.start = new Date(syncRequest.db_slot.start)
    syncRequest.db_slot.end = new Date(syncRequest.db_slot.end)

    try {
      await notifyForNewMeeting(syncRequest, syncRequest.guestMeetingId)
    } catch (error) {
      Sentry.captureException(error)
    }

    try {
      await syncCalendarForMeeting(
        syncRequest.meeting,
        syncRequest.db_slot.created_at!
      )
    } catch (error) {
      Sentry.captureException(error)
    }

    res.status(200).send(true)
    return
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
