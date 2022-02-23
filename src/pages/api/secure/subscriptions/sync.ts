import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  BlockchainSubscription,
  Subscription,
} from '../../../../types/Subscription'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { initDB, updateAccountSubscriptions } from '../../../../utils/database'
import { getBlockchainSubscriptionsForAccount } from '../../../../utils/rpc_helper'
import { convertBlockchainSubscriptionToSubscription } from '../../../../utils/subscription_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    const account_address = req.session.account!.address
    const subs: BlockchainSubscription[] =
      await getBlockchainSubscriptionsForAccount(account_address)

    const dbSubs: Subscription[] = subs.map(sub => {
      return convertBlockchainSubscriptionToSubscription(sub)
    })

    return res.send(await updateAccountSubscriptions(dbSubs))
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
