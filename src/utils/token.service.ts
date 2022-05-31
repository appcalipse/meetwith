import { BigNumber, ethers } from 'ethers'

import { SupportedChain } from '@/types/chains'
import { TokenGateElement, TokenInterface } from '@/types/TokenGating'

import { getProvider } from './rpc_helper_front'

export const getTokenBalance = async (
  walletAddress: string,
  tokenAddress: string,
  chain: SupportedChain
): Promise<BigNumber> => {
  const provider = getProvider(chain)
  if (!provider) return BigNumber.from(0)

  const contract = new ethers.Contract(
    tokenAddress,
    ['function balanceOf(address owner) public view returns (uint256 balance)'],
    provider
  ) as ethers.Contract

  const balance = await contract.balanceOf(walletAddress)

  return balance
}

export const getTokenInfo = async (
  tokenAddress: string,
  chain: SupportedChain
): Promise<TokenGateElement | null> => {
  const provider = getProvider(chain)
  if (!provider) return null

  const contract = new ethers.Contract(
    tokenAddress,
    [
      'function balanceOf(address owner) public view returns (uint256 balance)', //ERC20 or ERC721
      'function name() public view returns (string name)', //ERC20 or ERC721
      'function symbol() public view returns (string symbol)', //ERC20 or ERC721
      'function decimals() public view returns (uint256 decimals)', //ERC20
      'function baseURI() public view returns (string)', //ERC721
    ],
    provider
  ) as ethers.Contract

  try {
    const name = await contract.name()
    const symbol = await contract.symbol()
    let isNFT = false
    let decimals = 0

    try {
      await contract.baseURI()
      isNFT = true
    } catch (error) {
      decimals = await contract.decimals()
    }

    return {
      tokenName: name,
      tokenSymbol: symbol,
      tokenAddress: tokenAddress,
      decimals,
      chain: chain,
      type: isNFT ? TokenInterface.ERC721 : TokenInterface.ERC20,
      minimumBalance: BigNumber.from(0),
    }
  } catch (error) {
    console.log(error)
    return null
  }
}
