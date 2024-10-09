import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import { BlockchainSubscription, Subscription } from '@/types/Subscription'
import { updateAccountSubscriptions } from '@/utils/database'
import { getBlockchainSubscriptionsForAccount } from '@/utils/rpc_helper'
import { convertBlockchainSubscriptionToSubscription } from '@/utils/subscription_manager'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const account_address = req.session.account!.address
    const subs: BlockchainSubscription[] =
      await getBlockchainSubscriptionsForAccount(account_address)

    const dbSubs: Subscription[] = subs.map(sub => {
      return convertBlockchainSubscriptionToSubscription(sub)
    })

    return res.send(
      await updateAccountSubscriptions(dbSubs.filter(sub => !!sub.plan_id))
    )
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
