import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../utils/auth/withSessionApiRoute'
import { getAccountFromDB } from '../../../utils/database'

const getAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const { identifier } = req.query
    const signature = req.headers['signature'] as string
    try {
      const account = await getAccountFromDB(identifier as string)

      // set the account in the session in order to use it on other requests
      req.session.account = {
        ...account,
        signature,
      }
      await req.session.save()

      res.status(200).json(account)
    } catch (e) {
      res.status(404).send('Not found')
    }
  }
}

export default withSessionRoute(withSentry(getAccount))
