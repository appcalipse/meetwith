import { captureException } from '@sentry/nextjs'
import { getContract, readContract } from 'thirdweb'

import { AcceptedToken, getChainInfo, SupportedChain } from '@/types/chains'
import { formatUnits } from '@/utils/generic_utils'
import { thirdWebClient } from '@/utils/user_manager'

export class PriceFeedService {
  #PRICE_FEEDS: Record<Partial<SupportedChain>, Record<string, string>>

  constructor() {
    this.#PRICE_FEEDS = {
      [SupportedChain.ARBITRUM]: {
        [AcceptedToken.USDC]: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
        [AcceptedToken.ETHER]: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
      },
      [SupportedChain.ARBITRUM_SEPOLIA]: {
        [AcceptedToken.USDC]: '0x0153002d20B96532C639313c2d54c3dA09109309', // use the same price feed for testnet
        [AcceptedToken.ETHER]: '0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165',
      },
      [SupportedChain.CELO]: {
        [AcceptedToken.USDC]: '0xe38A27BE4E7d866327e09736F3C570F256FFd048',
        [AcceptedToken.CELO]: '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e',
      },
      [SupportedChain.CELO_ALFAJORES]: {
        [AcceptedToken.USDC]: '0x8b255b1FB27d4D06bD8899f81095627464868EEE',
        [AcceptedToken.CELO]: '0x022F9dCC73C5Fb43F2b4eF2EF9ad3eDD1D853946',
      },
      [SupportedChain.ETHEREUM]: {
        [AcceptedToken.USDC]: '0x986b5E1e1755e3C2440e960477f25201B0a8bbD4',
        [AcceptedToken.ETHER]: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      },
      [SupportedChain.POLYGON_MATIC]: {},
      [SupportedChain.POLYGON_AMOY]: {},
      [SupportedChain.SEPOLIA]: {
        [AcceptedToken.USDC]: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
        [AcceptedToken.ETHER]: '0x694AA1769357215DE4FAC081bf1f309aDC325306',
      },
      [SupportedChain.METIS_ANDROMEDA]: {},
      [SupportedChain.CUSTOM]: {},
    }
  }

  async getPrice(chain: SupportedChain, token: AcceptedToken) {
    try {
      // TODO: Cache data for 30 seconds and return cache value through out that time use session storage for the cache
      const feedAddress = this.#PRICE_FEEDS[chain]?.[token]
      if (!feedAddress) throw new Error(`No feed for ${token} on ${chain}`)
      const chainInfo = getChainInfo(chain)
      const chainLinkAggregator = getContract({
        client: thirdWebClient,
        chain: chainInfo!.thirdwebChain,
        address: feedAddress,
        abi: [
          {
            inputs: [],
            name: 'latestRoundData',
            outputs: [
              { internalType: 'uint80', name: 'roundId', type: 'uint80' },
              { internalType: 'int256', name: 'answer', type: 'int256' },
              { internalType: 'uint256', name: 'startedAt', type: 'uint256' },
              { internalType: 'uint256', name: 'updatedAt', type: 'uint256' },
              {
                internalType: 'uint80',
                name: 'answeredInRound',
                type: 'uint80',
              },
            ],
            stateMutability: 'view',
            type: 'function',
          },
        ],
      })
      const [, price] = await readContract({
        contract: chainLinkAggregator,
        method: 'latestRoundData',
      })
      return parseFloat(formatUnits(price, 8)) // Chainlink uses 8 decimals
    } catch (error) {
      captureException(error, {
        tags: {
          chain,
          token,
          service: 'PriceFeedService',
        },
      })
      return 1 // Fallback to 1 if there's an error
    }
  }
}
