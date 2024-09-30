import { erc20Abi } from 'abitype/abis'
import { Abi } from 'abitype/zod'
import { getContract, readContract } from 'thirdweb'
import { viemAdapter } from 'thirdweb/adapters/viem'

import { ERC721 } from '@/abis/erc721'
import { getChainInfo, SupportedChain, TokenMeta } from '@/types/chains'
import { GateInterface, TokenGateElement } from '@/types/TokenGating'

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
    params: [walletAddress],
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
): Promise<TokenGateElement | null> => {
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
    }
  } catch (error) {
    return null
  }
}
