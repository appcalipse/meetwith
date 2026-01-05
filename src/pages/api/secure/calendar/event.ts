import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { UnifiedEvent } from '@/types/Calendar'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'PATCH') {
      const account_address = req.session.account?.address
      if (!account_address) {
        return res.status(401).send('Unauthorized')
      }

      const unifiedEvent: UnifiedEvent = req.body

      // Validate required fields
      if (!unifiedEvent || !unifiedEvent.id || !unifiedEvent.sourceEventId) {
        return res
          .status(400)
          .send('Invalid event data: missing id or sourceEventId')
      }

      if (!unifiedEvent.source || !unifiedEvent.calendarId) {
        return res
          .status(400)
          .send('Missing required fields: source or calendarId')
      }

      if (!unifiedEvent.accountEmail) {
        return res.status(400).send('Missing required field: accountEmail')
      }

      if (!unifiedEvent.title || !unifiedEvent.start || !unifiedEvent.end) {
        return res
          .status(400)
          .send('Missing required event fields: title, start, or end')
      }

      // Validate dates
      const startDate = new Date(unifiedEvent.start)
      const endDate = new Date(unifiedEvent.end)

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).send('Invalid date format for start or end')
      }

      if (startDate >= endDate) {
        return res.status(400).send('Event end time must be after start time')
      }

      try {
        const updatedEvent = await CalendarBackendHelper.updateCalendarEvent(
          account_address,
          unifiedEvent
        )
        return res.status(200).json(updatedEvent)
      } catch (error: any) {
        Sentry.captureException(error, {
          extra: {
            account_address,
            eventId: unifiedEvent.id,
            sourceEventId: unifiedEvent.sourceEventId,
            source: unifiedEvent.source,
            calendarId: unifiedEvent.calendarId,
          },
        })

        if (
          error.message?.includes('not found') ||
          error.message?.includes('not enabled')
        ) {
          return res.status(404).send(error.message)
        }
        if (
          error.message?.includes('Unauthorized') ||
          error.message?.includes('permission') ||
          error.message?.includes('403')
        ) {
          return res.status(403).send(error.message)
        }
        if (
          error.message?.includes('conflict') ||
          error.message?.includes('409')
        ) {
          return res.status(409).send(error.message)
        }
        return res.status(500).send(`Failed to update event: ${error.message}`)
      }
    }
  } catch (error: any) {
    Sentry.captureException(error)
    return res
      .status(500)
      .send(`Internal server error: ${error.message || error}`)
  }
  return res.status(405).send('Method not allowed.')
}

export default withSessionRoute(handler)
