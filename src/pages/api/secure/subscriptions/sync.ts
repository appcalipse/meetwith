import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import {
  BlockchainSubscription,
  Subscription,
} from '../../../../types/Subscription'
import { withSessionRoute } from '../../../../utils/auth/withSessionApiRoute'
import { initDB, updateAccountSubscriptions } from '../../../../utils/database'
import { getBlockchainSubscriptionsForAccount } from '../../../../utils/rpc_helper'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    initDB()

    const account_address = req.session.account!.address
    const subs: BlockchainSubscription[] =
      await getBlockchainSubscriptionsForAccount(account_address)

    const dbSubs: Subscription[] = subs.map(sub => {
      return {
        plan_id: sub.planId.toNumber(),
        chain: sub.chain,
        owner_account: sub.owner.toLowerCase(),
        expiry_time:
          new Date(sub.expiryTime.toNumber() * 1000).getFullYear() < 2200
            ? new Date(sub.expiryTime.toNumber() * 1000)
            : new Date(2200, 1, 1),
        domain: sub.domain,
        config_ipfs_hash: sub.configIpfsHash,
        registered_at: new Date(sub.registeredAt.toNumber() * 1000),
      }
    })

    return res.send(await updateAccountSubscriptions(dbSubs))
  }

  res.status(404).send('Not found')
}

export default withSentry(withSessionRoute(handle))
