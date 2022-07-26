import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { getMeetingFromDB, initDB } from '../../../../utils/database'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    if (!req.query.id) {
      return res.status(404).end('Id parameter required')
    }

    try {
      const meeting = await getMeetingFromDB(req.query.id as string)
      return res.status(200).json(meeting)
    } catch (err) {
      console.error('err', err)
      return res.status(404).end('Not found')
    }
  }

  return res.status(404).end('Not found')
})
