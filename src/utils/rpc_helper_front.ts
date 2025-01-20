import * as Sentry from '@sentry/nextjs'
import { Resolution } from '@unstoppabledomains/resolution'
import {
  resolveAddress,
  resolveAvatar,
  resolveName,
} from 'thirdweb/extensions/ens'
import { Wallet } from 'thirdweb/wallets'
import { Address } from 'viem'

import { getChainInfo, SupportedChain } from '@/types/chains'

import { getSubscriptionByDomain } from './api_helper'
import { getLensProfile } from './lens.helper'
import { thirdWebClient } from './user_manager'
interface AccountExtraProps {
  name: string
  avatar?: string
}

export const resolveExtraInfo = async (
  address: string
): Promise<AccountExtraProps | undefined> => {
  return await resolveENS(address)
}

export const resolveENS = async (
  address: string
): Promise<AccountExtraProps | undefined> => {
  try {
    const name = await resolveName({
      address: address as Address,
      client: thirdWebClient,
    })

    if (!name) {
      return undefined
    }

    const validatedAddress = await resolveAddress({
      name,
      client: thirdWebClient,
    })

    // Check to be sure the reverse record is correct.
    if (address.toLowerCase() !== validatedAddress?.toLowerCase()) {
      return undefined
    }

    let avatar = undefined
    try {
      avatar = await resolveAvatar({
        name,
        client: thirdWebClient,
      })
    } catch (e) {}
    return {
      name,
      avatar: avatar || undefined,
    }
  } catch (e) {
    return undefined
  }
}

const checkENSBelongsTo = async (domain: string): Promise<string | null> => {
  const validatedAddress = await resolveAddress({
    name: domain,
    client: thirdWebClient,
  })
  return validatedAddress
}

const checkDomainBelongsTo = async (domain: string): Promise<string | null> => {
  try {
    return (
      (await getSubscriptionByDomain(domain as string))?.owner_account || null
    )
  } catch (e) {
    return null
  }
}

const checkUnstoppableDomainBelongsTo = async (
  domain: string
): Promise<string | null> => {
  const resolution = new Resolution({
    sourceConfig: {
      uns: {
        locations: {
          Layer1: {
            url: `https://mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID}`,
            network: 'mainnet',
          },
          Layer2: {
            url: `https://polygon-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID}`,
            network: 'polygon-mainnet',
          },
        },
      },
    },
  })

  const getCurrency = (domain: string) => {
    if (domain.endsWith('.zil')) {
      return 'ZIL'
    } else if (domain.endsWith('.bitcoin')) {
      return 'BTC'
    }
    return 'ETH'
  }

  try {
    return await resolution.addr(domain, getCurrency(domain))
  } catch (e: any) {
    return null
  }
}

export const validateChainToActOn = async (
  desiredChain: SupportedChain,
  wallet: Wallet
): Promise<void> => {
  const chainId = await wallet.getChain()!.id

  const chainInfo = getChainInfo(desiredChain)

  if (chainInfo && chainId !== chainInfo.id) {
    try {
      await wallet.switchChain(chainInfo.thirdwebChain)
      return
    } catch (switchError: any) {
      throw Error(switchError)
    }
  }
}

export const checkValidDomain = async (
  _domain: string,
  currentAccountAddress: string
): Promise<boolean> => {
  const address = await getAddressFromDomain(_domain)
  return (
    !address || address.toLowerCase() === currentAccountAddress.toLowerCase()
  )
}

export const getAddressFromDomain = async (
  _domain: string
): Promise<string | undefined> => {
  try {
    const domain = _domain.toLowerCase()
    if (domain.endsWith('.eth')) {
      return (await checkENSBelongsTo(domain))?.toLowerCase()
    } else if (
      domain.endsWith('.x') ||
      domain.endsWith('.wallet') ||
      domain.endsWith('.crypto') ||
      domain.endsWith('.coin') ||
      domain.endsWith('.bitcoin') ||
      domain.endsWith('.888') ||
      domain.endsWith('.nft') ||
      domain.endsWith('.dao') ||
      domain.endsWith('.zil') ||
      domain.endsWith('.blockchain')
    ) {
      return (await checkUnstoppableDomainBelongsTo(domain))?.toLowerCase()
    } else if (domain.endsWith('.lens')) {
      const lensProfile = await getLensProfile(domain)
      return lensProfile?.ownedBy.toLowerCase()
    } else {
      return (await checkDomainBelongsTo(domain))?.toLowerCase()
    }
  } catch (e) {
    Sentry.captureException(e)
    return undefined
  }
}

export const checkTransactionError = (error: any) => {
  if (
    error['details']?.toLowerCase()?.includes('user rejected') ||
    error['details']?.toLocaleLowerCase()?.includes('user denied')
  ) {
    return 'You rejected the transaction'
  } else if (error['details']?.toLowerCase()?.includes('insufficient')) {
    return 'Insufficient funds'
  } else if ('details' in error) {
    return error['details']
  } else {
    return error.message
  }
}
