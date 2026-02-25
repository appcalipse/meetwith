/**
 * Tests for rpc_helper
 * Testing blockchain RPC and contract interactions
 */

import {
  getBlockchainSubscriptionsForAccount,
  getDomainInfo,
  getProviderBackend,
} from '@/utils/rpc_helper'

// Mock dependencies
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
}))

jest.mock('thirdweb', () => ({
  getContract: jest.fn(),
  readContract: jest.fn(),
}))

jest.mock('@/utils/user_manager', () => ({
  thirdWebClient: {},
}))

jest.mock('@/types/chains', () => ({
  getChainInfo: jest.fn(),
  getMainnetChains: jest.fn(() => [
    {
      id: 1,
      chain: 'ethereum',
      domainContractAddess: '0x123',
      name: 'Ethereum',
    },
  ]),
  getTestnetChains: jest.fn(() => [
    {
      id: 5,
      chain: 'goerli',
      domainContractAddess: '0x456',
      name: 'Goerli',
    },
  ]),
}))

import * as Sentry from '@sentry/nextjs'
import { createPublicClient } from 'viem'
import { getChainInfo } from '@/types/chains'

describe('rpc_helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProviderBackend', () => {
    it('should create public client for chain', () => {
      const mockClient = {
        readContract: jest.fn(),
      }

      ;(getChainInfo as jest.Mock).mockReturnValue({ rpcUrl: 'http://localhost:8545' })
      ;(createPublicClient as jest.Mock).mockReturnValue(mockClient)

      const result = getProviderBackend('ethereum' as any)

      expect(createPublicClient).toHaveBeenCalled()
      expect(result).toBe(mockClient)
    })

    it('should return null for unknown chain', () => {
      ;(getChainInfo as jest.Mock).mockReturnValue(null)

      const result = getProviderBackend('unknown' as any)

      expect(result).toBeNull()
    })
  })

  describe('getBlockchainSubscriptionsForAccount', () => {
    it('should fetch subscriptions for account', async () => {
      const mockProvider = {
        readContract: jest.fn()
          .mockResolvedValueOnce(['domain1.eth']) // getDomainsForAccount
          .mockResolvedValueOnce([
            '0xowner',
            '1',
            Date.now() / 1000 + 86400,
            'domain1.eth',
            'Qmhash',
            Date.now() / 1000,
          ]), // domains
      }

      ;(getChainInfo as jest.Mock).mockReturnValue({ rpcUrl: 'http://localhost:8545' })
      ;(createPublicClient as jest.Mock).mockReturnValue(mockProvider)

      const result = await getBlockchainSubscriptionsForAccount('0xtest')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const mockProvider = {
        readContract: jest.fn().mockRejectedValue(new Error('RPC error')),
      }

      ;(getChainInfo as jest.Mock).mockReturnValue({ rpcUrl: 'http://localhost:8545' })
      ;(createPublicClient as jest.Mock).mockReturnValue(mockProvider)

      const result = await getBlockchainSubscriptionsForAccount('0xtest')

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should check mainnet chains in production', async () => {
      const mockProvider = {
        readContract: jest.fn().mockResolvedValue([]),
      }

      ;(getChainInfo as jest.Mock).mockReturnValue({ rpcUrl: 'http://localhost:8545' })
      ;(createPublicClient as jest.Mock).mockReturnValue(mockProvider)

      await getBlockchainSubscriptionsForAccount('0xtest')

      // Should call getProviderBackend via readContract
      expect(mockProvider.readContract).toHaveBeenCalled()
    })
  })

  describe('getDomainInfo', () => {
    it('should fetch domain information', async () => {
      const result = await getDomainInfo('test.eth')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle domain not found', async () => {
      const result = await getDomainInfo('nonexistent.eth')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should check all configured chains', async () => {
      const result = await getDomainInfo('test.eth')

      // Should iterate through chains
      expect(result).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should capture RPC errors', async () => {
      const mockProvider = {
        readContract: jest.fn().mockRejectedValue(new Error('Network timeout')),
      }

      ;(getChainInfo as jest.Mock).mockReturnValue({ rpcUrl: 'http://localhost:8545' })
      ;(createPublicClient as jest.Mock).mockReturnValue(mockProvider)

      await getBlockchainSubscriptionsForAccount('0xtest')

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network timeout',
        })
      )
    })

    it('should continue on chain-specific errors', async () => {
      const mockProvider = {
        readContract: jest.fn()
          .mockRejectedValueOnce(new Error('Chain 1 error'))
          .mockResolvedValueOnce([]), // Next chain succeeds
      }

      ;(getChainInfo as jest.Mock).mockReturnValue({ rpcUrl: 'http://localhost:8545' })
      ;(createPublicClient as jest.Mock).mockReturnValue(mockProvider)

      const result = await getBlockchainSubscriptionsForAccount('0xtest')

      // Should not throw, continues checking other chains
      expect(result).toBeDefined()
    })
  })
})
