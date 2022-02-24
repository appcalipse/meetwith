import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '../../../../../utils/auth/withSessionApiRoute'
import { getSubscription, initDB } from '../../../../../utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    const subscription = await getSubscription(req.query.domain as string)

    return res.send(subscription)
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
