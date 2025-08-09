import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { AccountNotFoundError } from '@/utils/errors'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const address = req.query.identifier as string
    const startDate =
      req.query.start !== 'undefined'
        ? new Date(Number(req.query.start as string))
        : new Date('1970-01-01')
    const endDate =
      req.query.end !== 'undefined'
        ? new Date(Number(req.query.end as string))
        : new Date('2100-01-01')
    const limit =
      req.query.limit !== 'undefined'
        ? Number(req.query.limit as string)
        : undefined
    const offset =
      req.query.offset !== 'undefined'
        ? Number(req.query.offset as string)
        : undefined

    try {
      const busySlots: Interval[] =
        await CalendarBackendHelper.getBusySlotsForAccount(
          address,
          startDate,
          endDate,
          limit,
          offset
        )

      return res.status(200).json(busySlots)
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        return res.status(404).json({ error: error.message })
      }
      Sentry.captureException(error)
      return res.status(500).send(error)
    }
  }
  return res.status(404).send('Not found')
}

export default handler
