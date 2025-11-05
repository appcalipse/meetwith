import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { MeetingChangeType } from '@/types/Meeting'
import {
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
} from '@/types/Requests'
import {
  createOrUpdateEventNotification,
  getEventNotification,
} from '@/utils/database'
import {
  notifyForMeetingCancellation,
  notifyForOrUpdateNewMeeting,
} from '@/utils/notification_helper'
import { ExternalCalendarSync } from '@/utils/sync_helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const request = req.body as MeetingCreationSyncRequest

    request.start = new Date(request.start)
    request.end = new Date(request.end)
    request.created_at = new Date(request.created_at)
    try {
      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)
    } catch (error) {
      Sentry.captureException(error)
    }

    try {
      await ExternalCalendarSync.create(request)
    } catch (error) {
      console.error(error)
    }

    return res.status(200).send(true)
  } else if (req.method === 'PATCH') {
    const request = req.body as MeetingCreationSyncRequest

    request.start = new Date(request.start)
    request.end = new Date(request.end)
    request.created_at = new Date(request.created_at)
    if (
      request.notification_hash &&
      request.eventId &&
      request.participantActing.account_address
    ) {
      const eventNotification = await getEventNotification(request.eventId)
      if (
        eventNotification &&
        eventNotification?.last_notified_hash === request.notification_hash
      ) {
        return res.status(200).send(true)
      } else {
        try {
          await createOrUpdateEventNotification({
            event_id: request.eventId,
            last_notified_hash: request.notification_hash,
            account_address: request.participantActing.account_address,
          })
        } catch (error) {
          Sentry.captureException(error)
        }
      }
    }

    try {
      await notifyForOrUpdateNewMeeting(MeetingChangeType.UPDATE, request)
    } catch (error) {
      Sentry.captureException(error)
    }

    try {
      await ExternalCalendarSync.update(request)
    } catch (error) {
      Sentry.captureException(error)
    }

    return res.status(200).send(true)
  } else if (req.method === 'DELETE') {
    const request = req.body as MeetingCancelSyncRequest
    const { addressesToRemove, meeting_id } = request

    for (const address of addressesToRemove) {
      try {
        await ExternalCalendarSync.delete(address, [meeting_id])
      } catch (error) {
        Sentry.captureException(error)
      }
    }

    try {
      await notifyForMeetingCancellation(request)
    } catch (error) {
      Sentry.captureException(error)
    }

    return res.status(200).send(true)
  }

  return res.status(404).send('Not found')
}

export default handle
