import { GaxiosError } from 'gaxios'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'DELETE') {
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
    try {
      await CalendarBackendHelper.deleteEventFromCalendar(
        account_address,
        calendarId,
        eventId
      )

      return res.status(200).json({
        message: `Event ${eventId} deleted from calendar ${calendarId} by user ${account_address}`,
      })
    } catch (error: unknown) {
      const status =
        error instanceof GaxiosError ? error.response?.status ?? 500 : 500

      if (status === 404) {
        return res.status(404).json({
          error: `Event ${eventId} not found in calendar ${calendarId}`,
        })
      }

      return res.status(status).json({
        error: 'Failed to delete event',
      })
    }
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
