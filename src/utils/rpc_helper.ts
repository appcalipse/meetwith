import { BaseProvider } from '@ethersproject/providers'
import * as Sentry from '@sentry/nextjs'
import { ethers } from 'ethers'

import { MWWDomain } from '../abis/mww'
import {
  ChainInfo,
  getChainInfo,
  getMainnetChains,
  getTestnetChains,
  SupportedChain,
} from '../types/chains'
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
    const provider = getProviderBackend(chain.chain)

    const contract = new ethers.Contract(
      chain.domainContractAddess,
      MWWDomain,
      provider!
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

export const getDomainInfo = async (
  domain: string
): Promise<BlockchainSubscription[]> => {
  const subscriptions: BlockchainSubscription[] = []

  const chainsToCheck: ChainInfo[] =
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? getMainnetChains()
      : getTestnetChains()

  for (const chain of chainsToCheck) {
    const provider = getProviderBackend(chain.chain)

    const contract = new ethers.Contract(
      chain.domainContractAddess,
      MWWDomain,
      provider!
    )
    try {
      const subs = (await contract.domains(domain)) as BlockchainSubscription
      subscriptions.push({
        ...subs,
        chain: chain.chain,
      })
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  return subscriptions
}

export const getDomainsForAccount = async (
  accountAddress: string
): Promise<string[]> => {
  const domains: string[] = []
  const chainsToCheck: ChainInfo[] =
    process.env.NEXT_PUBLIC_ENV === 'production'
      ? getMainnetChains()
      : getTestnetChains()

  for (const chain of chainsToCheck) {
    try {
      const provider = getProviderBackend(chain.chain)
      const contract = new ethers.Contract(
        chain.domainContractAddess,
        MWWDomain,
        provider!
      )
      const domainsThisChain: string[] = await contract.getDomainsForAccount(
        accountAddress
      )

      if (domainsThisChain.length) {
        for (const domain of domainsThisChain) {
          if (domains.find(d => d === domain) === undefined) {
            domains.push(domain)
          }
        }
      }
    } catch (e) {
      Sentry.captureException(e)
    }
  }

  return domains
}

export const getProviderBackend = (
  chain: SupportedChain
): BaseProvider | null => {
  const chainInfo = getChainInfo(chain)
  if (!chainInfo) return null

  const provider = new ethers.providers.JsonRpcProvider(chainInfo.rpcUrl)

  return provider
}
