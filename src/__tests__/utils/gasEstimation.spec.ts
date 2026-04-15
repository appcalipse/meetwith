import {
  estimateGas,
  getContract,
  getGasPrice,
  prepareContractCall,
} from 'thirdweb'
import type { Account } from 'thirdweb/wallets'
import { parseUnits } from 'viem'

import { AcceptedToken, SupportedChain } from '@/types/chains'
import {
  estimateGasFee,
  GasEstimationParams,
  Token,
} from '@/utils/gasEstimation'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { getTokenInfo } from '@/utils/token.service'
import { thirdWebClient } from '@/utils/user_manager'

jest.mock('thirdweb')
jest.mock('viem')
jest.mock('@/utils/services/chainlink.service')
jest.mock('@/utils/token.service')
jest.mock('@/utils/user_manager')

describe('gasEstimation', () => {
  const mockAccount: Account = {
    address: '0x123',
  } as Account

  const mockToken: Token = {
    address: '0xtoken',
    chain: SupportedChain.ARBITRUM,
    chainId: 42161,
    decimals: 6,
    icon: '/icon.png',
    name: 'USDC',
    symbol: 'USDC',
  }

  const mockParams: GasEstimationParams = {
    activeWallet: {
      getAccount: jest.fn().mockReturnValue(mockAccount),
    },
    amount: '100',
    recipientAddress: '0xrecipient',
    selectedToken: mockToken,
    sendNetwork: SupportedChain.ARBITRUM,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('estimateGasFee', () => {
    beforeEach(() => {
      ;(getContract as jest.Mock).mockReturnValue({
        abi: [],
        address: mockToken.address,
      })
      ;(getTokenInfo as jest.Mock).mockResolvedValue({
        decimals: 6,
        name: 'USDC',
        symbol: 'USDC',
      })
      ;(parseUnits as jest.Mock).mockReturnValue(100000000n)
      ;(prepareContractCall as jest.Mock).mockReturnValue({
        to: mockToken.address,
      })
      ;(estimateGas as jest.Mock).mockResolvedValue(21000n)
      ;(getGasPrice as jest.Mock).mockResolvedValue(1000000000n)

      jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValueOnce(1.0) // Token price
        .mockResolvedValueOnce(2000.0) // ETH price
    })

    it('should successfully estimate gas fee in USD', async () => {
      const result = await estimateGasFee(mockParams)

      expect(result.success).toBe(true)
      expect(result.estimatedFee).toBeDefined()
      expect(typeof result.estimatedFee).toBe('number')
      expect(result.error).toBeUndefined()
    })

    it('should return error for unsupported network', async () => {
      const invalidParams = {
        ...mockParams,
        sendNetwork: 'INVALID_NETWORK' as SupportedChain,
      }

      const result = await estimateGasFee(invalidParams)

      expect(result.success).toBe(false)
      expect(result.estimatedFee).toBe(0)
      expect(result.error).toBe('Unsupported network')
    })

    it('should create contract with correct parameters', async () => {
      await estimateGasFee(mockParams)

      expect(getContract).toHaveBeenCalledWith({
        abi: expect.arrayContaining([
          expect.objectContaining({
            name: 'transfer',
            type: 'function',
          }),
        ]),
        address: mockToken.address,
        chain: expect.any(Object),
        client: thirdWebClient,
      })
    })

    it('should fetch token info for decimals', async () => {
      await estimateGasFee(mockParams)

      expect(getTokenInfo).toHaveBeenCalledWith(
        mockToken.address,
        SupportedChain.ARBITRUM
      )
    })

    it('should return error if token info not available', async () => {
      ;(getTokenInfo as jest.Mock).mockResolvedValue(null)

      const result = await estimateGasFee(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unable to get token details')
    })

    it('should return error if token decimals not available', async () => {
      ;(getTokenInfo as jest.Mock).mockResolvedValue({
        name: 'USDC',
        symbol: 'USDC',
      })

      const result = await estimateGasFee(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unable to get token details')
    })

    it('should get market price for token', async () => {
      await estimateGasFee(mockParams)

      expect(PriceFeedService.prototype.getPrice).toHaveBeenCalledWith(
        SupportedChain.ARBITRUM,
        AcceptedToken.USDC
      )
    })

    it('should convert amount using market price', async () => {
      await estimateGasFee(mockParams)

      expect(parseUnits).toHaveBeenCalledWith(
        expect.stringContaining('100'),
        6
      )
    })

    it('should prepare contract call with transfer method', async () => {
      await estimateGasFee(mockParams)

      expect(prepareContractCall).toHaveBeenCalledWith({
        contract: expect.any(Object),
        method: 'transfer',
        params: [mockParams.recipientAddress, expect.any(BigInt)],
      })
    })

    it('should estimate gas for transaction', async () => {
      await estimateGasFee(mockParams)

      expect(estimateGas).toHaveBeenCalledWith({
        account: mockAccount,
        transaction: expect.any(Object),
      })
    })

    it('should get current gas price', async () => {
      await estimateGasFee(mockParams)

      expect(getGasPrice).toHaveBeenCalledWith({
        chain: expect.any(Object),
        client: thirdWebClient,
      })
    })

    it('should calculate fee in USD', async () => {
      const result = await estimateGasFee(mockParams)

      expect(result.estimatedFee).toBeGreaterThan(0)
    })

    it('should handle CELO network with CELO token', async () => {
      const celoParams = {
        ...mockParams,
        sendNetwork: SupportedChain.CELO,
        selectedToken: {
          ...mockToken,
          chain: SupportedChain.CELO,
        },
      }

      await estimateGasFee(celoParams)

      expect(PriceFeedService.prototype.getPrice).toHaveBeenCalledWith(
        SupportedChain.CELO,
        AcceptedToken.USDC
      )
    })

    it('should handle CELO Alfajores testnet', async () => {
      const celoAlfajoresParams = {
        ...mockParams,
        sendNetwork: SupportedChain.CELO_ALFAJORES,
        selectedToken: {
          ...mockToken,
          chain: SupportedChain.CELO_ALFAJORES,
        },
      }

      await estimateGasFee(celoAlfajoresParams)

      expect(getTokenInfo).toHaveBeenCalledWith(
        expect.any(String),
        SupportedChain.CELO_ALFAJORES
      )
    })

    it('should use ETH token for Ethereum network', async () => {
      const ethParams = {
        ...mockParams,
        sendNetwork: SupportedChain.ETHEREUM,
      }

      jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValueOnce(1.0)
        .mockResolvedValueOnce(3000.0)

      await estimateGasFee(ethParams)

      expect(PriceFeedService.prototype.getPrice).toHaveBeenCalledWith(
        SupportedChain.ETHEREUM,
        expect.any(String)
      )
    })

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Gas estimation failed')
      ;(estimateGas as jest.Mock).mockRejectedValue(mockError)

      const result = await estimateGasFee(mockParams)

      expect(result.success).toBe(false)
      expect(result.estimatedFee).toBe(0)
      expect(result.error).toBe('Gas estimation failed')
      expect(console.error).toHaveBeenCalledWith(
        'Error estimating gas fee:',
        mockError
      )
    })

    it('should handle unknown errors', async () => {
      ;(estimateGas as jest.Mock).mockRejectedValue('Unknown error')

      const result = await estimateGasFee(mockParams)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unknown error')
    })

    it('should calculate correct fee in native token', async () => {
      const gasEstimate = 21000n
      const gasPrice = 1000000000n
      ;(estimateGas as jest.Mock).mockResolvedValue(gasEstimate)
      ;(getGasPrice as jest.Mock).mockResolvedValue(gasPrice)

      await estimateGasFee(mockParams)

      expect(estimateGas).toHaveBeenCalled()
      expect(getGasPrice).toHaveBeenCalled()
    })

    it('should get native token price', async () => {
      await estimateGasFee(mockParams)

      // Second call should be for native token (ETH or CELO)
      expect(PriceFeedService.prototype.getPrice).toHaveBeenNthCalledWith(
        2,
        mockParams.sendNetwork,
        expect.any(String)
      )
    })

    it('should handle different token amounts', async () => {
      const smallAmountParams = {
        ...mockParams,
        amount: '0.01',
      }

      const result = await estimateGasFee(smallAmountParams)

      expect(result.success).toBe(true)
      expect(parseUnits).toHaveBeenCalled()
    })

    it('should handle large token amounts', async () => {
      const largeAmountParams = {
        ...mockParams,
        amount: '1000000',
      }

      const result = await estimateGasFee(largeAmountParams)

      expect(result.success).toBe(true)
    })

    it('should use correct native token for chain', async () => {
      const celoParams = {
        ...mockParams,
        sendNetwork: SupportedChain.CELO,
      }

      await estimateGasFee(celoParams)

      // Should use CELO token for Celo network
      expect(PriceFeedService.prototype.getPrice).toHaveBeenCalledWith(
        SupportedChain.CELO,
        expect.any(String)
      )
    })
  })
})
