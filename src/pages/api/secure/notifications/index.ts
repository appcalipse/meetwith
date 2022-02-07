import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { AccountNotifications } from '../../../../types/AccountNotifications'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import {
  getAccountNotificationSubscriptions,
  initDB,
  setAccountNotificationSubscriptions,
} from '../../../../utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_address = req.session.account!.address
    const subscriptions = await setAccountNotificationSubscriptions(
      account_address,
      req.body as AccountNotifications
    )

    res.status(200).json(subscriptions)
    return
  } else if (req.method === 'GET') {
    initDB()
    const account_address = req.session.account!.address
    const subscriptions = await getAccountNotificationSubscriptions(
      account_address
    )
    res.status(200).json(subscriptions)
    return
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
