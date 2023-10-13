import { withSentry } from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'

import { withSessionRoute } from '@/ironAuth/withSessionApiRoute'
import {
  getExistingSubscriptionsByAddress,
  getExistingSubscriptionsByDomain,
  updateAccountSubscriptions,
} from '@/utils/database'

const handle = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const { domain, address } = req.body
    const existingSubscriptionsForAddress =
      await getExistingSubscriptionsByAddress(address as string)
    if (
      existingSubscriptionsForAddress &&
      existingSubscriptionsForAddress.length > 0
    ) {
      if (
        existingSubscriptionsForAddress.some(
          subscription =>
            subscription.domain !== existingSubscriptionsForAddress[0].domain
        )
      ) {
        return res
          .status(409)
          .send('Confilict Detected: multiple domains for one account')
      }
      const existingSubscriptionsForDomain =
        await getExistingSubscriptionsByDomain(domain as string)
      if (
        existingSubscriptionsForDomain &&
        existingSubscriptionsForDomain.length > 0
      ) {
        if (
          existingSubscriptionsForDomain.some(
            subscription => subscription.owner_account !== address
          )
        ) {
          return res.status(409).send('Conflict Detected: Duplicate Domain')
        }
        return res.status(200).send('The Domain is already in use.')
      }
      for (const subscription of existingSubscriptionsForAddress) {
        subscription.domain = domain as string
      }
      const new_subscriptions = await updateAccountSubscriptions(
        existingSubscriptionsForAddress
      )
      return res.status(200).json(new_subscriptions)
    }
  }

  return res.status(404).send('Not found here')
}

export default withSentry(withSessionRoute(handle))
