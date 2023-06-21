import { BigNumber, Contract } from 'ethers'

import { SupportedChain } from '@/types/chains'
import { GateInterface, TokenGateElement } from '@/types/TokenGating'

import { getProvider } from './rpc_helper_front'

export const getTokenBalance = async (
  walletAddress: string,
  tokenAddress: string,
  chain: SupportedChain
): Promise<BigNumber> => {
  const provider = getProvider(chain)
  if (!provider) return 0n

  const contract = new Contract(
    tokenAddress,
    ['function balanceOf(address owner) public view returns (uint256 balance)'],
    provider
  ) as Contract

  const balance = await contract.balanceOf(walletAddress)

  return balance
}

export const getNativeBalance = async (
  walletAddress: string,
  chain: SupportedChain
): Promise<BigNumber> => {
  const provider = getProvider(chain)
  if (!provider) return 0n

  const balance = await provider.getBalance(walletAddress)

  return balance
}

export const getTokenInfo = async (
  tokenAddress: string,
  chain: SupportedChain
): Promise<TokenGateElement | null> => {
  const provider = getProvider(chain)
  if (!provider) return null

  const contract = new Contract(
    tokenAddress,
    [
      'function balanceOf(address owner) public view returns (uint256 balance)', //ERC20 or ERC721
      'function name() public view returns (string name)', //ERC20 or ERC721
      'function symbol() public view returns (string symbol)', //ERC20 or ERC721
      'function decimals() public view returns (uint256 decimals)', //ERC20
      'function baseURI() public view returns (string)', //ERC721
      'function tokenURI(uint256 tokenId) public view returns (string)', //ERC721
    ],
    provider
  ) as Contract

  try {
    const name = await contract.name()
    const symbol = await contract.symbol()
    let isNFT = false
    let decimals = 0

    try {
      await contract.baseURI()
      isNFT = true
    } catch (error) {
      for (const i of [0, 1, 100, 1000, 10000]) {
        try {
          await contract.tokenURI(i)
          isNFT = true
        } catch (error) {}
      }
      if (!isNFT) {
        decimals = (await contract.decimals()).toNumber()
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
