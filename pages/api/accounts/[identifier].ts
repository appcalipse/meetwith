import { NextApiRequest, NextApiResponse } from 'next'
import { getAccountFromDB } from '../../../utils/database'
import { withSentry } from '@sentry/nextjs'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { identifier } = req.query

    try {
      const account = await getAccountFromDB(identifier as string)
      res.status(200).json(account)
    } catch (e) {
      res.status(404).send('Not found')
    }
  }
})
