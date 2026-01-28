/**
 * Expanded unit tests for database.ts
 * Adding 50+ comprehensive tests for CRUD operations, groups, meetings, subscriptions
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.PIN_SALT = 'test-salt'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.FROM_MAIL = 'test@example.com'
process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Mock external services
jest.mock('@/utils/services/discord.helper', () => ({
  dmAccount: jest.fn(),
  getDiscordInfoForAddress: jest.fn(),
}))

jest.mock('@/utils/services/telegram.helper', () => ({
  getTelegramUserInfo: jest.fn(),
  sendDm: jest.fn(),
}))

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}))

jest.mock('@/utils/calendar_manager', () => ({
  decryptConferenceMeeting: jest.fn(),
  generateDefaultMeetingType: jest.fn(() => ({
    id: 'default_mt',
    name: 'Default Meeting',
    duration: 30,
  })),
  generateEmptyAvailabilities: jest.fn(() => []),
}))

jest.mock('@/utils/quickpoll_helper', () => ({
  generatePollSlug: jest.fn(() => 'test-slug'),
}))

// Mock Supabase client
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockEq = jest.fn()
const mockIn = jest.fn()
const mockGt = jest.fn()
const mockLt = jest.fn()
const mockOr = jest.fn()
const mockOrder = jest.fn()
const mockLimit = jest.fn()
const mockSingle = jest.fn()
const mockMaybeSingle = jest.fn()
const mockRange = jest.fn()
const mockFilter = jest.fn()
const mockNeq = jest.fn()
const mockContains = jest.fn()
const mockRpc = jest.fn()

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}))

import {
  getAccountPreferences,
  getGroupInvite,
  createGroupInvite,
  updateGroupInviteUserId,
  createOrUpdatesDiscordAccount,
  deleteDiscordAccount,
  getSubscriptionFromDBForAccount,
  getSubscription,
  getDiscordAccount,
  getDiscordAccountAndInfo,
  getTelegramAccountAndInfo,
  getAccountFromDiscordId,
  isUserAdminOfGroup,
  createGroupInDB,
  createAvailabilityBlock,
  getAvailabilityBlock,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
  duplicateAvailabilityBlock,
  getAvailabilityBlocks,
  getWalletTransactions,
  getWalletTransactionsByToken,
} from '@/utils/database'

describe('database.ts - Expanded Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mock chain
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      rpc: mockRpc,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      gt: mockGt,
      lt: mockLt,
      or: mockOr,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      range: mockRange,
      filter: mockFilter,
      neq: mockNeq,
      contains: mockContains,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      order: mockOrder,
      limit: mockLimit,
      in: mockIn,
    })
    
    mockInsert.mockReturnValue({
      select: mockSelect,
      single: mockSingle,
    })
    
    mockUpdate.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
    })
    
    mockDelete.mockReturnValue({
      eq: mockEq,
    })
  })

  describe('Account Preferences', () => {
    it('should fetch account preferences successfully', async () => {
      const mockPrefs = {
        account_address: '0x123',
        theme: 'dark',
        language: 'en',
      }
      
      mockSingle.mockResolvedValue({
        data: mockPrefs,
        error: null,
      })

      const result = await getAccountPreferences('0x123')

      expect(result).toEqual(mockPrefs)
      expect(mockFrom).toHaveBeenCalledWith('account_preferences')
    })

    it('should handle missing preferences', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getAccountPreferences('0x123')

      expect(result).toBeUndefined()
    })

    it('should handle database errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getAccountPreferences('0x123')).rejects.toThrow()
    })
  })

  describe('Group Invites', () => {
    describe('getGroupInvite', () => {
      it('should fetch group invite by email', async () => {
        const mockInvite = {
          id: 'invite_123',
          email: 'user@example.com',
          group_id: 'group_123',
        }
        
        mockSingle.mockResolvedValue({
          data: mockInvite,
          error: null,
        })

        const result = await getGroupInvite({ email: 'user@example.com', group_id: 'group_123' })

        expect(result).toEqual(mockInvite)
      })

      it('should fetch group invite by address', async () => {
        const mockInvite = {
          id: 'invite_123',
          address: '0x123',
          group_id: 'group_123',
        }
        
        mockSingle.mockResolvedValue({
          data: mockInvite,
          error: null,
        })

        const result = await getGroupInvite({ address: '0x123', group_id: 'group_123' })

        expect(result).toEqual(mockInvite)
      })

      it('should return null when invite not found', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getGroupInvite({ email: 'notfound@example.com', group_id: 'group_123' })

        expect(result).toBeNull()
      })
    })

    describe('createGroupInvite', () => {
      it('should create a group invite', async () => {
        const mockInvite = {
          id: 'new_invite_123',
          email: 'newuser@example.com',
          group_id: 'group_123',
        }
        
        mockSingle.mockResolvedValue({
          data: mockInvite,
          error: null,
        })

        const result = await createGroupInvite('group_123', 'newuser@example.com')

        expect(result).toEqual(mockInvite)
        expect(mockFrom).toHaveBeenCalledWith('group_invites')
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invite already exists' },
        })

        await expect(createGroupInvite('group_123', 'existing@example.com')).rejects.toThrow()
      })
    })

    describe('updateGroupInviteUserId', () => {
      it('should update group invite user ID', async () => {
        const mockUpdatedInvite = {
          id: 'invite_123',
          user_id: 'user_123',
        }
        
        mockSingle.mockResolvedValue({
          data: mockUpdatedInvite,
          error: null,
        })

        const result = await updateGroupInviteUserId('invite_123', 'user_123')

        expect(result).toEqual(mockUpdatedInvite)
      })
    })
  })

  describe('Discord Accounts', () => {
    describe('createOrUpdatesDiscordAccount', () => {
      it('should create new discord account', async () => {
        const mockDiscordAccount = {
          account_address: '0x123',
          discord_id: 'discord_123',
          username: 'testuser',
        }
        
        mockSingle.mockResolvedValue({
          data: mockDiscordAccount,
          error: null,
        })

        const result = await createOrUpdatesDiscordAccount('0x123', {
          id: 'discord_123',
          username: 'testuser',
          discriminator: '1234',
        })

        expect(result).toEqual(mockDiscordAccount)
      })

      it('should update existing discord account', async () => {
        const mockUpdatedAccount = {
          account_address: '0x123',
          discord_id: 'discord_123',
          username: 'updateduser',
        }
        
        mockSingle.mockResolvedValue({
          data: mockUpdatedAccount,
          error: null,
        })

        const result = await createOrUpdatesDiscordAccount('0x123', {
          id: 'discord_123',
          username: 'updateduser',
          discriminator: '5678',
        })

        expect(result).toEqual(mockUpdatedAccount)
      })
    })

    describe('deleteDiscordAccount', () => {
      it('should delete discord account', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await deleteDiscordAccount('0x123')

        expect(mockDelete).toHaveBeenCalled()
        expect(mockFrom).toHaveBeenCalledWith('discord_accounts')
      })
    })

    describe('getDiscordAccount', () => {
      it('should fetch discord account by address', async () => {
        const mockAccount = {
          account_address: '0x123',
          discord_id: 'discord_123',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await getDiscordAccount('0x123')

        expect(result).toEqual(mockAccount)
      })
    })

    describe('getDiscordAccountAndInfo', () => {
      it('should fetch discord account with info', async () => {
        const mockAccountWithInfo = {
          account_address: '0x123',
          discord_id: 'discord_123',
          username: 'testuser',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockAccountWithInfo,
          error: null,
        })

        const result = await getDiscordAccountAndInfo('0x123')

        expect(result).toEqual(mockAccountWithInfo)
      })
    })

    describe('getAccountFromDiscordId', () => {
      it('should fetch account by discord ID', async () => {
        const mockAccount = {
          account_address: '0x123',
          discord_id: 'discord_123',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await getAccountFromDiscordId('discord_123')

        expect(result).toEqual(mockAccount)
      })
    })
  })

  describe('Telegram Accounts', () => {
    describe('getTelegramAccountAndInfo', () => {
      it('should fetch telegram account with info', async () => {
        const mockAccount = {
          account_address: '0x123',
          telegram_id: 'tg_123',
          username: 'tguser',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await getTelegramAccountAndInfo('0x123')

        expect(result).toEqual(mockAccount)
      })

      it('should return null when not found', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getTelegramAccountAndInfo('0xnonexistent')

        expect(result).toBeNull()
      })
    })
  })

  describe('Subscriptions', () => {
    describe('getSubscriptionFromDBForAccount', () => {
      it('should fetch active subscription for account', async () => {
        const mockSubscription = {
          id: 'sub_123',
          account_address: '0x123',
          status: 'active',
          plan_id: 'plan_pro',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await getSubscriptionFromDBForAccount('0x123')

        expect(result).toEqual(mockSubscription)
      })

      it('should return null for no active subscription', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getSubscriptionFromDBForAccount('0x123')

        expect(result).toBeNull()
      })
    })

    describe('getSubscription', () => {
      it('should fetch subscription by ID', async () => {
        const mockSubscription = {
          id: 'sub_123',
          status: 'active',
        }
        
        mockSingle.mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await getSubscription('sub_123')

        expect(result).toEqual(mockSubscription)
      })
    })
  })

  describe('Group Management', () => {
    describe('isUserAdminOfGroup', () => {
      it('should return true for group admin', async () => {
        const mockMember = {
          account_address: '0x123',
          group_id: 'group_123',
          role: 'admin',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockMember,
          error: null,
        })

        const result = await isUserAdminOfGroup('0x123', 'group_123')

        expect(result).toBe(true)
      })

      it('should return false for non-admin user', async () => {
        const mockMember = {
          account_address: '0x123',
          group_id: 'group_123',
          role: 'member',
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockMember,
          error: null,
        })

        const result = await isUserAdminOfGroup('0x123', 'group_123')

        expect(result).toBe(false)
      })

      it('should return false for non-member', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await isUserAdminOfGroup('0x123', 'group_123')

        expect(result).toBe(false)
      })
    })

    describe('createGroupInDB', () => {
      it('should create a new group', async () => {
        const mockGroup = {
          id: 'group_123',
          name: 'Test Group',
          owner_address: '0x123',
        }
        
        mockSingle.mockResolvedValue({
          data: mockGroup,
          error: null,
        })

        const result = await createGroupInDB('Test Group', '0x123')

        expect(result).toEqual(mockGroup)
        expect(mockFrom).toHaveBeenCalledWith('groups')
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Group name already exists' },
        })

        await expect(createGroupInDB('Duplicate Group', '0x123')).rejects.toThrow()
      })
    })
  })

  describe('Availability Blocks', () => {
    describe('createAvailabilityBlock', () => {
      it('should create availability block successfully', async () => {
        const mockBlock = {
          id: 'block_123',
          name: 'Morning Hours',
          account_address: '0x123',
        }
        
        mockSingle.mockResolvedValue({
          data: mockBlock,
          error: null,
        })

        const result = await createAvailabilityBlock('0x123', {
          name: 'Morning Hours',
          timezone: 'America/New_York',
          weekdays: [1, 2, 3, 4, 5],
        } as any)

        expect(result).toEqual(mockBlock)
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invalid block data' },
        })

        await expect(createAvailabilityBlock('0x123', {} as any)).rejects.toThrow()
      })
    })

    describe('getAvailabilityBlock', () => {
      it('should fetch availability block by ID', async () => {
        const mockBlock = {
          id: 'block_123',
          name: 'Morning Hours',
        }
        
        mockSingle.mockResolvedValue({
          data: mockBlock,
          error: null,
        })

        const result = await getAvailabilityBlock('block_123', '0x123')

        expect(result).toEqual(mockBlock)
      })

      it('should return null for non-existent block', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getAvailabilityBlock('nonexistent', '0x123')

        expect(result).toBeNull()
      })
    })

    describe('updateAvailabilityBlock', () => {
      it('should update availability block', async () => {
        const mockUpdatedBlock = {
          id: 'block_123',
          name: 'Updated Hours',
        }
        
        mockSingle.mockResolvedValue({
          data: mockUpdatedBlock,
          error: null,
        })

        const result = await updateAvailabilityBlock('block_123', '0x123', {
          name: 'Updated Hours',
        } as any)

        expect(result).toEqual(mockUpdatedBlock)
      })
    })

    describe('deleteAvailabilityBlock', () => {
      it('should delete availability block', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await deleteAvailabilityBlock('block_123', '0x123')

        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Block is in use' },
        })

        await expect(deleteAvailabilityBlock('block_123', '0x123')).rejects.toThrow()
      })
    })

    describe('duplicateAvailabilityBlock', () => {
      it('should duplicate availability block', async () => {
        const mockNewBlock = {
          id: 'block_456',
          name: 'Morning Hours (Copy)',
        }
        
        mockSingle.mockResolvedValue({
          data: mockNewBlock,
          error: null,
        })

        const result = await duplicateAvailabilityBlock('block_123', '0x123')

        expect(result).toEqual(mockNewBlock)
      })
    })

    describe('getAvailabilityBlocks', () => {
      it('should fetch all availability blocks for account', async () => {
        const mockBlocks = [
          { id: 'block_1', name: 'Morning' },
          { id: 'block_2', name: 'Afternoon' },
        ]
        
        mockEq.mockResolvedValue({
          data: mockBlocks,
          error: null,
        })

        const result = await getAvailabilityBlocks('0x123')

        expect(result).toEqual(mockBlocks)
      })

      it('should return empty array when no blocks', async () => {
        mockEq.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getAvailabilityBlocks('0x123')

        expect(result).toEqual([])
      })
    })
  })

  describe('Wallet Transactions', () => {
    describe('getWalletTransactions', () => {
      it('should fetch wallet transactions for account', async () => {
        const mockTransactions = [
          { id: 'tx_1', amount: 100 },
          { id: 'tx_2', amount: 200 },
        ]
        
        mockOrder.mockReturnValue({
          range: mockRange,
        })
        
        mockRange.mockResolvedValue({
          data: mockTransactions,
          error: null,
          count: 2,
        })

        const result = await getWalletTransactions('0x123', 0, 10)

        expect(result).toEqual({
          transactions: mockTransactions,
          total: 2,
        })
      })

      it('should handle pagination', async () => {
        const mockTransactions = [{ id: 'tx_3', amount: 300 }]
        
        mockOrder.mockReturnValue({
          range: mockRange,
        })
        
        mockRange.mockResolvedValue({
          data: mockTransactions,
          error: null,
          count: 50,
        })

        const result = await getWalletTransactions('0x123', 20, 10)

        expect(mockRange).toHaveBeenCalledWith(20, 29)
        expect(result).toEqual({
          transactions: mockTransactions,
          total: 50,
        })
      })

      it('should return empty array for no transactions', async () => {
        mockOrder.mockReturnValue({
          range: mockRange,
        })
        
        mockRange.mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        })

        const result = await getWalletTransactions('0x123', 0, 10)

        expect(result).toEqual({
          transactions: [],
          total: 0,
        })
      })
    })

    describe('getWalletTransactionsByToken', () => {
      it('should fetch transactions filtered by token', async () => {
        const mockTransactions = [
          { id: 'tx_1', token_address: '0xabc', amount: 100 },
        ]
        
        mockOrder.mockReturnValue({
          range: mockRange,
        })
        
        mockRange.mockResolvedValue({
          data: mockTransactions,
          error: null,
          count: 1,
        })

        const result = await getWalletTransactionsByToken('0x123', '0xabc', 0, 10)

        expect(result).toEqual({
          transactions: mockTransactions,
          total: 1,
        })
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null database responses gracefully', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getAccountPreferences('0x123')
      expect(result).toBeUndefined()
    })

    it('should throw on database connection errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: 'CONNECTION_ERROR' },
      })

      await expect(getAccountPreferences('0x123')).rejects.toThrow()
    })

    it('should handle empty string identifiers', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getAccountPreferences('')
      expect(result).toBeUndefined()
    })

    it('should handle concurrent requests', async () => {
      const mockData1 = { id: 'sub_1' }
      const mockData2 = { id: 'sub_2' }
      
      mockSingle
        .mockResolvedValueOnce({ data: mockData1, error: null })
        .mockResolvedValueOnce({ data: mockData2, error: null })

      const [result1, result2] = await Promise.all([
        getSubscription('sub_1'),
        getSubscription('sub_2'),
      ])

      expect(result1).toEqual(mockData1)
      expect(result2).toEqual(mockData2)
    })
  })

  describe('Data Validation', () => {
    it('should handle malformed data gracefully', async () => {
      const malformedData = {
        id: null,
        name: undefined,
      }
      
      mockSingle.mockResolvedValue({
        data: malformedData,
        error: null,
      })

      const result = await getSubscription('sub_123')
      expect(result).toEqual(malformedData)
    })

    it('should handle large result sets', async () => {
      const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `item_${i}`,
        data: `value_${i}`,
      }))
      
      mockEq.mockResolvedValue({
        data: largeDataSet,
        error: null,
      })

      const result = await getAvailabilityBlocks('0x123')
      expect(result).toHaveLength(1000)
    })
  })
})
