import { withSentry } from '@sentry/nextjs'
import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getConferenceMeetingFromDB, initDB } from '../../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    if (!req.query.id) {
      return res.status(404).send('Id parameter required')
    }

    try {
      const meeting = await getConferenceMeetingFromDB(req.query.id as string)
      return res.status(200).json(meeting)
    } catch (err) {
      Sentry.captureException(err)
      return res.status(404).send('Not found')
    }
  }

  return res.status(404).send('Not found')
})
