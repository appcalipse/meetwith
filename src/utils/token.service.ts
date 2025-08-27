import { erc20Abi } from 'abitype/abis'
import { Abi } from 'abitype/zod'
import { getContract, readContract, ThirdwebContract } from 'thirdweb'
import { viemAdapter } from 'thirdweb/adapters/viem'
import { Address } from 'viem'

import { ERC721 } from '@/abis/erc721'
import {
  AcceptedToken,
  getChainId,
  getChainInfo,
  getTokenAddress,
  getTokenSymbol,
  SupportedChain,
  TokenMeta,
} from '@/types/chains'
import { GateInterface, TokenGateElement } from '@/types/TokenGating'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'
import { zeroAddress } from '@/utils/generic_utils'

import { thirdWebClient } from './user_manager'

export const getTokenBalance = async (
  walletAddress: string,
  tokenAddress: `0x${string}`,
  chain: SupportedChain
): Promise<bigint> => {
  const chainInfo = getChainInfo(chain)
  const contract = getContract({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    address: tokenAddress,
    abi: erc20Abi,
  })
  const balance = await readContract({
    contract,
    method: 'balanceOf',
    params: [walletAddress as Address],
  })

  return balance
}

export const getNativeBalance = async (
  walletAddress: `0x${string}`,
  chain: SupportedChain
): Promise<bigint> => {
  const chainInfo = getChainInfo(chain)

  const publicClient = viemAdapter.publicClient.toViem({
    chain: chainInfo!.thirdwebChain,
    client: thirdWebClient,
  })

  const balance = await publicClient.getBalance({
    address: walletAddress,
  })

  return balance
}
export const getTokenMeta = async (
  chain: string,
  tokenAddress: string
): Promise<Partial<TokenMeta>> => {
  const url = `https://api.coingecko.com/api/v3/coins/${chain}/contract/${tokenAddress}`
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-cg-demo-api-key': process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '',
    },
  }
  const data = await fetch(url, options)
  const dataJson = await data.json()
  return dataJson
}

export const getTokenInfo = async (
  tokenAddress: `0x${string}`,
  chain: SupportedChain
): Promise<
  (TokenGateElement & { contract: ThirdwebContract<typeof erc20Abi> }) | null
> => {
  const chainInfo = getChainInfo(chain)
  const erc20Contract = getContract({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    address: tokenAddress,
    abi: erc20Abi,
  })

  const nftContract = getContract({
    client: thirdWebClient,
    chain: chainInfo!.thirdwebChain,
    address: tokenAddress,
    abi: Abi.parse(ERC721),
  })

  try {
    const name = await readContract({
      contract: erc20Contract,
      method: 'name',
    })
    const symbol = await readContract({
      contract: erc20Contract,
      method: 'symbol',
    })

    let isNFT = false
    let decimals = 0

    try {
      const baseURI = await readContract({
        contract: nftContract,
        method: 'function baseURI()',
      })

      if (baseURI) isNFT = true
    } catch (error) {
      for (const i of [0, 1, 100, 1000, 10000]) {
        try {
          const tokenURI = await readContract({
            contract: nftContract,
            method: 'function tokenURI()',
            params: [i],
          })
          if (tokenURI) isNFT = true
          isNFT = true
        } catch (error) {}
      }
      if (!isNFT) {
        decimals = await readContract({
          contract: erc20Contract,
          method: 'decimals',
        })
      }
    }

    return {
      itemName: name,
      itemSymbol: symbol,
      itemId: tokenAddress,
      decimals,
      chain: chain,
      type: isNFT ? GateInterface.ERC721 : GateInterface.ERC20,
      minimumBalance: 0n,
      contract: erc20Contract,
    }
  } catch (error) {
    return null
  }
}

// Formatted balance functions for API use
export const getCryptoTokenBalance = async (
  walletAddress: string,
  tokenAddress: string,
  chain: SupportedChain
): Promise<{ balance: number }> => {
  try {
    const chainInfo = getChainInfo(chain)
    if (!chainInfo) {
      throw new Error(`Unsupported chain: ${chain}`)
    }

    const contract = getContract({
      client: thirdWebClient,
      chain: chainInfo.thirdwebChain,
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
    })

    const balance = await readContract({
      contract,
      method: 'balanceOf',
      params: [walletAddress as `0x${string}`],
    })

    // Get decimals for proper formatting
    const decimals = await readContract({
      contract,
      method: 'decimals',
    })

    return { balance: Number(balance) / Math.pow(10, decimals) }
  } catch (error) {
    console.error('Error getting token balance:', error)
    return { balance: 0 }
  }
}

export const getCryptoNativeBalance = async (
  walletAddress: string,
  chain: SupportedChain
): Promise<{ balance: number }> => {
  try {
    const chainInfo = getChainInfo(chain)
    if (!chainInfo) {
      throw new Error(`Unsupported chain: ${chain}`)
    }

    const publicClient = viemAdapter.publicClient.toViem({
      chain: chainInfo.thirdwebChain,
      client: thirdWebClient,
    })

    const balance = await publicClient.getBalance({
      address: walletAddress as `0x${string}`,
    })

    return { balance: Number(balance) / 1e18 } // Convert from wei to ether
  } catch (error) {
    console.error('Error getting native balance:', error)
    return { balance: 0 }
  }
}

export const getTotalWalletBalance = async (
  walletAddress: string
): Promise<{ balance: number }> => {
  try {
    const supportedChains = supportedPaymentChains

    const tokenConfigs = []

    for (const chain of supportedChains) {
      const chainInfo = getChainInfo(chain)
      if (chainInfo) {
        for (const tokenInfo of chainInfo.acceptableTokens) {
          if (tokenInfo.contractAddress !== zeroAddress) {
            tokenConfigs.push({
              address: tokenInfo.contractAddress,
              chain: chain,
              symbol: getTokenSymbol(tokenInfo.token),
            })
          }
        }
      }
    }

    let totalBalance = 0

    const balancePromises = [
      ...supportedChains.map(async chain => {
        try {
          const nativeBalance = await getCryptoNativeBalance(
            walletAddress,
            chain
          )
          return nativeBalance.balance
        } catch (error) {
          console.error(
            `Error getting native balance for chain ${chain}:`,
            error
          )
          return 0
        }
      }),

      ...tokenConfigs.map(async token => {
        try {
          const tokenBalance = await getCryptoTokenBalance(
            walletAddress,
            token.address,
            token.chain
          )
          return tokenBalance.balance
        } catch (error) {
          console.error(
            `Error getting token balance for ${token.symbol}:`,
            error
          )
          return 0
        }
      }),
    ]

    // Wait for all balance requests to complete
    const balances = await Promise.all(balancePromises)
    totalBalance = balances.reduce((sum, balance) => sum + balance, 0)

    return { balance: totalBalance }
  } catch (error) {
    console.error('Error getting total wallet balance:', error)
    return { balance: 0 }
  }
}

export const getCryptoBalance = async (
  walletAddress: string,
  tokenAddress: string,
  chainId: number
): Promise<{ balance: number }> => {
  const chain = Object.values(SupportedChain).find(
    supportedChain => getChainId(supportedChain) === chainId
  )

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`)
  }

  return getCryptoTokenBalance(walletAddress, tokenAddress, chain)
}

export const getTokenDecimals = async (
  tokenAddress: string,
  chain: SupportedChain
): Promise<number> => {
  try {
    const chainInfo = getChainInfo(chain)
    if (!chainInfo) {
      throw new Error(`Unsupported chain: ${chain}`)
    }

    const contract = getContract({
      client: thirdWebClient,
      chain: chainInfo.thirdwebChain,
      address: tokenAddress as `0x${string}`,
      abi: erc20Abi,
    })

    const decimals = await readContract({
      contract,
      method: 'decimals',
    })

    return Number(decimals)
  } catch (error) {
    console.error('Error getting token decimals:', error)
    // Fallback to default decimals for known tokens
    return 18
  }
}
