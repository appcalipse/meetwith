import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const pending = req.session.quickPollPendingCalendar

  if (!pending) {
    return res.status(200).json({
      busy: [] as Array<{ start: string; end: string }>,
      hasPendingCalendar: false,
      pendingEmail: undefined,
      pendingName: undefined,
    })
  }

  try {
    const body = req.body as { startDate?: string; endDate?: string }
    const startRaw = body?.startDate
    const endRaw = body?.endDate
    if (!startRaw || !endRaw) {
      return res
        .status(400)
        .json({ error: 'startDate and endDate are required' })
    }

    const startDate = new Date(startRaw)
    const endDate = new Date(endRaw)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date range' })
    }

    const busySlots =
      await CalendarBackendHelper.getBusySlotsForPendingQuickPollCalendar(
        pending,
        startDate,
        endDate
      )

    const busy = busySlots.map(s => ({
      end: new Date(s.end).toISOString(),
      start: new Date(s.start).toISOString(),
    }))

    return res.status(200).json({
      busy,
      hasPendingCalendar: true,
      pendingEmail: pending.email,
      pendingName: pending.name,
    })
  } catch (error) {
    Sentry.captureException(error)
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Preview failed',
    })
  }
}

export default withSessionRoute(handler)
