import { NextApiRequest, NextApiResponse } from 'next'
import { initDB, isSlotFree } from '../../../../utils/database'
import { AccountNotFoundError } from '../../../../utils/errors'
import { withSentry } from '@sentry/nextjs'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    try {
      const free = await isSlotFree(
        req.query.account_id as string,
        new Date(Number(req.query.start as string)),
        new Date(Number(req.query.end as string)),
        req.query.meetingTypeId as string
      )

      res.status(200).json({ isFree: free })
      return
    } catch (error) {
      if (error instanceof AccountNotFoundError) {
        res.status(404).json({ error: error.message })
      }
      console.error(error)
      return
    }
  }
  res.status(404).send('Not found')
})
