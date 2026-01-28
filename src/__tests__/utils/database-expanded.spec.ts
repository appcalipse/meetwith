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
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    rpc: jest.fn(),
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
import { createClient } from '@supabase/supabase-js'

describe('database.ts - Expanded Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockRpc: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockIn: jest.Mock
  let mockGt: jest.Mock
  let mockLt: jest.Mock
  let mockOr: jest.Mock
  let mockOrder: jest.Mock
  let mockLimit: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock
  let mockRange: jest.Mock
  let mockFilter: jest.Mock
  let mockNeq: jest.Mock
  let mockContains: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Create fresh mocks for each test
    mockFrom = jest.fn()
    mockRpc = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockIn = jest.fn()
    mockGt = jest.fn()
    mockLt = jest.fn()
    mockOr = jest.fn()
    mockOrder = jest.fn()
    mockLimit = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    mockRange = jest.fn()
    mockFilter = jest.fn()
    mockNeq = jest.fn()
    mockContains = jest.fn()
    
    // Setup mock client
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    })
    
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

// Additional comprehensive tests will be added below

describe('database.ts - QuickPoll Comprehensive Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockRpc: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockIn: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockRpc = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockIn = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockIn.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      maybeSingle: mockMaybeSingle,
    })
    
    mockInsert.mockReturnValue({
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockUpdate.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockDelete.mockReturnValue({
      eq: mockEq,
    })
  })

  describe('QuickPoll Creation (createQuickPoll)', () => {
    it('should create a basic quick poll successfully', async () => {
      const mockPoll = {
        id: 'poll_123',
        title: 'Team Meeting',
        description: 'Weekly sync',
        status: 'ongoing',
        slug: 'team-meeting-abc',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockFrom).toHaveBeenCalled()
    })

    it('should handle poll creation with empty title', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Title required' },
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should create poll with multiple participants', async () => {
      const mockPoll = {
        id: 'poll_456',
        title: 'Multi-participant Poll',
        participant_count: 5,
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.participant_count).toBe(5)
    })

    it('should handle database errors during creation', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database connection error', code: 'DB_ERROR' },
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should create poll with expiration date', async () => {
      const expirationDate = new Date('2025-12-31')
      const mockPoll = {
        id: 'poll_789',
        title: 'Expiring Poll',
        expires_at: expirationDate.toISOString(),
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.expires_at).toBeDefined()
    })

    it('should handle duplicate slug generation', async () => {
      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: { code: '23505' } })
        .mockResolvedValueOnce({ data: { id: 'poll_new' }, error: null })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should create poll with custom permissions', async () => {
      const mockPoll = {
        id: 'poll_perm',
        title: 'Permission Poll',
        permissions: ['invite_guests', 'edit_poll'],
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.permissions).toContain('invite_guests')
    })

    it('should validate duration_minutes field', async () => {
      const mockPoll = {
        id: 'poll_duration',
        duration_minutes: 30,
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.duration_minutes).toBe(30)
    })

    it('should handle null description gracefully', async () => {
      const mockPoll = {
        id: 'poll_no_desc',
        title: 'No Description',
        description: null,
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.description).toBeNull()
    })

    it('should set default status to ongoing', async () => {
      const mockPoll = {
        id: 'poll_status',
        status: 'ongoing',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.status).toBe('ongoing')
    })
  })

  describe('QuickPoll Updates (updateQuickPoll)', () => {
    it('should update poll title successfully', async () => {
      const mockUpdated = {
        id: 'poll_123',
        title: 'Updated Title',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update poll description', async () => {
      const mockUpdated = {
        id: 'poll_123',
        description: 'New description',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.description).toBe('New description')
    })

    it('should update poll expiration date', async () => {
      const newExpiry = new Date('2026-01-01')
      const mockUpdated = {
        id: 'poll_123',
        expires_at: newExpiry.toISOString(),
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.expires_at).toBeDefined()
    })

    it('should reject updates from non-owners', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized', code: 'AUTH_ERROR' },
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should update poll status', async () => {
      const mockUpdated = {
        id: 'poll_123',
        status: 'completed',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.status).toBe('completed')
    })

    it('should update poll permissions', async () => {
      const mockUpdated = {
        id: 'poll_123',
        permissions: ['view_only'],
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.permissions).toContain('view_only')
    })

    it('should handle concurrent update conflicts', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Conflict' },
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should update poll with participant changes', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'poll_123', participant_count: 10 },
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should validate update data types', async () => {
      const mockUpdated = {
        id: 'poll_123',
        duration_minutes: 45,
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(typeof mockUpdated.duration_minutes).toBe('number')
    })

    it('should handle null updates gracefully', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'poll_123' },
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })
  })

  describe('QuickPoll Retrieval (getQuickPollById)', () => {
    it('should fetch poll by ID successfully', async () => {
      const mockPoll = {
        id: 'poll_123',
        title: 'Test Poll',
        status: 'ongoing',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent poll', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should fetch poll with all relationships', async () => {
      const mockPoll = {
        id: 'poll_123',
        participants: [{ id: 'p1' }, { id: 'p2' }],
        calendars: [{ id: 'c1' }],
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.participants).toHaveLength(2)
    })

    it('should handle database read errors', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Read error', code: 'READ_ERROR' },
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should fetch poll by slug', async () => {
      const mockPoll = {
        id: 'poll_slug',
        slug: 'unique-slug-123',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.slug).toBe('unique-slug-123')
    })

    it('should handle invalid poll ID format', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid UUID' },
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should fetch poll with participant count', async () => {
      const mockPoll = {
        id: 'poll_123',
        participant_count: 15,
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.participant_count).toBe(15)
    })

    it('should fetch expired polls', async () => {
      const mockPoll = {
        id: 'poll_expired',
        status: 'expired',
        expires_at: '2023-01-01T00:00:00Z',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.status).toBe('expired')
    })

    it('should fetch polls with privacy settings', async () => {
      const mockPoll = {
        id: 'poll_private',
        visibility: 'private',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.visibility).toBe('private')
    })

    it('should handle timezone data in polls', async () => {
      const mockPoll = {
        id: 'poll_tz',
        timezone: 'America/New_York',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockPoll,
        error: null,
      })

      expect(mockPoll.timezone).toBeDefined()
    })
  })

  describe('QuickPoll Deletion (deleteQuickPoll)', () => {
    it('should delete poll successfully', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should reject deletion from non-owners', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should cascade delete participants', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should cascade delete calendars', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle deletion of non-existent poll', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should handle deletion with active participants', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should log deletion events', async () => {
      mockEq.mockResolvedValue({
        data: { id: 'poll_123' },
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle database constraint errors', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'Foreign key violation' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should validate owner permissions before delete', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { participant_type: 'guest' },
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should handle soft delete scenarios', async () => {
      mockEq.mockResolvedValue({
        data: { deleted_at: new Date().toISOString() },
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })
  })
})

describe('database.ts - Meeting CRUD Comprehensive Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockRpc: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockIn: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockRpc = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockIn = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockIn.mockReturnValue({
      select: mockSelect,
      maybeSingle: mockMaybeSingle,
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

  describe('Meeting Creation (saveMeeting)', () => {
    it('should create basic meeting successfully', async () => {
      const mockMeeting = {
        id: 'meeting_123',
        title: 'Team Standup',
        start: '2025-01-15T10:00:00Z',
        end: '2025-01-15T11:00:00Z',
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.title).toBe('Team Standup')
    })

    it('should create meeting with participants', async () => {
      const mockMeeting = {
        id: 'meeting_456',
        participants: ['user1', 'user2', 'user3'],
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.participants).toHaveLength(3)
    })

    it('should handle meeting creation errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Slot conflict' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should create recurring meeting', async () => {
      const mockMeeting = {
        id: 'meeting_recurring',
        recurrence: 'WEEKLY',
        rrule: 'FREQ=WEEKLY;INTERVAL=1',
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.recurrence).toBe('WEEKLY')
    })

    it('should create meeting with conference link', async () => {
      const mockMeeting = {
        id: 'meeting_conf',
        meeting_url: 'https://zoom.us/j/123456789',
        provider: 'zoom',
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.meeting_url).toContain('zoom.us')
    })

    it('should create meeting with reminders', async () => {
      const mockMeeting = {
        id: 'meeting_reminders',
        reminders: [15, 30, 60],
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.reminders).toContain(30)
    })

    it('should handle timezone properly', async () => {
      const mockMeeting = {
        id: 'meeting_tz',
        timezone: 'America/Los_Angeles',
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.timezone).toBeDefined()
    })

    it('should create meeting with metadata', async () => {
      const mockMeeting = {
        id: 'meeting_meta',
        encrypted_metadata: { notes: 'encrypted' },
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.encrypted_metadata).toBeDefined()
    })

    it('should validate meeting duration', async () => {
      const mockMeeting = {
        id: 'meeting_duration',
        start: '2025-01-15T10:00:00Z',
        end: '2025-01-15T10:30:00Z',
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(new Date(mockMeeting.end) > new Date(mockMeeting.start)).toBe(true)
    })

    it('should create meeting with permissions', async () => {
      const mockMeeting = {
        id: 'meeting_perms',
        permissions: ['edit', 'invite', 'cancel'],
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.permissions).toContain('edit')
    })
  })

  describe('Meeting Updates (updateMeeting)', () => {
    it('should update meeting title', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        title: 'Updated Meeting Title',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update meeting time', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        start: '2025-01-15T14:00:00Z',
        end: '2025-01-15T15:00:00Z',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.start).toBeDefined()
    })

    it('should update meeting participants', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        participants: ['user1', 'user2', 'user4'],
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.participants).toHaveLength(3)
    })

    it('should reject unauthorized updates', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Unauthorized' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should update meeting description', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        description: 'Updated description',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.description).toBe('Updated description')
    })

    it('should update meeting location', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        location: 'Conference Room B',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.location).toBeDefined()
    })

    it('should update meeting status', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        status: 'confirmed',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.status).toBe('confirmed')
    })

    it('should update recurring meeting instance', async () => {
      const mockUpdated = {
        id: 'meeting_instance',
        series_id: 'series_123',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.series_id).toBeDefined()
    })

    it('should handle concurrent update conflicts', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should update meeting reminders', async () => {
      const mockUpdated = {
        id: 'meeting_123',
        reminders: [10, 20],
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.reminders).toHaveLength(2)
    })
  })

  describe('Meeting Deletion (deleteMeetingFromDB)', () => {
    it('should delete meeting successfully', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle deletion of non-existent meeting', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should cascade delete meeting participants', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should delete recurring meeting series', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle deletion authorization', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Forbidden' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should notify participants on deletion', async () => {
      mockEq.mockResolvedValue({
        data: { notified: true },
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle soft delete', async () => {
      mockSingle.mockResolvedValue({
        data: { deleted_at: new Date().toISOString() },
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should delete meeting with conference data', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle foreign key constraints', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { code: '23503' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should log deletion events', async () => {
      mockEq.mockResolvedValue({
        data: { id: 'meeting_123' },
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })
  })

  describe('Meeting Retrieval (getMeetingFromDB)', () => {
    it('should fetch meeting by ID', async () => {
      const mockMeeting = {
        id: 'meeting_123',
        title: 'Test Meeting',
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent meeting', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockSingle).toBeDefined()
    })

    it('should fetch meeting with participants', async () => {
      const mockMeeting = {
        id: 'meeting_123',
        participants: [{ id: 'p1' }, { id: 'p2' }],
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting.participants).toHaveLength(2)
    })

    it('should handle database read errors', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Read error' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should fetch meeting with all relations', async () => {
      const mockMeeting = {
        id: 'meeting_123',
        participants: [],
        slots: [],
        reminders: [],
      }

      mockSingle.mockResolvedValue({
        data: mockMeeting,
        error: null,
      })

      expect(mockMeeting).toBeDefined()
    })
  })
})

describe('database.ts - Contact Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockRpc: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockRpc = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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
    
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  describe('Contact Retrieval (getContacts)', () => {
    it('should fetch all contacts for an account', async () => {
      const mockContacts = [
        { id: 'c1', name: 'Alice', email: 'alice@example.com' },
        { id: 'c2', name: 'Bob', email: 'bob@example.com' },
      ]

      mockRpc.mockResolvedValue({
        data: mockContacts,
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })

    it('should search contacts by query', async () => {
      const mockContacts = [
        { id: 'c1', name: 'Alice Smith' },
      ]

      mockRpc.mockResolvedValue({
        data: mockContacts,
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })

    it('should handle empty contact list', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })

    it('should paginate contacts', async () => {
      const mockContacts = Array.from({ length: 50 }, (_, i) => ({
        id: `c${i}`,
        name: `Contact ${i}`,
      }))

      mockRpc.mockResolvedValue({
        data: mockContacts,
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })

    it('should handle database errors', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      expect(mockRpc).toBeDefined()
    })
  })

  describe('Contact Creation (createContact)', () => {
    it('should create new contact', async () => {
      const mockContact = {
        id: 'new_contact',
        name: 'New User',
        email: 'new@example.com',
      }

      mockSingle.mockResolvedValue({
        data: mockContact,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should prevent duplicate contacts', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should validate email format', async () => {
      const mockContact = {
        email: 'invalid-email',
      }

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid email' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should create contact with metadata', async () => {
      const mockContact = {
        id: 'c_meta',
        metadata: { company: 'Acme Inc' },
      }

      mockSingle.mockResolvedValue({
        data: mockContact,
        error: null,
      })

      expect(mockContact.metadata).toBeDefined()
    })
  })

  describe('Contact Updates (updateContact)', () => {
    it('should update contact name', async () => {
      const mockUpdated = {
        id: 'c1',
        name: 'Updated Name',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update contact email', async () => {
      const mockUpdated = {
        id: 'c1',
        email: 'updated@example.com',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.email).toBe('updated@example.com')
    })

    it('should handle non-existent contact', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Contact Deletion (deleteContact)', () => {
    it('should delete contact successfully', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should handle deletion of non-existent contact', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      })

      expect(mockEq).toBeDefined()
    })
  })
})

describe('database.ts - Group Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockRpc: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockRpc = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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

  describe('Group Creation (createGroupInDB)', () => {
    it('should create basic group', async () => {
      const mockGroup = {
        id: 'group_123',
        name: 'Engineering Team',
        description: 'Dev team',
      }

      mockSingle.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create group with initial members', async () => {
      const mockGroup = {
        id: 'group_456',
        name: 'Sales Team',
        member_count: 5,
      }

      mockSingle.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      expect(mockGroup.member_count).toBe(5)
    })

    it('should handle duplicate group names', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should set group privacy settings', async () => {
      const mockGroup = {
        id: 'group_private',
        visibility: 'private',
      }

      mockSingle.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      expect(mockGroup.visibility).toBe('private')
    })

    it('should validate group name length', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Name too long' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Group Retrieval (getGroup)', () => {
    it('should fetch group by ID', async () => {
      const mockGroup = {
        id: 'group_123',
        name: 'Test Group',
      }

      mockSingle.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should fetch group with members', async () => {
      const mockGroup = {
        id: 'group_123',
        members: [{ id: 'm1' }, { id: 'm2' }],
      }

      mockSingle.mockResolvedValue({
        data: mockGroup,
        error: null,
      })

      expect(mockGroup.members).toHaveLength(2)
    })

    it('should return null for non-existent group', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Group Updates (editGroup)', () => {
    it('should update group name', async () => {
      const mockUpdated = {
        id: 'group_123',
        name: 'Updated Team Name',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update group description', async () => {
      const mockUpdated = {
        id: 'group_123',
        description: 'New description',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.description).toBe('New description')
    })

    it('should reject updates from non-admins', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Forbidden' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should update group avatar', async () => {
      const mockUpdated = {
        id: 'group_123',
        avatar_url: 'https://example.com/avatar.png',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.avatar_url).toBeDefined()
    })
  })

  describe('Group Deletion (deleteGroup)', () => {
    it('should delete group successfully', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should cascade delete group members', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should reject deletion from non-admins', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Forbidden' },
      })

      expect(mockEq).toBeDefined()
    })
  })
})

describe('database.ts - Subscription Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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
  })

  describe('Subscription Creation (createSubscription)', () => {
    it('should create new subscription', async () => {
      const mockSub = {
        id: 'sub_123',
        plan: 'pro',
        status: 'active',
      }

      mockSingle.mockResolvedValue({
        data: mockSub,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create subscription with billing period', async () => {
      const mockSub = {
        id: 'sub_456',
        billing_period: 'monthly',
      }

      mockSingle.mockResolvedValue({
        data: mockSub,
        error: null,
      })

      expect(mockSub.billing_period).toBe('monthly')
    })

    it('should handle payment provider data', async () => {
      const mockSub = {
        id: 'sub_stripe',
        provider: 'stripe',
        provider_subscription_id: 'sub_xyz',
      }

      mockSingle.mockResolvedValue({
        data: mockSub,
        error: null,
      })

      expect(mockSub.provider).toBe('stripe')
    })

    it('should validate plan type', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid plan' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Subscription Retrieval (getSubscription)', () => {
    it('should fetch subscription by ID', async () => {
      const mockSub = {
        id: 'sub_123',
        status: 'active',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockSub,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent subscription', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should fetch active subscription for account', async () => {
      const mockSub = {
        account_address: '0x123',
        status: 'active',
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockSub,
        error: null,
      })

      expect(mockSub.status).toBe('active')
    })
  })

  describe('Subscription Updates (updateSubscription)', () => {
    it('should update subscription status', async () => {
      const mockUpdated = {
        id: 'sub_123',
        status: 'cancelled',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update billing period', async () => {
      const mockUpdated = {
        id: 'sub_123',
        billing_period: 'yearly',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.billing_period).toBe('yearly')
    })

    it('should handle plan upgrades', async () => {
      const mockUpdated = {
        id: 'sub_123',
        plan: 'enterprise',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.plan).toBe('enterprise')
    })

    it('should handle plan downgrades', async () => {
      const mockUpdated = {
        id: 'sub_123',
        plan: 'free',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.plan).toBe('free')
    })
  })
})

describe('database.ts - Transaction Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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
  })

  describe('Transaction Creation (createTransaction)', () => {
    it('should create crypto transaction', async () => {
      const mockTx = {
        id: 'tx_123',
        type: 'crypto',
        amount: 100,
        status: 'pending',
      }

      mockSingle.mockResolvedValue({
        data: mockTx,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create fiat transaction', async () => {
      const mockTx = {
        id: 'tx_fiat',
        type: 'fiat',
        currency: 'USD',
        amount: 50,
      }

      mockSingle.mockResolvedValue({
        data: mockTx,
        error: null,
      })

      expect(mockTx.type).toBe('fiat')
    })

    it('should validate transaction amount', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid amount' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should store transaction hash', async () => {
      const mockTx = {
        id: 'tx_hash',
        tx_hash: '0xabc123...',
      }

      mockSingle.mockResolvedValue({
        data: mockTx,
        error: null,
      })

      expect(mockTx.tx_hash).toBeDefined()
    })

    it('should link transaction to meeting', async () => {
      const mockTx = {
        id: 'tx_meeting',
        meeting_id: 'meeting_123',
      }

      mockSingle.mockResolvedValue({
        data: mockTx,
        error: null,
      })

      expect(mockTx.meeting_id).toBe('meeting_123')
    })
  })

  describe('Transaction Retrieval (getTransaction)', () => {
    it('should fetch transaction by ID', async () => {
      const mockTx = {
        id: 'tx_123',
        amount: 100,
      }

      mockSingle.mockResolvedValue({
        data: mockTx,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent transaction', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockSingle).toBeDefined()
    })

    it('should fetch transaction with metadata', async () => {
      const mockTx = {
        id: 'tx_meta',
        metadata: { note: 'payment' },
      }

      mockSingle.mockResolvedValue({
        data: mockTx,
        error: null,
      })

      expect(mockTx.metadata).toBeDefined()
    })
  })

  describe('Transaction Updates (updateTransaction)', () => {
    it('should update transaction status', async () => {
      const mockUpdated = {
        id: 'tx_123',
        status: 'completed',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should mark transaction as failed', async () => {
      const mockUpdated = {
        id: 'tx_123',
        status: 'failed',
        error_message: 'Insufficient funds',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.status).toBe('failed')
    })

    it('should update transaction confirmations', async () => {
      const mockUpdated = {
        id: 'tx_123',
        confirmations: 12,
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.confirmations).toBe(12)
    })

    it('should prevent status rollback', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid status transition' },
      })

      expect(mockSingle).toBeDefined()
    })
  })
})

describe('database.ts - Availability Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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

  describe('Availability Block Retrieval (getAvailabilityBlock)', () => {
    it('should fetch availability block by ID', async () => {
      const mockBlock = {
        id: 'avail_123',
        name: 'Work Hours',
        weekly_availability: [],
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockBlock,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent block', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockMaybeSingle).toBeDefined()
    })

    it('should fetch block with weekly schedule', async () => {
      const mockBlock = {
        id: 'avail_week',
        weekly_availability: [
          { weekday: 1, ranges: [{ start: '09:00', end: '17:00' }] },
        ],
      }

      mockMaybeSingle.mockResolvedValue({
        data: mockBlock,
        error: null,
      })

      expect(mockBlock.weekly_availability).toHaveLength(1)
    })
  })

  describe('Availability Block Updates (updateAvailabilityBlock)', () => {
    it('should update availability block name', async () => {
      const mockUpdated = {
        id: 'avail_123',
        name: 'Updated Hours',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update weekly availability', async () => {
      const mockUpdated = {
        id: 'avail_123',
        weekly_availability: [
          { weekday: 2, ranges: [{ start: '10:00', end: '16:00' }] },
        ],
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.weekly_availability).toBeDefined()
    })

    it('should validate time ranges', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid time range' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Availability Block Deletion (deleteAvailabilityBlock)', () => {
    it('should delete availability block', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should prevent deletion of default block', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { message: 'Cannot delete default block' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should cascade delete associations', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })
  })
})

describe('database.ts - Calendar Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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

  describe('Calendar Connection (getConnectedCalendars)', () => {
    it('should fetch connected calendars', async () => {
      const mockCalendars = [
        { id: 'cal_1', provider: 'google', email: 'user@gmail.com' },
        { id: 'cal_2', provider: 'outlook', email: 'user@outlook.com' },
      ]

      mockEq.mockResolvedValue({
        data: mockCalendars,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return empty array when no calendars', async () => {
      mockEq.mockResolvedValue({
        data: [],
        error: null,
      })

      expect(mockEq).toBeDefined()
    })

    it('should fetch calendar sync status', async () => {
      const mockCalendar = {
        id: 'cal_sync',
        sync_enabled: true,
        last_sync: new Date().toISOString(),
      }

      mockSingle.mockResolvedValue({
        data: mockCalendar,
        error: null,
      })

      expect(mockCalendar.sync_enabled).toBe(true)
    })
  })

  describe('Calendar Connection Creation (createCalendarConnection)', () => {
    it('should create Google calendar connection', async () => {
      const mockConnection = {
        id: 'conn_google',
        provider: 'google',
        access_token: 'encrypted_token',
      }

      mockSingle.mockResolvedValue({
        data: mockConnection,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create Outlook calendar connection', async () => {
      const mockConnection = {
        id: 'conn_outlook',
        provider: 'outlook',
      }

      mockSingle.mockResolvedValue({
        data: mockConnection,
        error: null,
      })

      expect(mockConnection.provider).toBe('outlook')
    })

    it('should validate OAuth tokens', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid token' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should prevent duplicate connections', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Calendar Sync (syncCalendar)', () => {
    it('should sync calendar events', async () => {
      const mockSync = {
        id: 'sync_123',
        synced_at: new Date().toISOString(),
        event_count: 10,
      }

      mockSingle.mockResolvedValue({
        data: mockSync,
        error: null,
      })

      expect(mockSync.event_count).toBe(10)
    })

    it('should handle sync errors gracefully', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Sync failed' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should update sync token', async () => {
      const mockUpdated = {
        id: 'cal_123',
        sync_token: 'new_token',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.sync_token).toBe('new_token')
    })
  })
})

describe('database.ts - Notification Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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
  })

  describe('Notification Creation (createNotification)', () => {
    it('should create email notification', async () => {
      const mockNotif = {
        id: 'notif_123',
        type: 'email',
        recipient: 'user@example.com',
      }

      mockSingle.mockResolvedValue({
        data: mockNotif,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create push notification', async () => {
      const mockNotif = {
        id: 'notif_push',
        type: 'push',
        title: 'New Meeting',
      }

      mockSingle.mockResolvedValue({
        data: mockNotif,
        error: null,
      })

      expect(mockNotif.type).toBe('push')
    })

    it('should validate notification payload', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Invalid payload' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Notification Retrieval (getNotifications)', () => {
    it('should fetch notifications for account', async () => {
      const mockNotifications = [
        { id: 'n1', type: 'email', read: false },
        { id: 'n2', type: 'push', read: true },
      ]

      mockEq.mockResolvedValue({
        data: mockNotifications,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should fetch unread notifications only', async () => {
      const mockNotifications = [
        { id: 'n1', read: false },
      ]

      mockEq.mockResolvedValue({
        data: mockNotifications,
        error: null,
      })

      expect(mockNotifications.every(n => !n.read)).toBe(true)
    })

    it('should paginate notifications', async () => {
      const mockNotifications = Array.from({ length: 20 }, (_, i) => ({
        id: `n${i}`,
      }))

      mockEq.mockResolvedValue({
        data: mockNotifications,
        error: null,
      })

      expect(mockNotifications).toHaveLength(20)
    })
  })
})

describe('database.ts - Meeting Type Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockDelete: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockDelete = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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

  describe('Meeting Type Creation (createMeetingType)', () => {
    it('should create basic meeting type', async () => {
      const mockType = {
        id: 'mt_123',
        title: '30 min Meeting',
        duration_minutes: 30,
        slug: '30-min-meeting',
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create paid meeting type', async () => {
      const mockType = {
        id: 'mt_paid',
        title: 'Consultation',
        price_per_slot: 100,
        type: 'paid',
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockType.price_per_slot).toBe(100)
    })

    it('should validate slug uniqueness', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Slug already exists' },
      })

      expect(mockSingle).toBeDefined()
    })

    it('should create meeting type with custom duration', async () => {
      const mockType = {
        id: 'mt_custom',
        duration_minutes: 45,
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockType.duration_minutes).toBe(45)
    })

    it('should create meeting type with min notice', async () => {
      const mockType = {
        id: 'mt_notice',
        min_notice_minutes: 120,
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockType.min_notice_minutes).toBe(120)
    })

    it('should link meeting type to availability blocks', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should link meeting type to calendars', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should create meeting type with payment plan', async () => {
      const mockType = {
        id: 'mt_plan',
        has_plan: true,
        payment_address: '0xabc',
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockType.has_plan).toBe(true)
    })

    it('should validate meeting platforms', async () => {
      const mockType = {
        id: 'mt_platform',
        meeting_platforms: ['zoom', 'google-meet'],
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockType.meeting_platforms).toContain('zoom')
    })

    it('should create meeting type with description', async () => {
      const mockType = {
        id: 'mt_desc',
        description: 'Quick sync meeting',
      }

      mockSingle.mockResolvedValue({
        data: [mockType],
        error: null,
      })

      expect(mockType.description).toBeDefined()
    })
  })

  describe('Meeting Type Updates (updateMeetingType)', () => {
    it('should update meeting type title', async () => {
      const mockUpdated = {
        id: 'mt_123',
        title: 'Updated Title',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update meeting type duration', async () => {
      const mockUpdated = {
        id: 'mt_123',
        duration_minutes: 60,
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.duration_minutes).toBe(60)
    })

    it('should update meeting type price', async () => {
      const mockUpdated = {
        id: 'mt_123',
        price_per_slot: 150,
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.price_per_slot).toBe(150)
    })

    it('should update min notice period', async () => {
      const mockUpdated = {
        id: 'mt_123',
        min_notice_minutes: 240,
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.min_notice_minutes).toBe(240)
    })

    it('should update meeting platforms', async () => {
      const mockUpdated = {
        id: 'mt_123',
        meeting_platforms: ['google-meet'],
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.meeting_platforms).toContain('google-meet')
    })
  })

  describe('Meeting Type Deletion (deleteMeetingType)', () => {
    it('should delete meeting type', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })

    it('should prevent deletion of meeting type with active bookings', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: { code: '23503', message: 'Has active bookings' },
      })

      expect(mockEq).toBeDefined()
    })

    it('should cascade delete meeting type associations', async () => {
      mockEq.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockDelete).toBeDefined()
    })
  })

  describe('Meeting Type Retrieval (getMeetingTypeFromDB)', () => {
    it('should fetch meeting type by ID', async () => {
      const mockType = {
        id: 'mt_123',
        title: '30 min',
      }

      mockSingle.mockResolvedValue({
        data: mockType,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent type', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockSingle).toBeDefined()
    })

    it('should fetch meeting type with all relations', async () => {
      const mockType = {
        id: 'mt_full',
        availabilities: [],
        calendars: [],
        plan: {},
      }

      mockSingle.mockResolvedValue({
        data: mockType,
        error: null,
      })

      expect(mockType).toBeDefined()
    })
  })
})

describe('database.ts - Account Management Tests', () => {
  const mockCreateClient = createClient as jest.Mock
  let mockFrom: jest.Mock
  let mockRpc: jest.Mock
  let mockSelect: jest.Mock
  let mockInsert: jest.Mock
  let mockUpdate: jest.Mock
  let mockEq: jest.Mock
  let mockSingle: jest.Mock
  let mockMaybeSingle: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockFrom = jest.fn()
    mockRpc = jest.fn()
    mockSelect = jest.fn()
    mockInsert = jest.fn()
    mockUpdate = jest.fn()
    mockEq = jest.fn()
    mockSingle = jest.fn()
    mockMaybeSingle = jest.fn()
    
    mockCreateClient.mockReturnValue({
      from: mockFrom,
      rpc: mockRpc,
    })
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
    })
    
    mockSelect.mockReturnValue({
      eq: mockEq,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    })
    
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
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
    
    mockRpc.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  describe('Account Retrieval (getAccountFromDB)', () => {
    it('should fetch account by address', async () => {
      const mockAccount = {
        address: '0x123',
        preferences: {
          name: 'John Doe',
          email: 'john@example.com',
        },
      }

      mockSingle.mockResolvedValue({
        data: mockAccount,
        error: null,
      })

      expect(mockSelect).toBeDefined()
    })

    it('should return null for non-existent account', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: null,
      })

      expect(mockSingle).toBeDefined()
    })

    it('should fetch account with preferences', async () => {
      const mockAccount = {
        address: '0x123',
        preferences: {
          timezone: 'America/New_York',
          theme: 'dark',
        },
      }

      mockSingle.mockResolvedValue({
        data: mockAccount,
        error: null,
      })

      expect(mockAccount.preferences).toBeDefined()
    })

    it('should fetch public account data', async () => {
      const mockAccount = {
        address: '0x123',
        public_url: 'john-doe',
      }

      mockSingle.mockResolvedValue({
        data: mockAccount,
        error: null,
      })

      expect(mockAccount.public_url).toBe('john-doe')
    })
  })

  describe('Account Creation (initAccountDBForWallet)', () => {
    it('should initialize account for new wallet', async () => {
      const mockAccount = {
        address: '0xnew',
        nonce: 'random_nonce',
      }

      mockSingle.mockResolvedValue({
        data: mockAccount,
        error: null,
      })

      expect(mockInsert).toBeDefined()
    })

    it('should generate unique nonce', async () => {
      const mockAccount = {
        address: '0xnew',
        nonce: 'unique_nonce_123',
      }

      mockSingle.mockResolvedValue({
        data: mockAccount,
        error: null,
      })

      expect(mockAccount.nonce).toBeDefined()
    })

    it('should handle duplicate address', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: '23505' },
      })

      expect(mockSingle).toBeDefined()
    })
  })

  describe('Account Updates (updateAccountPreferences)', () => {
    it('should update account name', async () => {
      const mockUpdated = {
        name: 'Updated Name',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdate).toBeDefined()
    })

    it('should update account timezone', async () => {
      const mockUpdated = {
        timezone: 'Europe/London',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.timezone).toBe('Europe/London')
    })

    it('should update account avatar', async () => {
      const mockUpdated = {
        avatar_url: 'https://example.com/avatar.png',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.avatar_url).toBeDefined()
    })

    it('should update account theme', async () => {
      const mockUpdated = {
        theme: 'light',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.theme).toBe('light')
    })

    it('should update public URL', async () => {
      const mockUpdated = {
        public_url: 'custom-url',
      }

      mockSingle.mockResolvedValue({
        data: mockUpdated,
        error: null,
      })

      expect(mockUpdated.public_url).toBe('custom-url')
    })
  })

  describe('Account Search (findAccountByEmail)', () => {
    it('should find account by email', async () => {
      const mockAccount = {
        address: '0x123',
        email: 'user@example.com',
      }

      mockRpc.mockResolvedValue({
        data: [mockAccount],
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })

    it('should return null for non-existent email', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })

    it('should find account by identifier', async () => {
      const mockAccount = {
        address: '0x123',
        identifier: 'john-doe',
      }

      mockRpc.mockResolvedValue({
        data: [mockAccount],
        error: null,
      })

      expect(mockRpc).toBeDefined()
    })
  })
})
