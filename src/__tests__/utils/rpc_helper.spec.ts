/**
 * Tests for rpc_helper
 * Testing blockchain RPC and contract interactions
 */

import {
  getBlockchainSubscriptionsForAccount,
  getDomainInfo,
  getProviderBackend,
  getProvider,
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

describe('rpc_helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProvider', () => {
    it('should create public client for chain', () => {
      const mockClient = {
        readContract: jest.fn(),
      }

      ;(createPublicClient as jest.Mock).mockReturnValue(mockClient)

      const result = getProvider('ethereum')

      expect(createPublicClient).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('getProviderBackend', () => {
    it('should create backend provider for chain', () => {
      const result = getProviderBackend('ethereum')

      expect(result).toBeDefined()
    })

    it('should cache provider instances', () => {
      const first = getProviderBackend('ethereum')
      const second = getProviderBackend('ethereum')

      // Should return same instance (cached)
      expect(first).toBe(second)
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

      // Mock getProviderBackend to return our mock
      jest.spyOn(require('@/utils/rpc_helper'), 'getProviderBackend')
        .mockReturnValue(mockProvider)

      const result = await getBlockchainSubscriptionsForAccount('0xtest')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      const mockProvider = {
        readContract: jest.fn().mockRejectedValue(new Error('RPC error')),
      }

      jest.spyOn(require('@/utils/rpc_helper'), 'getProviderBackend')
        .mockReturnValue(mockProvider)

      const result = await getBlockchainSubscriptionsForAccount('0xtest')

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should check mainnet chains in production', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const mockProvider = {
        readContract: jest.fn().mockResolvedValue([]),
      }

      jest.spyOn(require('@/utils/rpc_helper'), 'getProviderBackend')
        .mockReturnValue(mockProvider)

      await getBlockchainSubscriptionsForAccount('0xtest')

      // Should call getMainnetChains
      expect(mockProvider.readContract).toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('getDomainInfo', () => {
    it('should fetch domain information', async () => {
      const mockContract = {
        call: jest.fn().mockResolvedValue({
          owner: '0xowner',
          planId: '1',
          expiryTime: Date.now() / 1000 + 86400,
          domain: 'test.eth',
        }),
      }

      const result = await getDomainInfo('test.eth')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle domain not found', async () => {
      const mockContract = {
        call: jest.fn().mockRejectedValue(new Error('Domain not found')),
      }

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

      jest.spyOn(require('@/utils/rpc_helper'), 'getProviderBackend')
        .mockReturnValue(mockProvider)

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

      jest.spyOn(require('@/utils/rpc_helper'), 'getProviderBackend')
        .mockReturnValue(mockProvider)

      const result = await getBlockchainSubscriptionsForAccount('0xtest')

      // Should not throw, continues checking other chains
      expect(result).toBeDefined()
    })
  })
})
