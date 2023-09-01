import { Resolution } from '@unstoppabledomains/resolution'
import {
  fetchEnsAddress,
  fetchEnsAvatar,
  fetchEnsName,
  getNetwork,
  GetWalletClientResult,
  switchNetwork,
} from '@wagmi/core'
import { ca } from 'date-fns/locale'
import { ProviderName, Web3Resolver } from 'web3-domain-resolver'

import { getChainInfo, SupportedChain } from '../types/chains'
import lensHelper from './lens.helper'

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
  const name = await fetchEnsName({
    address: address as `0x${string}`,
    chainId: 1,
  })

  if (!name) {
    return undefined
  }

  const validatedAddress = await fetchEnsAddress({ name, chainId: 1 })

  // Check to be sure the reverse record is correct.
  if (address.toLowerCase() !== validatedAddress?.toLowerCase()) {
    return undefined
  }

  let avatar = undefined
  try {
    avatar = await fetchEnsAvatar({ name, chainId: 1 })
  } catch (e) {}

  return {
    name,
    avatar: avatar || undefined,
  }
}

const checkENSBelongsTo = async (domain: string): Promise<string | null> => {
  return await fetchEnsAddress({ name: domain, chainId: 1 })
}

const checkFreenameBelongsTo = async (
  domain: string
): Promise<string | null> => {
  const web3resolver = new Web3Resolver()
  web3resolver.setResolversPriority([ProviderName.FREENAME])

  const resolvedDomain = await web3resolver.resolve(domain)

  return resolvedDomain?.ownerAddress || null
}

export const resolveFreename = async (
  address: string
): Promise<AccountExtraProps | null> => {
  const web3resolver = new Web3Resolver()
  const resolvedDomain = await web3resolver.reverseResolve(
    address,
    ProviderName.FREENAME
  )

  return resolvedDomain
    ? { name: resolvedDomain.fullname!, avatar: resolvedDomain.imageUrl }
    : null
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
  walletClient: GetWalletClientResult | undefined
): Promise<void> => {
  const { chain } = getNetwork()

  const chainInfo = getChainInfo(desiredChain)
  if (chainInfo && chain?.id !== chainInfo.id) {
    try {
      await switchNetwork({
        chainId: chainInfo.id,
      })

      return
    } catch (switchError: any) {
      if (switchError.name === 'ChainNotConfiguredForConnectorError') {
        try {
          await walletClient?.addChain({
            chain: {
              id: chainInfo.id,
              name: chainInfo.fullName,
              network: chainInfo.name,
              nativeCurrency: {
                name: chainInfo.nativeTokenSymbol,
                symbol: chainInfo.nativeTokenSymbol,
                decimals: 18,
              },
              rpcUrls: {
                default: {
                  http: [chainInfo.rpcUrl],
                },
                public: {
                  http: [chainInfo.rpcUrl],
                },
              },
              /** Collection of block explorers */
              blockExplorers: {
                default: {
                  name: chainInfo.fullName,
                  url: chainInfo.blockExplorerUrl,
                },
              },
              testnet: chainInfo.testnet,
            },
          })

          const connectedChain = await walletClient?.getChainId()
          //check if user accepted chain switch after adding it
          if (connectedChain !== chainInfo.id) {
            throw Error('User did not accept chain switch')
          }
          return
        } catch (addError: any) {
          throw Error(addError)
        }
      }
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
    const lensProfile = await lensHelper.getLensProfile(domain)
    return lensProfile?.ownedBy.toLowerCase()
  } else {
    return (await checkFreenameBelongsTo(domain))?.toLowerCase()
  }
}
