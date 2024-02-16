import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { AccountNotifications } from '@/types/AccountNotifications'
import {
  getAccountNotificationSubscriptions,
  setAccountNotificationSubscriptions,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const account_address = req.session.account!.address
    const subscriptions = await setAccountNotificationSubscriptions(
      account_address,
      req.body as AccountNotifications
    )

    return res.status(200).json(subscriptions)
  } else if (req.method === 'GET') {
    const account_address = req.session.account!.address
    const subscriptions = await getAccountNotificationSubscriptions(
      account_address
    )
    return res.status(200).json(subscriptions)
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
