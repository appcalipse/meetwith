import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingChangeType } from '@/types/Meeting'
import { MeetingCreationSyncRequest } from '@/types/Requests'
import { notifyForOrUpdateNewMeeting } from '@/utils/notification_helper'
import { ExternalCalendarSync } from '@/utils/sync_helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const request = req.body as MeetingCreationSyncRequest

    request.start = new Date(request.start)
    request.end = new Date(request.end)
    request.created_at = new Date(request.created_at)

    try {
      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        request.participantActing,
        request.participants,
        request.start,
        request.end,
        request.created_at,
        request.meeting_url,
        request.title,
        request.content,
        undefined,
        request.meetingProvider,
        request.meetingReminders,
        request.meetingRepeat,
        request.meetingPermissions
      )
    } catch (error) {
      Sentry.captureException(error)
    }

    try {
      await ExternalCalendarSync.create(request)
    } catch (error) {
      console.error(error)
    }

    return res.status(200).send(true)
  }

  return res.status(404).send('Not found')
}

export default handle
