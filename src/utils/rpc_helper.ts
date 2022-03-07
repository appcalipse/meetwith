import * as Sentry from '@sentry/node'
import { ethers } from 'ethers'

import { MWWSubscription } from '../abis/mww'
import { ChainInfo, getMainnetChains, getTestnetChains } from '../types/chains'
import { BlockchainSubscription } from '../types/Subscription'

export const getBlockchainSubscriptionsForAccount = async (
  accountAddress: string
): Promise<BlockchainSubscription[]> => {
  const subscriptions: BlockchainSubscription[] = []

  const chainsToCheck: ChainInfo[] =
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? getMainnetChains()
      : getTestnetChains()

  for (const chain of chainsToCheck) {
    const provider = new ethers.providers.JsonRpcProvider(chain.rpcUrl)
    const contract = new ethers.Contract(
      chain.domainContractAddess,
      MWWSubscription,
      provider
    )
    try {
      const domains = await contract.getDomainsForAccount(accountAddress)
      for (const domain of domains) {
        const subs = (await contract.domains(domain)) as BlockchainSubscription
        subscriptions.push({
          ...subs,
          chain: chain.chain,
        })
      }
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  return subscriptions
}
