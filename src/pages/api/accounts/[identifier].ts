import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../utils/auth/withSessionApiRoute'
import { getAccountFromDB } from '../../../utils/database'

const getAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { identifier } = req.query

    try {
      const account = await getAccountFromDB(identifier as string)
      res.status(200).json(account)
    } catch (e) {
      res.status(404).send('Not found')
    }
  }
  res.status(404).send('Not found')
}

export default withSessionRoute(withSentry(getAccount))
