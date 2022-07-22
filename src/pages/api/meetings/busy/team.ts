import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { initDB } from '@/utils/database'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()
    const { body } = req

    const addresses: string[] = body.addresses
    const startDate = new Date(body.start)
    const endDate = new Date(body.end)

    const busySlots: Interval[] =
      await CalendarBackendHelper.getMergedBusySlotsForMultipleAccounts(
        addresses,
        startDate,
        endDate
      )

    res.status(200).json(busySlots)
    return
  }
  res.status(404).send('Not found')
})
