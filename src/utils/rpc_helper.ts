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
  const subscriptions: any[] = []

  const chainsToCheck: ChainInfo[] = isProduction
    ? getMainnetChains()
    : getTestnetChains()

  for (const chain of chainsToCheck) {
    const info = {
      address: chain.domainContractAddess as `0x${string}`,
      chainId: chain.id,
      abi: MWWDomain,
    }

    try {
      const domains = (await getProviderBackend(chain.chain)!.readContract({
        ...info,
        functionName: 'getDomainsForAccount',
        args: [accountAddress],
      })) as string[]
      for (const domain of domains) {
        const subs = (await getProviderBackend(chain.chain)!.readContract({
          ...info,
          functionName: 'domains',
          args: [domain],
        })) as any[]

        subscriptions.push({
          ...subs,
          chain: chain.chain,
        })
      }
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  return subscriptions.map(sub => {
    return {
      planId: sub[1],
      owner: sub[0],
      expiryTime: sub[2],
      domain: sub[3],
      configIpfsHash: sub[4],
      registeredAt: sub[5],
      chain: sub.chain,
    }
  }) as BlockchainSubscription[]
}

export const getDomainInfo = async (
  domain: string
): Promise<BlockchainSubscription[]> => {
  const subscriptions: any[] = []

  const chainsToCheck: ChainInfo[] = isProduction
    ? getMainnetChains()
    : getTestnetChains()

  for (const chain of chainsToCheck) {
    const contract = getContract({
      client: thirdWebClient,
      chain: chain!.thirdwebChain,
      address: chain!.domainContractAddess,
      abi: Abi.parse(MWWDomain),
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
      planId: sub[1],
      owner: sub[0],
      expiryTime: sub[2],
      domain: sub[3],
      configIpfsHash: sub[4],
      registeredAt: sub[5],
      chain: sub.chain,
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
