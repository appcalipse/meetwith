import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { fixCalendarConnectionIfNeeded } from '@/scripts/calendarsFix'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  fixCalendarConnectionIfNeeded()
  res.send({})
})
