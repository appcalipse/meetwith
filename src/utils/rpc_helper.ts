import * as Sentry from '@sentry/nextjs'
import { Abi } from 'abitype/zod'
import { getContract, readContract } from 'thirdweb'
import { createPublicClient, http, PublicClient } from 'viem'

import { MWWDomain } from '../abis/mww'
import {
  ChainInfo,
  getChainInfo,
  getMainnetChains,
  getTestnetChains,
  SupportedChain,
} from '../types/chains'
import { BlockchainSubscription } from '../types/Subscription'
import { isProduction } from './constants'
import { thirdWebClient } from './user_manager'

export const getBlockchainSubscriptionsForAccount = async (
  accountAddress: string
): Promise<BlockchainSubscription[]> => {
  const subscriptions = []

  const chainsToCheck: ChainInfo[] = isProduction
    ? getMainnetChains()
    : getTestnetChains()

  for (const chain of chainsToCheck) {
    const info = {
      abi: MWWDomain,
      address: chain.domainContractAddess as `0x${string}`,
      chainId: chain.id,
    }

    try {
      const domains = (await getProviderBackend(chain.chain)!.readContract({
        ...info,
        args: [accountAddress],
        functionName: 'getDomainsForAccount',
      })) as string[]
      for (const domain of domains) {
        const subs = (await getProviderBackend(chain.chain)!.readContract({
          ...info,
          args: [domain],
          functionName: 'domains',
        })) as unknown[]

        subscriptions.push({
          chain: chain.chain,
          subs,
        })
      }
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  return subscriptions.map(sub => {
    return {
      chain: sub.chain,
      configIpfsHash: sub.subs[4],
      domain: sub.subs[3],
      expiryTime: sub.subs[2],
      owner: sub.subs[0],
      planId: sub.subs[1],
      registeredAt: sub.subs[5],
    }
  }) as BlockchainSubscription[]
}

export const getDomainInfo = async (
  domain: string
): Promise<BlockchainSubscription[]> => {
  const subscriptions = []

  const chainsToCheck: ChainInfo[] = isProduction
    ? getMainnetChains()
    : getTestnetChains()

  for (const chain of chainsToCheck) {
    const contract = getContract({
      abi: Abi.parse(MWWDomain),
      address: chain!.domainContractAddess,
      chain: chain!.thirdwebChain,
      client: thirdWebClient,
    })

    try {
      const subs = await readContract({
        contract,
        method:
          'function domains(string domain) public view returns (address, uint256, uint256, string, string, uint256)',
        params: [domain],
      })

      subscriptions.push({
        ...subs,
        chain: chain.chain,
      })
    } catch (e) {
      Sentry.captureException(e)
    }
  }
  return subscriptions.map(sub => {
    return {
      chain: sub.chain,
      configIpfsHash: sub[4],
      domain: sub[3],
      expiryTime: sub[2],
      owner: sub[0],
      planId: sub[1],
      registeredAt: sub[5],
    }
  }) as BlockchainSubscription[]
}

export const getProviderBackend = (
  chain: SupportedChain
): PublicClient | null => {
  const chainInfo = getChainInfo(chain)
  if (!chainInfo) return null

  const transport = http(chainInfo.rpcUrl)

  const client = createPublicClient({
    transport,
  })

  return client
}
