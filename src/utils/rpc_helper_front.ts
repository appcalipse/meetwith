import { JsonRpcProvider, Web3Provider } from '@ethersproject/providers'
import { Resolution } from '@unstoppabledomains/resolution'
import { ethers } from 'ethers'
import Web3 from 'web3'

import { getChainInfo, SupportedChain } from '../types/chains'

interface AccountExtraProps {
  name: string
  avatar?: string
}

export const resolveExtraInfo = async (
  address: string
): Promise<AccountExtraProps | undefined> => {
  return await resolveENS(address)
}

const resolveENS = async (
  address: string
): Promise<AccountExtraProps | undefined> => {
  let provider: JsonRpcProvider

  if (window.ethereum && window.ethereum.chainId === '0x1') {
    provider = new ethers.providers.Web3Provider(window.ethereum)
  } else {
    provider = new ethers.providers.InfuraProvider(
      'homestead',
      process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID
    )
  }

  const name = await provider.lookupAddress(address)

  if (!name) {
    return undefined
  }

  const resolver = await provider.getResolver(name)

  const validatedAddress = await resolver?.getAddress()

  // Check to be sure the reverse record is correct.
  if (address.toLowerCase() !== validatedAddress?.toLowerCase()) {
    return undefined
  }

  const avatarInfo = await resolver?.getText('avatar')
  const avatar = avatarInfo ? (await resolver?.getAvatar())?.url : undefined

  return {
    name,
    avatar,
  }
}

const checkENSBelongsTo = async (domain: string): Promise<string | null> => {
  let provider: JsonRpcProvider

  if (window.ethereum && window.ethereum.chainId === '0x1') {
    provider = new ethers.providers.Web3Provider(window.ethereum)
  } else {
    provider = new ethers.providers.InfuraProvider(
      'homestead',
      process.env.NEXT_PUBLIC_INFURA_RPC_PROJECT_ID
    )
  }

  return await provider.resolveName(domain)
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
  provider: Web3Provider
): Promise<void> => {
  const connectedChain = await provider.getNetwork()
  const chainInfo = getChainInfo(desiredChain)
  if (chainInfo && connectedChain.chainId !== chainInfo.id) {
    try {
      await provider.send('wallet_switchEthereumChain', [
        { chainId: Web3.utils.toHex(chainInfo.id) },
      ])

      return
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError.code === 4902) {
        try {
          await provider.send('wallet_addEthereumChain', [
            {
              chainId: Web3.utils.toHex(chainInfo.id),
              chainName: chainInfo.fullName,
              rpcUrls: [chainInfo.rpcUrl],
              nativeCurrency: {
                name: chainInfo.nativeTokenSymbol,
                symbol: chainInfo.nativeTokenSymbol,
                decimals: 18,
              },
              blockExplorerUrls: [chainInfo.blockExplorerUrl],
            },
          ])
          const connectedChain = await provider.getNetwork()
          //check if user accepted chain switch after adding it
          if (connectedChain.chainId !== chainInfo.id) {
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
  domain: string,
  currentAccountAddress: string
): Promise<boolean> => {
  if (domain.endsWith('.eth')) {
    const owner = await checkENSBelongsTo(domain)

    if (owner?.toLowerCase() === currentAccountAddress.toLowerCase()) {
      return true
    } else {
      return false
    }
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
    const owner = await checkUnstoppableDomainBelongsTo(domain)
    if (owner?.toLowerCase() === currentAccountAddress.toLowerCase()) {
      return true
    } else {
      return false
    }
  }
  return true
}
