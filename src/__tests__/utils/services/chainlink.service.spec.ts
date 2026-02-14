import * as Sentry from '@sentry/nextjs'
import { getContract, readContract } from 'thirdweb'

import { AcceptedToken, SupportedChain } from '@/types/chains'
import { formatUnits } from '@/utils/generic_utils'
import QueryKeys from '@/utils/query_keys'
import { queryClient } from '@/utils/react_query'
import {
  getPriceForChain,
  PriceFeedService,
} from '@/utils/services/chainlink.service'
import { thirdWebClient } from '@/utils/user_manager'

jest.mock('@sentry/nextjs')
jest.mock('thirdweb')
jest.mock('@/utils/generic_utils')
jest.mock('@/utils/react_query', () => ({
  queryClient: {
    fetchQuery: jest.fn(),
  },
}))

describe('ChainlinkService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPriceForChain', () => {
    it('should return formatted price', async () => {
      const mockPrice = 1234.56
      jest.spyOn(PriceFeedService.prototype, 'getPrice').mockResolvedValue(mockPrice)

      const result = await getPriceForChain(
        SupportedChain.ARBITRUM,
        AcceptedToken.USDC
      )

      expect(result).toBe('$1234.56')
    })

    it('should return fallback price on error', async () => {
      jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockRejectedValue(new Error('API error'))
      jest.spyOn(console, 'warn').mockImplementation()

      const result = await getPriceForChain(
        SupportedChain.ARBITRUM,
        AcceptedToken.USDC
      )

      expect(result).toBe('$1.00')
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get price'),
        expect.any(Error)
      )
    })

    it('should handle different chains and tokens', async () => {
      jest.spyOn(PriceFeedService.prototype, 'getPrice').mockResolvedValue(2500.0)

      const result = await getPriceForChain(
        SupportedChain.ETHEREUM,
        AcceptedToken.ETHER
      )

      expect(result).toBe('$2500.00')
    })
  })

  describe('PriceFeedService', () => {
    let service: PriceFeedService

    beforeEach(() => {
      service = new PriceFeedService()
    })

    describe('constructor', () => {
      it('should initialize with price feed addresses', () => {
        expect(service).toBeDefined()
      })
    })

    describe('getPrice', () => {
      it('should fetch price from Chainlink oracle', async () => {
        const mockContract = {
          abi: expect.any(Array),
          address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
          chain: expect.any(Object),
        }

        ;(getContract as jest.Mock).mockReturnValue(mockContract)
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          100000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.ARBITRUM,
          AcceptedToken.USDC
        )

        expect(getContract).toHaveBeenCalledWith({
          abi: expect.arrayContaining([
            expect.objectContaining({
              name: 'latestRoundData',
            }),
          ]),
          address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
          chain: expect.any(Object),
          client: thirdWebClient,
        })

        expect(queryClient.fetchQuery).toHaveBeenCalledWith(
          QueryKeys.chainLinkAggregator(
            mockContract.address,
            expect.any(Number),
            'latestRoundData'
          ),
          expect.any(Function)
        )

        expect(formatUnits).toHaveBeenCalledWith(100000000n, 8)
        expect(result).toBe(1.0)
      })

      it('should query Chainlink for USDT on Arbitrum', async () => {
        const mockContract = { address: '0x3f3f5dF88dC9F13eac63DF89EC16ef6e7E25DdE7' }
        ;(getContract as jest.Mock).mockReturnValue(mockContract)
        ;(formatUnits as jest.Mock).mockReturnValue('0.99')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          99000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.ARBITRUM,
          AcceptedToken.USDT
        )

        expect(result).toBe(0.99)
      })

      it('should query Chainlink for ETH on Arbitrum', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('2500.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          250000000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.ARBITRUM,
          AcceptedToken.ETHER
        )

        expect(result).toBe(2500.0)
      })

      it('should query Chainlink for CELO on Celo', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x0568fD19986748cEfF3301e55c0eb1E729E0Ab7e',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('0.75')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          75000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.CELO,
          AcceptedToken.CELO
        )

        expect(result).toBe(0.75)
      })

      it('should query Chainlink for USDC on Celo Alfajores testnet', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x8b255b1FB27d4D06bD8899f81095627464868EEE',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          100000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.CELO_ALFAJORES,
          AcceptedToken.USDC
        )

        expect(result).toBe(1.0)
      })

      it('should throw error if feed address not found', async () => {
        await expect(
          service.getPrice(SupportedChain.POLYGON_MATIC, AcceptedToken.USDC)
        ).rejects.toThrow('No feed for USDC on polygon')
      })

      it('should return fallback 1 on error and capture exception', async () => {
        const mockError = new Error('Network error')
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
        })
        ;(queryClient.fetchQuery as jest.Mock).mockRejectedValue(mockError)

        const result = await service.getPrice(
          SupportedChain.ARBITRUM,
          AcceptedToken.USDC
        )

        expect(result).toBe(1)
        expect(Sentry.captureException).toHaveBeenCalledWith(mockError, {
          tags: {
            chain: SupportedChain.ARBITRUM,
            service: 'PriceFeedService',
            token: AcceptedToken.USDC,
          },
        })
      })

      it('should handle Ethereum mainnet USDC', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x986b5E1e1755e3C2440e960477f25201B0a8bbD4',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          100000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.ETHEREUM,
          AcceptedToken.USDC
        )

        expect(result).toBe(1.0)
      })

      it('should handle Sepolia testnet', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0xA2F78ab2355fe2f984D808B5CeE7FD0A93D5270E',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          100000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.SEPOLIA,
          AcceptedToken.USDC
        )

        expect(result).toBe(1.0)
      })

      it('should execute readContract with correct parameters', async () => {
        const mockContract = {
          address: '0x50834F3163758fcC1Df9973b6e91f0F0F0434aD3',
        }
        ;(getContract as jest.Mock).mockReturnValue(mockContract)
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')

        let capturedQueryFunction: (() => Promise<any>) | undefined

        ;(queryClient.fetchQuery as jest.Mock).mockImplementation(
          async (key, queryFn) => {
            capturedQueryFunction = queryFn
            return [0n, 100000000n, 0n, 0n, 0n]
          }
        )

        await service.getPrice(SupportedChain.ARBITRUM, AcceptedToken.USDC)

        expect(capturedQueryFunction).toBeDefined()

        if (capturedQueryFunction) {
          ;(readContract as jest.Mock).mockResolvedValue([
            0n,
            100000000n,
            0n,
            0n,
            0n,
          ])
          const result = await capturedQueryFunction()

          expect(readContract).toHaveBeenCalledWith({
            contract: mockContract,
            method: 'latestRoundData',
          })
          expect(result).toEqual([0n, 100000000n, 0n, 0n, 0n])
        }
      })

      it('should handle CUSD on Celo', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0xe38A27BE4E7d866327e09736F3C570F256FFd048',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          100000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.CELO,
          AcceptedToken.CUSD
        )

        expect(result).toBe(1.0)
      })

      it('should handle CEUR on Celo', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x9a48d9b0AF457eF040281A9Af3867bc65522Fecd',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('1.10')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          110000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.CELO,
          AcceptedToken.CEUR
        )

        expect(result).toBe(1.1)
      })

      it('should handle Arbitrum Sepolia testnet', async () => {
        ;(getContract as jest.Mock).mockReturnValue({
          address: '0x0153002d20B96532C639313c2d54c3dA09109309',
        })
        ;(formatUnits as jest.Mock).mockReturnValue('1.00')
        ;(queryClient.fetchQuery as jest.Mock).mockResolvedValue([
          0n,
          100000000n,
          0n,
          0n,
          0n,
        ])

        const result = await service.getPrice(
          SupportedChain.ARBITRUM_SEPOLIA,
          AcceptedToken.USDC
        )

        expect(result).toBe(1.0)
      })
    })
  })
})
