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
    const allDbSubs = await getSubscriptionFromDBForAccount(account_address)
    const hasBillingSubscription = allDbSubs.some(
      sub => sub.billing_plan_id !== null && sub.billing_plan_id !== undefined
    )

    let dbSubs: Subscription[] = []

    if (!hasBillingSubscription) {
      const subs: BlockchainSubscription[] =
        await getBlockchainSubscriptionsForAccount(account_address)
      dbSubs = subs.map(sub => {
        return convertBlockchainSubscriptionToSubscription(sub)
      })
    }

    const customSubs = allDbSubs.filter(
      sub => sub.chain === SupportedChain.CUSTOM
    )

    if (customSubs.length > 0) {
      dbSubs = dbSubs.concat(customSubs)
    }

    const billingSubs = allDbSubs.filter(
      sub => sub.billing_plan_id !== null && sub.billing_plan_id !== undefined
    )

    if (billingSubs.length > 0) {
      dbSubs = dbSubs.concat(billingSubs)
    }

    return res.send(
      await updateAccountSubscriptions(dbSubs.filter(sub => !!sub.plan_id))
    )
  }

  return res.status(404).send('Not found')
}

export default withSessionRoute(handle)
