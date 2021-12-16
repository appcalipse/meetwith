import { NextApiRequest, NextApiResponse } from 'next'
import { getMeetingFromDB, initDB } from '../../../../utils/database'
import { withSentry } from '@sentry/nextjs'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    if (!req.query.id) {
      return res.status(404).send('Not found')
    }

    try {
      const meeting = await getMeetingFromDB(req.query.id as string)

      res.status(200).json(meeting)
      return
    } catch (err) {
      res.status(404).send('Not found')
      return
    }
  }

  res.status(404).send('Not found')
})
