import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'

import { TimeSlot } from '../../../../types/Meeting'
import {
  getAccountFromDB,
  getConnectedCalendars,
  getSlotsForAccount,
  initDB,
} from '../../../../utils/database'
import { AccountNotFoundError } from '../../../../utils/errors'
import { getConnectedCalendarIntegration } from '../../../../utils/services/connected_calendars_factory'
import { isProAccount } from '../../../../utils/subscription_manager'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()
    const address = req.query.identifier as string
    try {
      const busySlots: TimeSlot[] = []
      const startDate =
        req.query.start !== 'undefined'
          ? new Date(Number(req.query.start as string))
          : undefined
      const endDate =
        req.query.end !== 'undefined'
          ? new Date(Number(req.query.end as string))
          : undefined

      const meetings = await getSlotsForAccount(
        address,
        startDate,
        endDate,
        req.query.limit !== 'undefined'
          ? Number(req.query.limit as string)
          : undefined,
        req.query.offset !== 'undefined'
          ? Number(req.query.offset as string)
          : undefined
      )

      busySlots.push(
        ...meetings.map(it => ({ start: it.start, end: it.end, source: 'mww' }))
      )

      const account = await getAccountFromDB(address)
      if (isProAccount(account)) {
        const calendars = await getConnectedCalendars(address, false)
        for (const calendar of calendars) {
          const integration = getConnectedCalendarIntegration(
            address,
            calendar.email,
            calendar.provider,
            calendar.payload
          )

          try {
            const externalSlots = await integration.getAvailability(
              startDate!.toISOString(),
              endDate!.toISOString(),
              'primary'
            )
            busySlots.push(
              ...externalSlots.map(it => ({
                start: new Date(it.start),
                end: new Date(it.end),
                source: 'google',
              }))
            )
          } catch (e: any) {
            Sentry.captureException(e)
          }
        }
      }

      res.status(200).json(busySlots)
      return
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({ error: error.message })
      }
      Sentry.captureException(error)
      res.status(500).send(error)
      return
    }
  }
  res.status(404).send('Not found')
})
