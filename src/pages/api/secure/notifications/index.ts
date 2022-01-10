import { NextApiRequest, NextApiResponse } from 'next'
import {
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
  initDB,
} from '../../../../utils/database'
import { withSentry } from '@sentry/nextjs'
import { AccountNotifications } from '../../../../types/AccountNotifications'

export default withSentry(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    initDB()

    const account_address = req.headers.account as string
    const subscriptions = await setAccountNotificationSubscriptions(
      account_address,
      req.body as AccountNotifications
    )

    res.status(200).json(subscriptions)
    return
  } else if (req.method === 'GET') {
    initDB()
    const account_address = req.headers.account as string
    const subscriptions = await getAccountNotificationSubscriptions(
      account_address
    )
    res.status(200).json(subscriptions)
    return
  }

  res.status(404).send('Not found')
})
