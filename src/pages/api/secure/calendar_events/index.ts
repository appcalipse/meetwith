import { DateTime } from 'luxon'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { getSlotsForAccount } from '@/utils/database'
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

      const startDate = new Date(
        start ? start : DateTime.now().startOf('month').toISO()
      )
      const endDate = new Date(
        end ? end : DateTime.now().endOf('month').toISO()
      )

      const [meetwithEvents, unifiedEvents] = await Promise.all([
        getSlotsForAccount(account_address, startDate, endDate),
        CalendarBackendHelper.getCalendarEventsForAccount(
          account_address,
          startDate,
          endDate
        ),
      ])

      return res.status(200).json({
        mwwEvents: meetwithEvents,
        calendarEvents: unifiedEvents,
      })
    }
  } catch (error) {
    console.error(error)
    return res.status(500).send(error)
  }
  return res.status(404).send('Not found')
}

export default withSessionRoute(handler)
