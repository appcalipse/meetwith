import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { SupportedChain } from '@/types/chains'
import { BlockchainSubscription, Subscription } from '@/types/Subscription'
import {
  getSubscriptionFromDBForAccount,
  updateAccountSubscriptions,
} from '@/utils/database'
import { getBlockchainSubscriptionsForAccount } from '@/utils/rpc_helper'
import { convertBlockchainSubscriptionToSubscription } from '@/utils/subscription_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const account_address = req.session.account!.address
    const subs: BlockchainSubscription[] =
      await getBlockchainSubscriptionsForAccount(account_address)

    let dbSubs: Subscription[] = subs.map(sub => {
      return convertBlockchainSubscriptionToSubscription(sub)
    })
    const customSubs = await getSubscriptionFromDBForAccount(
      account_address,
      SupportedChain.CUSTOM
    )

    if (customSubs.length > 0) {
      dbSubs = dbSubs.concat(customSubs)
    }
    return res.send(
      await updateAccountSubscriptions(dbSubs.filter(sub => !!sub.plan_id))
    )
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
