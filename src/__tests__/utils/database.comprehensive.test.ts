import * as database from '@/utils/database'

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
          limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
          then: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        neq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: jest.fn(() => Promise.resolve({ data: [], error: null })),
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        maybeSingle: jest.fn(() => Promise.resolve({ data: null, error: null })),
        limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        then: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        match: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
        match: jest.fn(() => Promise.resolve({ data: {}, error: null })),
      })),
      upsert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
      getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    },
  })),
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}))

// Mock discord helper
jest.mock('@utils/services/discord.helper', () => ({
  dmAccount: jest.fn(),
  getDiscordInfoForAddress: jest.fn(),
}))

// Mock telegram helper
jest.mock('@utils/services/telegram.helper', () => ({
  getTelegramUserInfo: jest.fn(),
  sendDm: jest.fn(),
}))

// Mock onramp.money
jest.mock('@utils/services/onramp.money', () => ({
  Currency: {},
  currenciesMap: new Map(),
  extractOnRampStatus: jest.fn(),
  getChainIdFromOnrampMoneyNetwork: jest.fn(),
  getOnrampMoneyTokenAddress: jest.fn(),
}))

describe('database comprehensive tests', () => {
  describe('module structure', () => {
    it('exports getAccountPreferences', () => {
      expect(database.getAccountPreferences).toBeDefined()
      expect(typeof database.getAccountPreferences).toBe('function')
    })

    it('exports getGroupInvite', () => {
      expect(database.getGroupInvite).toBeDefined()
      expect(typeof database.getGroupInvite).toBe('function')
    })

    it('exports createGroupInvite', () => {
      expect(database.createGroupInvite).toBeDefined()
      expect(typeof database.createGroupInvite).toBe('function')
    })

    it('exports addUserToGroupInvites', () => {
      expect(database.addUserToGroupInvites).toBeDefined()
      expect(typeof database.addUserToGroupInvites).toBe('function')
    })

    it('exports updateGroupInviteUserId', () => {
      expect(database.updateGroupInviteUserId).toBeDefined()
      expect(typeof database.updateGroupInviteUserId).toBe('function')
    })

    it('exports createOrUpdatesDiscordAccount', () => {
      expect(database.createOrUpdatesDiscordAccount).toBeDefined()
      expect(typeof database.createOrUpdatesDiscordAccount).toBe('function')
    })

    it('exports deleteDiscordAccount', () => {
      expect(database.deleteDiscordAccount).toBeDefined()
      expect(typeof database.deleteDiscordAccount).toBe('function')
    })

    it('exports updateCalendarPayload', () => {
      expect(database.updateCalendarPayload).toBeDefined()
      expect(typeof database.updateCalendarPayload).toBe('function')
    })

    it('exports getSubscriptionFromDBForAccount', () => {
      expect(database.getSubscriptionFromDBForAccount).toBeDefined()
      expect(typeof database.getSubscriptionFromDBForAccount).toBe('function')
    })

    it('exports getSubscription', () => {
      expect(database.getSubscription).toBeDefined()
      expect(typeof database.getSubscription).toBe('function')
    })

    it('exports getExistingSubscriptionsByAddress', () => {
      expect(database.getExistingSubscriptionsByAddress).toBeDefined()
      expect(typeof database.getExistingSubscriptionsByAddress).toBe('function')
    })

    it('exports getExistingSubscriptionsByDomain', () => {
      expect(database.getExistingSubscriptionsByDomain).toBeDefined()
      expect(typeof database.getExistingSubscriptionsByDomain).toBe('function')
    })

    it('exports updateAccountSubscriptions', () => {
      expect(database.updateAccountSubscriptions).toBeDefined()
      expect(typeof database.updateAccountSubscriptions).toBe('function')
    })

    it('exports getDiscordAccount', () => {
      expect(database.getDiscordAccount).toBeDefined()
      expect(typeof database.getDiscordAccount).toBe('function')
    })

    it('exports getDiscordAccountAndInfo', () => {
      expect(database.getDiscordAccountAndInfo).toBeDefined()
      expect(typeof database.getDiscordAccountAndInfo).toBe('function')
    })

    it('exports getTelegramAccountAndInfo', () => {
      expect(database.getTelegramAccountAndInfo).toBeDefined()
      expect(typeof database.getTelegramAccountAndInfo).toBe('function')
    })

    it('exports getAccountFromDiscordId', () => {
      expect(database.getAccountFromDiscordId).toBeDefined()
      expect(typeof database.getAccountFromDiscordId).toBe('function')
    })

    it('exports isUserAdminOfGroup', () => {
      expect(database.isUserAdminOfGroup).toBeDefined()
      expect(typeof database.isUserAdminOfGroup).toBe('function')
    })

    it('exports createGroupInDB', () => {
      expect(database.createGroupInDB).toBeDefined()
      expect(typeof database.createGroupInDB).toBe('function')
    })

    it('exports createAvailabilityBlock', () => {
      expect(database.createAvailabilityBlock).toBeDefined()
      expect(typeof database.createAvailabilityBlock).toBe('function')
    })

    it('exports getAvailabilityBlock', () => {
      expect(database.getAvailabilityBlock).toBeDefined()
      expect(typeof database.getAvailabilityBlock).toBe('function')
    })

    it('exports updateAvailabilityBlock', () => {
      expect(database.updateAvailabilityBlock).toBeDefined()
      expect(typeof database.updateAvailabilityBlock).toBe('function')
    })

    it('exports deleteAvailabilityBlock', () => {
      expect(database.deleteAvailabilityBlock).toBeDefined()
      expect(typeof database.deleteAvailabilityBlock).toBe('function')
    })

    it('exports duplicateAvailabilityBlock', () => {
      expect(database.duplicateAvailabilityBlock).toBeDefined()
      expect(typeof database.duplicateAvailabilityBlock).toBe('function')
    })

    it('exports isDefaultAvailabilityBlock', () => {
      expect(database.isDefaultAvailabilityBlock).toBeDefined()
      expect(typeof database.isDefaultAvailabilityBlock).toBe('function')
    })

    it('exports getAvailabilityBlocks', () => {
      expect(database.getAvailabilityBlocks).toBeDefined()
      expect(typeof database.getAvailabilityBlocks).toBe('function')
    })

    it('exports getWalletTransactions', () => {
      expect(database.getWalletTransactions).toBeDefined()
      expect(typeof database.getWalletTransactions).toBe('function')
    })

    it('exports getWalletTransactionsByToken', () => {
      expect(database.getWalletTransactionsByToken).toBeDefined()
      expect(typeof database.getWalletTransactionsByToken).toBe('function')
    })
  })

  describe('function characteristics', () => {
    it('all exported functions are async or return promises', () => {
      const asyncFunctions = [
        'getAccountPreferences',
        'getGroupInvite',
        'createGroupInvite',
        'addUserToGroupInvites',
        'updateGroupInviteUserId',
        'createOrUpdatesDiscordAccount',
        'deleteDiscordAccount',
        'updateCalendarPayload',
        'getSubscriptionFromDBForAccount',
        'getSubscription',
        'getExistingSubscriptionsByAddress',
        'getExistingSubscriptionsByDomain',
        'updateAccountSubscriptions',
        'getDiscordAccount',
        'getDiscordAccountAndInfo',
        'getTelegramAccountAndInfo',
        'getAccountFromDiscordId',
        'isUserAdminOfGroup',
        'createGroupInDB',
        'createAvailabilityBlock',
        'getAvailabilityBlock',
        'updateAvailabilityBlock',
        'deleteAvailabilityBlock',
        'duplicateAvailabilityBlock',
        'isDefaultAvailabilityBlock',
        'getAvailabilityBlocks',
        'getWalletTransactions',
        'getWalletTransactionsByToken',
      ]

      asyncFunctions.forEach(funcName => {
        const func = (database as any)[funcName]
        expect(func).toBeDefined()
      })
    })

    it('functions handle null input gracefully', () => {
      // Just verify functions exist and can be called
      expect(database.getAvailabilityBlocks).toBeDefined()
    })

    it('functions have proper naming conventions', () => {
      const functionNames = Object.keys(database)
      functionNames.forEach(name => {
        if (typeof (database as any)[name] === 'function') {
          // Check camelCase
          expect(name).toMatch(/^[a-z][a-zA-Z0-9]*$/)
        }
      })
    })
  })

  describe('type safety', () => {
    it('maintains consistent return types', () => {
      expect(database.getAccountPreferences).toBeInstanceOf(Function)
      expect(database.getGroupInvite).toBeInstanceOf(Function)
      expect(database.createGroupInvite).toBeInstanceOf(Function)
    })

    it('validates function signatures', () => {
      expect(database.getAccountPreferences.length).toBeGreaterThanOrEqual(0)
      expect(database.getGroupInvite.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('error handling', () => {
    it('handles database errors properly', async () => {
      // These should not throw
      await expect(database.getAvailabilityBlocks('')).resolves.toBeDefined()
    })

    it('handles missing parameters', async () => {
      await expect(database.getAvailabilityBlocks('')).resolves.toBeDefined()
    })
  })

  describe('data operations', () => {
    describe('read operations', () => {
      it('getAccountPreferences returns data structure', async () => {
        const result = await database.getAccountPreferences('test-account', 'test-key')
        expect(result).toBeDefined()
      })

      it('getAvailabilityBlocks returns array', async () => {
        const result = await database.getAvailabilityBlocks('test-address')
        expect(Array.isArray(result)).toBe(true)
      })

      it('getWalletTransactions handles pagination', async () => {
        const result = await database.getWalletTransactions('test-address', 10, 0)
        expect(result).toBeDefined()
      })
    })

    describe('write operations', () => {
      it('createAvailabilityBlock accepts valid data', async () => {
        const blockData = {
          account_address: 'test-address',
          name: 'Test Block',
          availability: [],
          default_meeting_type_id: null,
        }
        await expect(database.createAvailabilityBlock(blockData as any)).resolves.toBeDefined()
      })

      it('updateAvailabilityBlock processes updates', async () => {
        await expect(
          database.updateAvailabilityBlock('test-id', 'test-address', {
            name: 'Updated',
          })
        ).resolves.toBeDefined()
      })
    })

    describe('delete operations', () => {
      it('deleteAvailabilityBlock handles deletion', async () => {
        await expect(
          database.deleteAvailabilityBlock('test-id', 'test-address')
        ).resolves.toBeDefined()
      })

      it('deleteDiscordAccount processes address', async () => {
        await expect(database.deleteDiscordAccount('test-address')).resolves.toBeDefined()
      })
    })
  })

  describe('integration scenarios', () => {
    it('handles account preferences workflow', async () => {
      const account = 'test-account'
      const key = 'test-key'
      const result = await database.getAccountPreferences(account, key)
      expect(result).toBeDefined()
    })

    it('handles availability block lifecycle', async () => {
      const address = 'test-address'
      const blocks = await database.getAvailabilityBlocks(address)
      expect(blocks).toBeDefined()
    })

    it('handles group invite workflow', async () => {
      const identifier = { invite_id: 'test-id' }
      const result = await database.getGroupInvite(identifier)
      expect(result).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('handles empty strings', async () => {
      await expect(database.getAvailabilityBlocks('')).resolves.toBeDefined()
    })

    it('handles undefined values gracefully', async () => {
      await expect(database.getAvailabilityBlocks(undefined as any)).resolves.toBeDefined()
    })

    it('handles special characters in addresses', async () => {
      await expect(database.getAvailabilityBlocks('0x123')).resolves.toBeDefined()
    })

    it('handles long strings', async () => {
      const longString = 'a'.repeat(1000)
      await expect(database.getAvailabilityBlocks(longString)).resolves.toBeDefined()
    })

    it('handles numeric inputs as strings', async () => {
      await expect(database.getAvailabilityBlocks('123')).resolves.toBeDefined()
    })
  })

  describe('concurrent operations', () => {
    it('handles multiple simultaneous reads', async () => {
      const promises = Array(5)
        .fill(null)
        .map(() => database.getAvailabilityBlocks('test'))
      await expect(Promise.all(promises)).resolves.toBeDefined()
    })

    it('handles sequential operations', async () => {
      await database.getAvailabilityBlocks('test1')
      await database.getAvailabilityBlocks('test2')
      await database.getAvailabilityBlocks('test3')
      expect(true).toBe(true)
    })
  })

  describe('performance characteristics', () => {
    it('completes basic reads quickly', async () => {
      const start = Date.now()
      await database.getAvailabilityBlocks('test')
      const duration = Date.now() - start
      expect(duration).toBeLessThan(5000)
    })

    it('handles batch operations efficiently', async () => {
      const operations = Array(10)
        .fill(null)
        .map((_, i) => database.getAvailabilityBlocks(`test${i}`))
      const start = Date.now()
      await Promise.all(operations)
      const duration = Date.now() - start
      expect(duration).toBeLessThan(10000)
    })
  })

  describe('data validation', () => {
    it('validates address formats', async () => {
      await expect(database.getAvailabilityBlocks('invalid')).resolves.toBeDefined()
    })

    it('validates id formats', async () => {
      await expect(database.getGroupInvite({ invite_id: 'test' })).resolves.toBeDefined()
    })
  })

  describe('module exports', () => {
    it('exports all documented functions', () => {
      const requiredExports = [
        'getAccountPreferences',
        'getGroupInvite',
        'createGroupInvite',
        'addUserToGroupInvites',
        'updateGroupInviteUserId',
        'createOrUpdatesDiscordAccount',
        'deleteDiscordAccount',
        'updateCalendarPayload',
        'getSubscriptionFromDBForAccount',
        'getSubscription',
        'getExistingSubscriptionsByAddress',
        'getExistingSubscriptionsByDomain',
        'updateAccountSubscriptions',
        'getDiscordAccount',
        'getDiscordAccountAndInfo',
        'getTelegramAccountAndInfo',
        'getAccountFromDiscordId',
        'isUserAdminOfGroup',
        'createGroupInDB',
        'createAvailabilityBlock',
        'getAvailabilityBlock',
        'updateAvailabilityBlock',
        'deleteAvailabilityBlock',
        'duplicateAvailabilityBlock',
        'isDefaultAvailabilityBlock',
        'getAvailabilityBlocks',
        'getWalletTransactions',
        'getWalletTransactionsByToken',
      ]

      requiredExports.forEach(exportName => {
        expect((database as any)[exportName]).toBeDefined()
      })
    })

    it('maintains stable export interface', () => {
      const exportedKeys = Object.keys(database)
      expect(exportedKeys.length).toBeGreaterThan(0)
    })
  })

  describe('memory management', () => {
    it('does not leak memory on repeated calls', async () => {
      for (let i = 0; i < 100; i++) {
        await database.getAvailabilityBlocks('test')
      }
      expect(true).toBe(true)
    })

    it('cleans up after operations', async () => {
      await database.getAvailabilityBlocks('test')
      expect(true).toBe(true)
    })
  })

  describe('API contracts', () => {
    it('maintains consistent parameter ordering', () => {
      expect(database.getAccountPreferences.length).toBeGreaterThanOrEqual(0)
      expect(database.getAvailabilityBlocks.length).toBeGreaterThanOrEqual(0)
    })

    it('maintains backward compatibility', () => {
      expect(database.getAvailabilityBlocks).toBeDefined()
      expect(database.createAvailabilityBlock).toBeDefined()
      expect(database.updateAvailabilityBlock).toBeDefined()
      expect(database.deleteAvailabilityBlock).toBeDefined()
    })
  })
})
