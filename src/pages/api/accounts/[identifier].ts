import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../utils/auth/withSessionApiRoute'
import { getAccountFromDB } from '../../../utils/database'
import { sendEPNSNotification } from '../../../utils/epns_helper'

const getAccount = async (req: NextApiRequest, res: NextApiResponse) => {
  sendEPNSNotification(
    ['0xe5b06bfd663C94005B8b159Cd320Fd7976549f9b'],
    'title normal',
    'message normal'
  )

  if (req.method === 'GET') {
    const { identifier } = req.query
    try {
      const account = await getAccountFromDB(identifier as string)
      res.status(200).json(account)
    } catch (e) {
      res.status(404).send('Not found')
    }
  }
}

export default withSessionRoute(withSentry(getAccount))
