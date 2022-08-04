import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  BlockchainSubscription,
  Subscription,
} from '../../../../types/Subscription'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { initDB, updateAccountSubscriptions } from '../../../../utils/database'
import {
  getBlockchainSubscriptionsForAccount,
  getDomainInfo,
} from '../../../../utils/rpc_helper'
import { convertBlockchainSubscriptionToSubscription } from '../../../../utils/subscription_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    const { domain, address } = req.query
    let subs: BlockchainSubscription[] = []
    if (domain) {
      subs = [...subs, ...(await getDomainInfo(domain as string))]
    }

    if (address) {
      subs = [
        ...subs,
        ...(await getBlockchainSubscriptionsForAccount(domain as string)),
      ]
    }

    const dbSubs: Subscription[] = subs.map(sub => {
      return convertBlockchainSubscriptionToSubscription(sub)
    })

    return res.send(
      await updateAccountSubscriptions(dbSubs.filter(sub => sub.plan_id !== 0))
    )
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
