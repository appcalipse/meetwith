import { getRpcClient } from 'thirdweb/rpc'
import { formatEther } from 'viem'

import { AcceptedToken, SupportedChain } from '@/types/chains'
import { TransactionCouldBeNotFoundError } from '@/utils/errors'
import { PriceFeedService } from '@/utils/services/chainlink.service'
import { getTransactionFeeThirdweb } from '@/utils/transaction.helper'
import { thirdWebClient } from '@/utils/user_manager'

jest.mock('thirdweb/rpc')
jest.mock('viem')
jest.mock('@/utils/services/chainlink.service')
jest.mock('@/utils/user_manager')
jest.mock('@/types/chains', () => ({
  ...jest.requireActual('@/types/chains'),
  getChainInfo: jest.fn(),
}))

const { getChainInfo } = require('@/types/chains')

describe('Transaction Helper', () => {
  const mockTxHash = '0x1234567890abcdef' as `0x${string}`
  const mockChain = SupportedChain.ARBITRUM

  beforeEach(() => {
    jest.clearAllMocks()

    getChainInfo.mockReturnValue({
      id: 42161,
      name: 'Arbitrum',
      thirdwebChain: {
        id: 42161,
        name: 'Arbitrum',
      },
    })
  })

  describe('getTransactionFeeThirdweb', () => {
    it('should fetch transaction fee and return fee details', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00', // 1 Gwei
        input: '0x',
        to: '0xto',
      }
      const mockReceipt = {
        gasUsed: '0x5208', // 21000
      }

      mockRpcRequest
        .mockResolvedValueOnce(mockTx)
        .mockResolvedValueOnce(mockReceipt)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)
      ;(formatEther as jest.Mock).mockReturnValue('0.000021')

      jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValue(2000)

      const result = await getTransactionFeeThirdweb(mockTxHash, mockChain)

      expect(getRpcClient).toHaveBeenCalledWith({
        chain: expect.objectContaining({ id: 42161 }),
        client: thirdWebClient,
      })

      expect(mockRpcRequest).toHaveBeenCalledWith({
        method: 'eth_getTransactionByHash',
        params: [mockTxHash],
      })

      expect(mockRpcRequest).toHaveBeenCalledWith({
        method: 'eth_getTransactionReceipt',
        params: [mockTxHash],
      })

      expect(result).toMatchObject({
        feeInEth: expect.any(Number),
        feeInUSD: expect.any(Number),
        feeInWei: expect.any(String),
        from: '0xfrom',
        gasPrice: expect.any(String),
        gasUsed: expect.any(String),
        receiverAddress: '0xto',
      })
    })

    it('should extract receiver from ERC20 transfer input', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00',
        input:
          '0xa9059cbb000000000000000000000000abcdef1234567890abcdef1234567890abcdef120000000000000000000000000000000000000000000000000000000000000064',
        to: '0xtoken',
      }
      const mockReceipt = {
        gasUsed: '0x5208',
      }

      mockRpcRequest
        .mockResolvedValueOnce(mockTx)
        .mockResolvedValueOnce(mockReceipt)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)
      ;(formatEther as jest.Mock).mockReturnValue('0.000021')

      jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValue(2000)

      const result = await getTransactionFeeThirdweb(mockTxHash, mockChain)

      expect(result.receiverAddress).toBe('0xabcdef1234567890abcdef1234567890abcdef12')
    })

    it('should use native token address for non-ERC20 transfers', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00',
        input: '0x',
        to: '0xrecipient',
      }
      const mockReceipt = {
        gasUsed: '0x5208',
      }

      mockRpcRequest
        .mockResolvedValueOnce(mockTx)
        .mockResolvedValueOnce(mockReceipt)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)
      ;(formatEther as jest.Mock).mockReturnValue('0.000021')

      jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValue(2000)

      const result = await getTransactionFeeThirdweb(mockTxHash, mockChain)

      expect(result.receiverAddress).toBe('0xrecipient')
    })

    it('should throw TransactionCouldBeNotFoundError if tx not found', async () => {
      const mockRpcRequest = jest.fn()

      mockRpcRequest.mockResolvedValueOnce(null)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)

      await expect(
        getTransactionFeeThirdweb(mockTxHash, mockChain)
      ).rejects.toThrow(TransactionCouldBeNotFoundError)
    })

    it('should throw TransactionCouldBeNotFoundError if receipt not found', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00',
        to: '0xto',
      }

      mockRpcRequest.mockResolvedValueOnce(mockTx).mockResolvedValueOnce(null)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)

      await expect(
        getTransactionFeeThirdweb(mockTxHash, mockChain)
      ).rejects.toThrow(TransactionCouldBeNotFoundError)
    })

    it('should use CELO token for Celo chain', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00',
        input: '0x',
        to: '0xto',
      }
      const mockReceipt = {
        gasUsed: '0x5208',
      }

      mockRpcRequest
        .mockResolvedValueOnce(mockTx)
        .mockResolvedValueOnce(mockReceipt)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)
      ;(formatEther as jest.Mock).mockReturnValue('0.000021')

      const mockGetPrice = jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValue(0.75)

      await getTransactionFeeThirdweb(mockTxHash, SupportedChain.CELO)

      expect(mockGetPrice).toHaveBeenCalledWith(
        SupportedChain.CELO,
        AcceptedToken.CELO
      )
    })

    it('should use CELO token for Celo Alfajores testnet', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00',
        input: '0x',
        to: '0xto',
      }
      const mockReceipt = {
        gasUsed: '0x5208',
      }

      mockRpcRequest
        .mockResolvedValueOnce(mockTx)
        .mockResolvedValueOnce(mockReceipt)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)
      ;(formatEther as jest.Mock).mockReturnValue('0.000021')

      const mockGetPrice = jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValue(0.75)

      await getTransactionFeeThirdweb(
        mockTxHash,
        SupportedChain.CELO_ALFAJORES
      )

      expect(mockGetPrice).toHaveBeenCalledWith(
        SupportedChain.CELO_ALFAJORES,
        AcceptedToken.CELO
      )
    })

    it('should use ETHER token for Arbitrum', async () => {
      const mockRpcRequest = jest.fn()
      const mockTx = {
        from: '0xfrom',
        gasPrice: '0x3B9ACA00',
        input: '0x',
        to: '0xto',
      }
      const mockReceipt = {
        gasUsed: '0x5208',
      }

      mockRpcRequest
        .mockResolvedValueOnce(mockTx)
        .mockResolvedValueOnce(mockReceipt)

      ;(getRpcClient as jest.Mock).mockReturnValue(mockRpcRequest)
      ;(formatEther as jest.Mock).mockReturnValue('0.000021')

      const mockGetPrice = jest
        .spyOn(PriceFeedService.prototype, 'getPrice')
        .mockResolvedValue(2000)

      await getTransactionFeeThirdweb(mockTxHash, SupportedChain.ARBITRUM)

      expect(mockGetPrice).toHaveBeenCalledWith(
        SupportedChain.ARBITRUM,
        AcceptedToken.ETHER
      )
    })
  })
})
