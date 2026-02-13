import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { UpdateCalendarEventRequest } from '@/types/Requests'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'PATCH') {
    try {
      const account_address = req.session.account!.address
      const { calendarId, eventId } = req.query

      if (!account_address) {
        return res.status(401).send('Unauthorized')
      }

      if (
        !calendarId ||
        Array.isArray(calendarId) ||
        !eventId ||
        Array.isArray(eventId)
      ) {
        return res.status(400).send('Missing or invalid parameters')
      }

      const { attendee_email, rsvp_status } =
        req.body as UpdateCalendarEventRequest

      await CalendarBackendHelper.updateCalendarRsvpStatus(
        account_address,
        calendarId,
        eventId,
        attendee_email,
        rsvp_status
      )

      return res.status(200).json({
        message: `RSVP status for event ${eventId} in calendar ${calendarId} updated to ${rsvp_status} by user ${account_address}`,
      })
    } catch (e) {
      console.error(e)
      Sentry.captureException(e)
      return res.status(500).send('An unexpected error occurred.')
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
