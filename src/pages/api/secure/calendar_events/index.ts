import { DateTime } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getSlotsForAccountWithConference,
  syncConnectedCalendars,
} from '@/utils/database'
import { extractQuery } from '@/utils/generic_utils'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      const account_address = req.session.account?.address
      if (!account_address) {
        return res.status(401).send('Unauthorized')
      }
      const start = extractQuery(req.query, 'startDate')
      const end = extractQuery(req.query, 'endDate')
      const onlyMeetings = extractQuery(req.query, 'onlyMeetings') === 'true'

      const startDate = new Date(
        start ? start : DateTime.now().startOf('month').toISO()
      )
      const endDate = new Date(
        end ? end : DateTime.now().endOf('month').toISO()
      )

      const [meetwithEvents, unifiedEvents] = await Promise.all([
        getSlotsForAccountWithConference(account_address, startDate, endDate),
        CalendarBackendHelper.getCalendarEventsForAccount(
          account_address,
          startDate,
          endDate,
          onlyMeetings
        ),
      ])

      return res.status(200).json({
        calendarEvents: unifiedEvents.filter(event => {
          const isMeetwithEvent = meetwithEvents.some(
            mwwEvent =>
              mwwEvent.meeting_id &&
              (mwwEvent.meeting_id === event.id ||
                event.description?.includes(mwwEvent.meeting_id) ||
                event.description?.includes(mwwEvent.id!))
          )
          return !isMeetwithEvent // we only want to display non-meetwith events from calendars on the client side
        }),
        mwwEvents: meetwithEvents,
      })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).send(error)
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handler)
