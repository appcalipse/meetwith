/**
 * Comprehensive Unit tests for database.ts
 * 
 * Massively expanded test coverage for all database operations
 */

// Set environment variables before imports
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.PIN_SALT = 'test-salt'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.FROM_MAIL = 'test@example.com'

// Mock dependencies
jest.mock('thirdweb', () => ({
  createThirdwebClient: jest.fn(() => ({})),
}))

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: jest.fn() },
  })),
}))

jest.mock('argon2', () => ({
  hash: jest.fn(),
  verify: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/services/discord.helper', () => ({
  dmAccount: jest.fn(),
  getDiscordInfoForAddress: jest.fn(),
}))

jest.mock('@/utils/services/telegram.helper', () => ({
  getTelegramUserInfo: jest.fn(),
  sendDm: jest.fn(),
}))

jest.mock('@/utils/calendar_manager', () => ({
  decryptConferenceMeeting: jest.fn(),
  generateDefaultMeetingType: jest.fn(),
  generateEmptyAvailabilities: jest.fn(() => []),
}))

jest.mock('@/utils/quickpoll_helper', () => ({
  generatePollSlug: jest.fn(),
}))

jest.mock('@/utils/services/stripe.service', () => ({
  StripeService: jest.fn(),
}))

jest.mock('@/utils/notification_helper', () => ({
  emailQueue: { add: jest.fn() },
}))

jest.mock('@/utils/posthog', () => ({
  __esModule: true,
  default: jest.fn(() => ({ capture: jest.fn() })),
}))

const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  storage: jest.fn(),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

describe('database.ts - Comprehensive Test Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Module Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => {
        require('@/utils/database')
      }).not.toThrow()
    })

    it('should create Supabase client with correct credentials', () => {
      const { createClient } = require('@supabase/supabase-js')
      expect(createClient).toHaveBeenCalled()
    })

    it('should have correct environment variables set', () => {
      expect(process.env.NEXT_SUPABASE_URL).toBe('https://test.supabase.co')
      expect(process.env.NEXT_SUPABASE_KEY).toBe('test-key')
      expect(process.env.NEXT_PUBLIC_THIRDWEB_ID).toBe('test-thirdweb-id')
    })
  })

  describe('getAccountPreferences', () => {
    let getAccountPreferences: any

    beforeEach(() => {
      const db = require('@/utils/database')
      getAccountPreferences = db.getAccountPreferences
    })

    it('should retrieve account preferences successfully', async () => {
      const mockPreferences = {
        owner_account_address: '0x123',
        availaibility_id: 'avail-1',
        timezone: 'UTC',
        default_availability: {
          id: 'avail-1',
          title: 'Default',
          timezone: 'UTC',
          weekly_availability: [],
        },
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockPreferences,
          error: null,
        }),
      })

      const result = await getAccountPreferences('0x123')
      expect(result).toBeDefined()
    })

    it('should handle error when preferences not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Not found'),
        }),
      })

      await expect(getAccountPreferences('0x123')).rejects.toThrow()
    })

    it('should handle lowercase address conversion', async () => {
      const eqMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        maybeSingle: jest.fn().mockResolvedValue({
          data: { owner_account_address: '0x123' },
          error: null,
        }),
      })

      await getAccountPreferences('0xABC')
      expect(eqMock).toHaveBeenCalledWith('owner_account_address', '0xabc')
    })

    it('should use empty availabilities when default_availability is null', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { owner_account_address: '0x123', default_availability: null },
          error: null,
        }),
      })

      const result = await getAccountPreferences('0x123')
      expect(result.availabilities).toEqual([])
    })

    it('should transform availability data correctly', async () => {
      const mockData = {
        owner_account_address: '0x123',
        default_availability: {
          weekly_availability: [{ weekday: 1, ranges: [] }],
          timezone: 'America/New_York',
        },
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await getAccountPreferences('0x123')
      expect(result.timezone).toBe('America/New_York')
      expect(result.availabilities).toEqual([{ weekday: 1, ranges: [] }])
    })
  })

  describe('getGroupInvite', () => {
    let getGroupInvite: any

    beforeEach(() => {
      const db = require('@/utils/database')
      getGroupInvite = db.getGroupInvite
    })

    it('should retrieve group invite by email', async () => {
      const mockInvite = { id: 'invite-1', email: 'test@example.com' }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockInvite], error: null }),
      })

      const result = await getGroupInvite({ email: 'test@example.com' })
      expect(result).toEqual(mockInvite)
    })

    it('should retrieve group invite by user_id', async () => {
      const mockInvite = { id: 'invite-1', user_id: 'user-1' }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockInvite], error: null }),
      })

      const result = await getGroupInvite({ user_id: 'user-1' })
      expect(result).toEqual(mockInvite)
    })

    it('should return null when no identifier provided', async () => {
      const result = await getGroupInvite({})
      expect(result).toBeNull()
    })

    it('should return null when no invites found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await getGroupInvite({ email: 'test@example.com' })
      expect(result).toBeNull()
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('DB error'),
        }),
      })

      const result = await getGroupInvite({ email: 'test@example.com' })
      expect(result).toBeNull()
    })

    it('should handle both email and user_id (email takes precedence)', async () => {
      const mockInvite = { id: 'invite-1', email: 'test@example.com' }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockInvite], error: null }),
      })

      const result = await getGroupInvite({ email: 'test@example.com', user_id: 'user-1' })
      expect(result).toEqual(mockInvite)
    })

    it('should handle special characters in email', async () => {
      const mockInvite = { id: 'invite-1', email: 'test+special@example.com' }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [mockInvite], error: null }),
      })

      const result = await getGroupInvite({ email: 'test+special@example.com' })
      expect(result).toEqual(mockInvite)
    })

    it('should handle empty string email', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await getGroupInvite({ email: '' })
      expect(result).toBeNull()
    })
  })

  describe('createGroupInvite', () => {
    let createGroupInvite: any

    beforeEach(() => {
      const db = require('@/utils/database')
      createGroupInvite = db.createGroupInvite
    })

    it('should create group invite with email', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        createGroupInvite('group-1', 'test@example.com')
      ).resolves.not.toThrow()
    })

    it('should create group invite with discord ID', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        createGroupInvite('group-1', undefined, 'discord-123')
      ).resolves.not.toThrow()
    })

    it('should create group invite with user ID', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        createGroupInvite('group-1', undefined, undefined, 'user-1')
      ).resolves.not.toThrow()
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest
          .fn()
          .mockResolvedValue({ error: new Error('Insert failed') }),
      })

      await expect(createGroupInvite('group-1', 'test@example.com')).rejects.toThrow()
    })

    it('should set user_id to null when undefined', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

      await createGroupInvite('group-1', 'test@example.com', undefined, undefined)
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null })
      )
    })

    it('should create invite with all parameters', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

      await createGroupInvite('group-1', 'test@example.com', 'discord-123', 'user-1')
      expect(insertMock).toHaveBeenCalledWith({
        discord_id: 'discord-123',
        email: 'test@example.com',
        group_id: 'group-1',
        user_id: 'user-1',
      })
    })
  })

  describe('addUserToGroupInvites', () => {
    let addUserToGroupInvites: any

    beforeEach(() => {
      const db = require('@/utils/database')
      addUserToGroupInvites = db.addUserToGroupInvites
    })

    it('should add user with member role', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        addUserToGroupInvites('group-1', 'member', 'test@example.com')
      ).resolves.not.toThrow()
    })

    it('should add user with admin role', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        addUserToGroupInvites('group-1', 'admin', 'test@example.com', '0x123')
      ).resolves.not.toThrow()
    })

    it('should handle missing email', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        addUserToGroupInvites('group-1', 'member', undefined, '0x123')
      ).resolves.not.toThrow()
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest
          .fn()
          .mockResolvedValue({ error: new Error('Insert failed') }),
      })

      await expect(
        addUserToGroupInvites('group-1', 'member', 'test@example.com')
      ).rejects.toThrow()
    })

    it('should set user_id to null when not provided', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

      await addUserToGroupInvites('group-1', 'member', 'test@example.com')
      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: null })
      )
    })

    it('should include role in insert', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

      await addUserToGroupInvites('group-1', 'admin', 'test@example.com', '0x123')
      expect(insertMock).toHaveBeenCalledWith({
        email: 'test@example.com',
        group_id: 'group-1',
        role: 'admin',
        user_id: '0x123',
      })
    })
  })

  describe('updateGroupInviteUserId', () => {
    let updateGroupInviteUserId: any

    beforeEach(() => {
      const db = require('@/utils/database')
      updateGroupInviteUserId = db.updateGroupInviteUserId
    })

    it('should update invite with user ID', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })

      await expect(
        updateGroupInviteUserId('invite-1', 'user-1')
      ).resolves.not.toThrow()
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: new Error('Update failed') }),
      })

      await expect(updateGroupInviteUserId('invite-1', 'user-1')).rejects.toThrow()
    })

    it('should call update with correct parameters', async () => {
      const updateMock = jest.fn().mockReturnThis()
      const eqMock = jest.fn().mockResolvedValue({ error: null })
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      })

      await updateGroupInviteUserId('invite-1', 'user-123')
      expect(updateMock).toHaveBeenCalledWith({ user_id: 'user-123' })
      expect(eqMock).toHaveBeenCalledWith('id', 'invite-1')
    })
  })

  describe('Subscription Functions', () => {
    let getSubscriptionFromDBForAccount: any
    let getSubscription: any
    let getExistingSubscriptionsByAddress: any
    let getExistingSubscriptionsByDomain: any
    let updateAccountSubscriptions: any

    beforeEach(() => {
      const db = require('@/utils/database')
      getSubscriptionFromDBForAccount = db.getSubscriptionFromDBForAccount
      getSubscription = db.getSubscription
      getExistingSubscriptionsByAddress = db.getExistingSubscriptionsByAddress
      getExistingSubscriptionsByDomain = db.getExistingSubscriptionsByDomain
      updateAccountSubscriptions = db.updateAccountSubscriptions
    })

    describe('getSubscriptionFromDBForAccount', () => {
      it('should retrieve active subscriptions for account', async () => {
        const mockSubscriptions = [
          { owner_account: '0x123', domain: 'test.eth', expiry_time: new Date(Date.now() + 86400000).toISOString() },
        ]
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
        })

        const result = await getSubscriptionFromDBForAccount('0x123')
        expect(result).toBeDefined()
      })

      it('should filter by chain when provided', async () => {
        const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          eq: eqMock,
        })

        await getSubscriptionFromDBForAccount('0x123', 1)
        expect(eqMock).toHaveBeenCalled()
      })

      it('should return empty array when no subscriptions found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getSubscriptionFromDBForAccount('0x123')
        expect(result).toEqual([])
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: new Error('Query failed') }),
        })

        await expect(getSubscriptionFromDBForAccount('0x123')).rejects.toThrow()
      })

      it('should convert account address to lowercase', async () => {
        const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          eq: eqMock,
        })

        await getSubscriptionFromDBForAccount('0xABC123')
        expect(eqMock).toHaveBeenCalledWith('owner_account', '0xabc123')
      })

      it('should filter out expired subscriptions', async () => {
        const gtMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          gt: gtMock,
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        await getSubscriptionFromDBForAccount('0x123')
        expect(gtMock).toHaveBeenCalledWith('expiry_time', expect.any(String))
      })
    })

    describe('getSubscription', () => {
      it('should retrieve subscription by domain', async () => {
        const mockSubscription = { domain: 'test.eth', expiry_time: new Date(Date.now() + 86400000).toISOString() }
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [mockSubscription], error: null }),
        })

        const result = await getSubscription('test.eth')
        expect(result).toEqual(mockSubscription)
      })

      it('should return undefined when no subscription found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getSubscription('test.eth')
        expect(result).toBeUndefined()
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ error: new Error('Query failed') }),
        })

        await expect(getSubscription('test.eth')).rejects.toThrow()
      })

      it('should handle case-insensitive domain search', async () => {
        const ilikeMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: ilikeMock,
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        await getSubscription('TEST.ETH')
        expect(ilikeMock).toHaveBeenCalledWith('domain', 'test.eth')
      })

      it('should order by registered_at ascending', async () => {
        const orderMock = jest.fn().mockResolvedValue({ data: [], error: null })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: orderMock,
        })

        await getSubscription('test.eth')
        expect(orderMock).toHaveBeenCalledWith('registered_at', { ascending: true })
      })

      it('should return first subscription when multiple exist', async () => {
        const mockSubscriptions = [
          { domain: 'test.eth', registered_at: '2023-01-01' },
          { domain: 'test.eth', registered_at: '2023-01-02' },
        ]
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
        })

        const result = await getSubscription('test.eth')
        expect(result).toEqual(mockSubscriptions[0])
      })
    })

    describe('getExistingSubscriptionsByAddress', () => {
      it('should retrieve subscriptions by address', async () => {
        const mockSubscriptions = [{ owner_account: '0x123' }]
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
        })

        const result = await getExistingSubscriptionsByAddress('0x123')
        expect(result).toEqual(mockSubscriptions)
      })

      it('should return undefined when no subscriptions found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getExistingSubscriptionsByAddress('0x123')
        expect(result).toBeUndefined()
      })

      it('should handle case-insensitive address search', async () => {
        const ilikeMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: ilikeMock,
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        await getExistingSubscriptionsByAddress('0xABC123')
        expect(ilikeMock).toHaveBeenCalledWith('owner_account', '0xabc123')
      })
    })

    describe('getExistingSubscriptionsByDomain', () => {
      it('should retrieve subscriptions by domain', async () => {
        const mockSubscriptions = [{ domain: 'test.eth' }]
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
        })

        const result = await getExistingSubscriptionsByDomain('test.eth')
        expect(result).toEqual(mockSubscriptions)
      })

      it('should return undefined when no subscriptions found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getExistingSubscriptionsByDomain('test.eth')
        expect(result).toBeUndefined()
      })

      it('should handle case-insensitive domain search', async () => {
        const ilikeMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          ilike: ilikeMock,
          gt: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        await getExistingSubscriptionsByDomain('TEST.ETH')
        expect(ilikeMock).toHaveBeenCalledWith('domain', 'test.eth')
      })
    })

    describe('updateAccountSubscriptions', () => {
      it('should update existing subscription', async () => {
        const mockSubscription = {
          owner_account: '0x123',
          chain: 1,
          plan_id: 'plan-1',
          domain: 'test.eth',
          expiry_time: new Date().toISOString(),
          config_ipfs_hash: 'hash',
        }

        mockSupabaseClient.from.mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          mockResolvedValue: jest.fn().mockResolvedValue({ data: [mockSubscription], error: null }),
        })

        const result = await updateAccountSubscriptions([mockSubscription])
        expect(result).toEqual([mockSubscription])
      })

      it('should insert new subscription when update returns no data', async () => {
        const mockSubscription = {
          owner_account: '0x123',
          chain: 1,
          plan_id: 'plan-1',
          domain: 'test.eth',
          expiry_time: new Date().toISOString(),
          config_ipfs_hash: 'hash',
        }

        mockSupabaseClient.from.mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
        })

        const result = await updateAccountSubscriptions([mockSubscription])
        expect(result).toEqual([mockSubscription])
      })

      it('should handle multiple subscriptions', async () => {
        const mockSubscriptions = [
          {
            owner_account: '0x123',
            chain: 1,
            plan_id: 'plan-1',
            domain: 'test1.eth',
            expiry_time: new Date().toISOString(),
            config_ipfs_hash: 'hash1',
          },
          {
            owner_account: '0x123',
            chain: 137,
            plan_id: 'plan-2',
            domain: 'test2.eth',
            expiry_time: new Date().toISOString(),
            config_ipfs_hash: 'hash2',
          },
        ]

        mockSupabaseClient.from.mockReturnValue({
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({ error: null }),
        })

        const result = await updateAccountSubscriptions(mockSubscriptions)
        expect(result).toEqual(mockSubscriptions)
      })
    })
  })

  describe('Discord Account Functions', () => {
    let getDiscordAccount: any
    let getDiscordAccountAndInfo: any
    let getAccountFromDiscordId: any
    let createOrUpdatesDiscordAccount: any
    let deleteDiscordAccount: any

    beforeEach(() => {
      const db = require('@/utils/database')
      getDiscordAccount = db.getDiscordAccount
      getDiscordAccountAndInfo = db.getDiscordAccountAndInfo
      getAccountFromDiscordId = db.getAccountFromDiscordId
      createOrUpdatesDiscordAccount = db.createOrUpdatesDiscordAccount
      deleteDiscordAccount = db.deleteDiscordAccount
    })

    describe('getDiscordAccount', () => {
      it('should retrieve discord account', async () => {
        const mockAccount = { address: '0x123', discord_id: 'discord-123' }
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [mockAccount], error: null }),
        })

        const result = await getDiscordAccount('0x123')
        expect(result).toEqual(mockAccount)
      })

      it('should return undefined when account not found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getDiscordAccount('0x123')
        expect(result).toBeUndefined()
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: new Error('Query failed') }),
        })

        await expect(getDiscordAccount('0x123')).rejects.toThrow()
      })

      it('should return first account when multiple exist', async () => {
        const mockAccounts = [
          { address: '0x123', discord_id: 'discord-1' },
          { address: '0x123', discord_id: 'discord-2' },
        ]
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: mockAccounts, error: null }),
        })

        const result = await getDiscordAccount('0x123')
        expect(result).toEqual(mockAccounts[0])
      })
    })

    describe('deleteDiscordAccount', () => {
      it('should delete discord account', async () => {
        mockSupabaseClient.from.mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        })

        await expect(deleteDiscordAccount('0x123')).resolves.not.toThrow()
      })

      it('should handle deletion errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: new Error('Delete failed') }),
        })

        await expect(deleteDiscordAccount('0x123')).rejects.toThrow()
      })

      it('should call delete with correct address', async () => {
        const eqMock = jest.fn().mockResolvedValue({ error: null })
        mockSupabaseClient.from.mockReturnValue({
          delete: jest.fn().mockReturnThis(),
          eq: eqMock,
        })

        await deleteDiscordAccount('0x456')
        expect(eqMock).toHaveBeenCalledWith('address', '0x456')
      })
    })
  })

  describe('Availability Block Functions', () => {
    let createAvailabilityBlock: any
    let getAvailabilityBlock: any
    let updateAvailabilityBlock: any
    let deleteAvailabilityBlock: any
    let duplicateAvailabilityBlock: any
    let isDefaultAvailabilityBlock: any
    let getAvailabilityBlocks: any

    beforeEach(() => {
      const db = require('@/utils/database')
      createAvailabilityBlock = db.createAvailabilityBlock
      getAvailabilityBlock = db.getAvailabilityBlock
      updateAvailabilityBlock = db.updateAvailabilityBlock
      deleteAvailabilityBlock = db.deleteAvailabilityBlock
      duplicateAvailabilityBlock = db.duplicateAvailabilityBlock
      isDefaultAvailabilityBlock = db.isDefaultAvailabilityBlock
      getAvailabilityBlocks = db.getAvailabilityBlocks
    })

    describe('createAvailabilityBlock', () => {
      it('should create availability block successfully', async () => {
        const mockBlock = { id: 'block-1', title: 'Test Block' }
        mockSupabaseClient.from.mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockBlock, error: null }),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }),
        })

        const result = await createAvailabilityBlock(
          '0x123',
          'Test Block',
          'UTC',
          []
        )
        expect(result).toEqual(mockBlock)
      })

      it('should trim title', async () => {
        const insertMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })

        await createAvailabilityBlock('0x123', '  Test Block  ', 'UTC', [])
        expect(insertMock).toHaveBeenCalledWith([
          expect.objectContaining({ title: 'Test Block' }),
        ])
      })

      it('should set as default when is_default is true', async () => {
        const mockBlock = { id: 'block-1', title: 'Test Block' }
        const updateMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockBlock, error: null }),
          update: updateMock,
          eq: jest.fn().mockResolvedValue({ error: null }),
        })

        await createAvailabilityBlock('0x123', 'Test Block', 'UTC', [], true)
        expect(updateMock).toHaveBeenCalled()
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            error: new Error('Insert failed'),
          }),
        })

        await expect(
          createAvailabilityBlock('0x123', 'Test Block', 'UTC', [])
        ).rejects.toThrow()
      })

      it('should include timezone and weekly_availability', async () => {
        const insertMock = jest.fn().mockReturnThis()
        const weeklyAvail = [{ weekday: 1, ranges: [] }]
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })

        await createAvailabilityBlock('0x123', 'Test', 'America/New_York', weeklyAvail)
        expect(insertMock).toHaveBeenCalledWith([
          expect.objectContaining({
            timezone: 'America/New_York',
            weekly_availability: weeklyAvail,
          }),
        ])
      })
    })

    describe('getAvailabilityBlock', () => {
      it('should retrieve availability block', async () => {
        const mockBlock = { id: 'block-1', title: 'Test Block' }
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: mockBlock, error: null }),
        })

        const result = await getAvailabilityBlock('block-1', '0x123')
        expect(result).toBeDefined()
      })

      it('should handle not found errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            error: { code: 'PGRST116' },
          }),
        })

        await expect(getAvailabilityBlock('block-1', '0x123')).rejects.toThrow()
      })

      it('should query with correct id and account_address', async () => {
        const eqMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: eqMock,
          maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
        })

        await getAvailabilityBlock('block-123', '0xabc')
        expect(eqMock).toHaveBeenCalledWith('id', 'block-123')
        expect(eqMock).toHaveBeenCalledWith('account_owner_address', '0xabc')
      })
    })

    describe('deleteAvailabilityBlock', () => {
      it('should delete non-default availability block', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          delete: jest.fn().mockReturnThis(),
        })

        await expect(deleteAvailabilityBlock('block-1', '0x123')).resolves.not.toThrow()
      })

      it('should handle not found errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          delete: jest.fn().mockReturnThis(),
        })

        mockSupabaseClient.from.mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }).mockReturnValueOnce({
          delete: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: { code: 'PGRST116' } }),
        })

        await expect(deleteAvailabilityBlock('block-1', '0x123')).rejects.toThrow()
      })
    })
  })

  describe('Wallet Transaction Functions', () => {
    let getWalletTransactions: any
    let getWalletTransactionsByToken: any

    beforeEach(() => {
      const db = require('@/utils/database')
      getWalletTransactions = db.getWalletTransactions
      getWalletTransactionsByToken = db.getWalletTransactionsByToken
    })

    describe('getWalletTransactions', () => {
      it('should retrieve wallet transactions', async () => {
        const mockTransactions = [
          { id: 'tx-1', initiator_address: '0x123', metadata: {} },
        ]
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: mockTransactions, error: null }),
        })

        const result = await getWalletTransactions('0x123')
        expect(result).toBeDefined()
        expect(result.transactions).toBeDefined()
      })

      it('should filter by token address', async () => {
        const eqMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: eqMock,
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        await getWalletTransactions('0x123', '0xtoken', undefined, 10, 0)
        expect(eqMock).toHaveBeenCalled()
      })

      it('should filter by chain ID', async () => {
        const eqMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: eqMock,
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        await getWalletTransactions('0x123', undefined, 1, 10, 0)
        expect(eqMock).toHaveBeenCalled()
      })

      it('should handle pagination', async () => {
        const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: rangeMock,
        })

        await getWalletTransactions('0x123', undefined, undefined, 20, 40)
        expect(rangeMock).toHaveBeenCalledWith(40, 59)
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ error: new Error('Query failed') }),
        })

        await expect(getWalletTransactions('0x123')).rejects.toThrow()
      })

      it('should detect debit direction correctly', async () => {
        const mockTx = {
          id: 'tx-1',
          initiator_address: '0x123',
          metadata: { receiver_address: '0x456' },
        }

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
        })

        const result = await getWalletTransactions('0x123')
        expect(result.transactions[0].direction).toBe('debit')
      })

      it('should detect credit direction correctly', async () => {
        const mockTx = {
          id: 'tx-1',
          initiator_address: '0x456',
          metadata: { receiver_address: '0x123' },
        }

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
        })

        const result = await getWalletTransactions('0x123')
        expect(result.transactions[0].direction).toBe('credit')
      })

      it('should handle missing metadata', async () => {
        const mockTx = {
          id: 'tx-1',
          initiator_address: '0x123',
          metadata: null,
        }

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
        })

        const result = await getWalletTransactions('0x123')
        expect(result.transactions[0].has_full_metadata).toBe(false)
      })

      it('should detect full metadata correctly', async () => {
        const mockTx = {
          id: 'tx-1',
          initiator_address: '0x123',
          metadata: { receiver_address: '0x456' },
        }

        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
        })

        const result = await getWalletTransactions('0x123')
        expect(result.transactions[0].has_full_metadata).toBe(true)
      })

      it('should use default limit of 50', async () => {
        const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: rangeMock,
        })

        await getWalletTransactions('0x123')
        expect(rangeMock).toHaveBeenCalledWith(0, 49)
      })

      it('should handle search query', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getWalletTransactions(
          '0x123',
          undefined,
          undefined,
          50,
          0,
          'search term'
        )
        expect(result.transactions).toEqual([])
      })
    })

    describe('getWalletTransactionsByToken', () => {
      it('should call getWalletTransactions with correct parameters', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          or: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: [], error: null }),
        })

        const result = await getWalletTransactionsByToken(
          '0x123',
          '0xtoken',
          1,
          25,
          10
        )
        expect(result).toBeDefined()
      })
    })
  })

  describe('Group Management Functions', () => {
    let isUserAdminOfGroup: any
    let createGroupInDB: any

    beforeEach(() => {
      const db = require('@/utils/database')
      isUserAdminOfGroup = db.isUserAdminOfGroup
      createGroupInDB = db.createGroupInDB
    })

    describe('isUserAdminOfGroup', () => {
      it('should return true when user is admin', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { role: 'admin' },
            error: null,
          }),
        })

        const result = await isUserAdminOfGroup('group-1', '0x123')
        expect(result).toBe(true)
      })

      it('should return false when user is not admin', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { role: 'member' },
            error: null,
          }),
        })

        const result = await isUserAdminOfGroup('group-1', '0x123')
        expect(result).toBe(false)
      })

      it('should return false when no data found', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })

        const result = await isUserAdminOfGroup('group-1', '0x123')
        expect(result).toBe(false)
      })

      it('should handle database errors', async () => {
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            error: new Error('Query failed'),
          }),
        })

        await expect(isUserAdminOfGroup('group-1', '0x123')).rejects.toThrow()
      })

      it('should filter by group_id and member_id', async () => {
        const eqMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnThis(),
          eq: eqMock,
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        })

        await isUserAdminOfGroup('group-123', '0xabc')
        expect(eqMock).toHaveBeenCalledWith('group_id', 'group-123')
        expect(eqMock).toHaveBeenCalledWith('member_id', '0xabc')
        expect(eqMock).toHaveBeenCalledWith('role', 'admin')
      })
    })

    describe('createGroupInDB', () => {
      it('should create group successfully', async () => {
        const mockGroup = { id: 'group-1', name: 'Test Group' }
        mockSupabaseClient.from.mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockGroup, error: null }),
        })

        const result = await createGroupInDB('Test Group', '0x123')
        expect(result).toBeDefined()
      })

      it('should create group with custom slug', async () => {
        const mockGroup = { id: 'group-1', name: 'Test Group', slug: 'custom-slug' }
        const insertMock = jest.fn().mockReturnThis()
        mockSupabaseClient.from.mockReturnValue({
          insert: insertMock,
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockGroup, error: null }),
        })

        await createGroupInDB('Test Group', '0x123', 'custom-slug')
        expect(insertMock).toHaveBeenCalled()
      })
    })
  })
})

describe('Additional Database Coverage Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null responses gracefully', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      const result = await db.getGroupInvite({ email: 'test@example.com' })
      expect(result).toBeNull()
    })

    it('should handle empty array responses', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await db.getGroupInvite({ email: 'test@example.com' })
      expect(result).toBeNull()
    })

    it('should handle very long email addresses', async () => {
      const db = require('@/utils/database')
      const longEmail = 'a'.repeat(200) + '@example.com'
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await db.getGroupInvite({ email: longEmail })
      expect(result).toBeNull()
    })

    it('should handle very long domain names', async () => {
      const db = require('@/utils/database')
      const longDomain = 'a'.repeat(100) + '.eth'
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await db.getSubscription(longDomain)
      expect(result).toBeUndefined()
    })

    it('should handle unicode characters in email', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await db.getGroupInvite({ email: 'test@examplé.com' })
      expect(result).toBeNull()
    })

    it('should handle empty string parameters', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const result = await db.getGroupInvite({ email: '' })
      expect(result).toBeNull()
    })

    it('should handle maximum pagination offset', async () => {
      const db = require('@/utils/database')
      const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: rangeMock,
      })

      await db.getWalletTransactions('0x123', undefined, undefined, 100, 10000)
      expect(rangeMock).toHaveBeenCalledWith(10000, 10099)
    })

    it('should handle zero offset', async () => {
      const db = require('@/utils/database')
      const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: rangeMock,
      })

      await db.getWalletTransactions('0x123', undefined, undefined, 10, 0)
      expect(rangeMock).toHaveBeenCalledWith(0, 9)
    })

    it('should handle single item limit', async () => {
      const db = require('@/utils/database')
      const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: rangeMock,
      })

      await db.getWalletTransactions('0x123', undefined, undefined, 1, 0)
      expect(rangeMock).toHaveBeenCalledWith(0, 0)
    })

    it('should handle checksum addresses', async () => {
      const db = require('@/utils/database')
      const eqMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.getAccountPreferences('0xAbC123dEf456')
      expect(eqMock).toHaveBeenCalledWith('owner_account_address', '0xabc123def456')
    })

    it('should handle mixed case domain names', async () => {
      const db = require('@/utils/database')
      const ilikeMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: ilikeMock,
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      await db.getSubscription('TeSt.EtH')
      expect(ilikeMock).toHaveBeenCalledWith('domain', 'test.eth')
    })

    it('should handle null metadata in transactions', async () => {
      const db = require('@/utils/database')
      const mockTx = { id: 'tx-1', initiator_address: '0x123', metadata: null }
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
      })

      const result = await db.getWalletTransactions('0x123')
      expect(result.transactions[0].has_full_metadata).toBe(false)
    })
  })

  describe('Query Chaining Tests', () => {
    it('should chain select and eq correctly', async () => {
      const db = require('@/utils/database')
      const selectMock = jest.fn().mockReturnThis()
      const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        eq: eqMock,
      })

      await db.getGroupInvite({ email: 'test@example.com' })
      expect(selectMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalled()
    })

    it('should chain multiple eq operations', async () => {
      const db = require('@/utils/database')
      const eqMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      })

      await db.isUserAdminOfGroup('group-1', '0x123')
      expect(eqMock).toHaveBeenCalledTimes(3)
    })

    it('should chain select, ilike, gt, and order', async () => {
      const db = require('@/utils/database')
      const selectMock = jest.fn().mockReturnThis()
      const ilikeMock = jest.fn().mockReturnThis()
      const gtMock = jest.fn().mockReturnThis()
      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null })
      
      mockSupabaseClient.from.mockReturnValue({
        select: selectMock,
        ilike: ilikeMock,
        gt: gtMock,
        order: orderMock,
      })

      await db.getSubscription('test.eth')
      expect(selectMock).toHaveBeenCalled()
      expect(ilikeMock).toHaveBeenCalled()
      expect(gtMock).toHaveBeenCalled()
      expect(orderMock).toHaveBeenCalled()
    })

    it('should chain or, order, and range', async () => {
      const db = require('@/utils/database')
      const orMock = jest.fn().mockReturnThis()
      const orderMock = jest.fn().mockReturnThis()
      const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
      
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: orMock,
        order: orderMock,
        range: rangeMock,
      })

      await db.getWalletTransactions('0x123')
      expect(orMock).toHaveBeenCalled()
      expect(orderMock).toHaveBeenCalled()
      expect(rangeMock).toHaveBeenCalled()
    })

    it('should chain update and eq for modification', async () => {
      const db = require('@/utils/database')
      const updateMock = jest.fn().mockReturnThis()
      const eqMock = jest.fn().mockResolvedValue({ error: null })
      
      mockSupabaseClient.from.mockReturnValue({
        update: updateMock,
        eq: eqMock,
      })

      await db.updateGroupInviteUserId('invite-1', 'user-1')
      expect(updateMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalled()
    })

    it('should chain delete and eq for removal', async () => {
      const db = require('@/utils/database')
      const deleteMock = jest.fn().mockReturnThis()
      const eqMock = jest.fn().mockResolvedValue({ error: null })
      
      mockSupabaseClient.from.mockReturnValue({
        delete: deleteMock,
        eq: eqMock,
      })

      await db.deleteDiscordAccount('0x123')
      expect(deleteMock).toHaveBeenCalled()
      expect(eqMock).toHaveBeenCalled()
    })
  })

  describe('Data Transformation Tests', () => {
    it('should transform nested availability data correctly', async () => {
      const db = require('@/utils/database')
      const mockData = {
        owner_account_address: '0x123',
        default_availability: {
          weekly_availability: [{ weekday: 1, ranges: [] }],
          timezone: 'UTC',
        },
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      })

      const result = await db.getAccountPreferences('0x123')
      expect(result.availabilities).toEqual([{ weekday: 1, ranges: [] }])
    })

    it('should preserve timezone information', async () => {
      const db = require('@/utils/database')
      const insertMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.createAvailabilityBlock('0x123', 'Test', 'America/New_York', [])
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ timezone: 'America/New_York' }),
      ])
    })

    it('should handle empty weekly_availability arrays', async () => {
      const db = require('@/utils/database')
      const insertMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.createAvailabilityBlock('0x123', 'Test', 'UTC', [])
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ weekly_availability: [] }),
      ])
    })

    it('should handle complex weekly_availability structures', async () => {
      const db = require('@/utils/database')
      const insertMock = jest.fn().mockReturnThis()
      const complexAvail = [
        { weekday: 0, ranges: [{ start: '09:00', end: '17:00' }] },
        { weekday: 1, ranges: [{ start: '10:00', end: '18:00' }] },
      ]
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.createAvailabilityBlock('0x123', 'Test', 'UTC', complexAvail)
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ weekly_availability: complexAvail }),
      ])
    })
  })

  describe('Concurrent Operations Tests', () => {
    it('should handle multiple simultaneous requests', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const promises = [
        db.getGroupInvite({ email: 'test1@example.com' }),
        db.getGroupInvite({ email: 'test2@example.com' }),
        db.getGroupInvite({ email: 'test3@example.com' }),
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
    })

    it('should handle parallel account lookups', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      const promises = [
        db.getAccountPreferences('0x111'),
        db.getAccountPreferences('0x222'),
        db.getAccountPreferences('0x333'),
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
    })

    it('should handle parallel subscription queries', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const promises = [
        db.getSubscription('test1.eth'),
        db.getSubscription('test2.eth'),
        db.getSubscription('test3.eth'),
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
    })

    it('should handle parallel transaction queries', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const promises = [
        db.getWalletTransactions('0x111'),
        db.getWalletTransactions('0x222'),
        db.getWalletTransactions('0x333'),
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
    })

    it('should handle parallel discord account queries', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      const promises = [
        db.getDiscordAccount('0x111'),
        db.getDiscordAccount('0x222'),
        db.getDiscordAccount('0x333'),
      ]

      const results = await Promise.all(promises)
      expect(results).toHaveLength(3)
    })
  })

  describe('Additional Coverage Tests', () => {
    it('should handle transaction with unknown direction', async () => {
      const db = require('@/utils/database')
      const mockTx = {
        id: 'tx-1',
        initiator_address: '0x456',
        metadata: { receiver_address: '0x789' },
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
      })

      const result = await db.getWalletTransactions('0x123')
      expect(result.transactions[0].direction).toBe('unknown')
    })

    it('should set counterparty_address for debit', async () => {
      const db = require('@/utils/database')
      const mockTx = {
        id: 'tx-1',
        initiator_address: '0x123',
        metadata: { receiver_address: '0x456' },
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
      })

      const result = await db.getWalletTransactions('0x123')
      expect(result.transactions[0].counterparty_address).toBe('0x456')
    })

    it('should set counterparty_address for credit', async () => {
      const db = require('@/utils/database')
      const mockTx = {
        id: 'tx-1',
        initiator_address: '0x456',
        metadata: { receiver_address: '0x123' },
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
      })

      const result = await db.getWalletTransactions('0x123')
      expect(result.transactions[0].counterparty_address).toBe('0x456')
    })

    it('should handle availability block title trimming', async () => {
      const db = require('@/utils/database')
      const insertMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.createAvailabilityBlock('0x123', '   Test   ', 'UTC', [])
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ title: 'Test' }),
      ])
    })

    it('should preserve internal whitespace in titles', async () => {
      const db = require('@/utils/database')
      const insertMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        insert: insertMock,
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.createAvailabilityBlock('0x123', 'Test  Block', 'UTC', [])
      expect(insertMock).toHaveBeenCalledWith([
        expect.objectContaining({ title: 'Test  Block' }),
      ])
    })

    it('should handle subscription ordering', async () => {
      const db = require('@/utils/database')
      const orderMock = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        order: orderMock,
      })

      await db.getSubscription('test.eth')
      expect(orderMock).toHaveBeenCalledWith('registered_at', { ascending: true })
    })

    it('should handle transaction ordering by created_at descending', async () => {
      const db = require('@/utils/database')
      const orderMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: orderMock,
        range: jest.fn().mockResolvedValue({ data: [], error: null }),
      })

      await db.getWalletTransactions('0x123')
      expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
    })

    it('should normalize uppercase addresses', async () => {
      const db = require('@/utils/database')
      const eqMock = jest.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: eqMock,
        maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
      })

      await db.getAccountPreferences('0XABCDEF')
      expect(eqMock).toHaveBeenCalledWith('owner_account_address', '0xabcdef')
    })

    it('should handle subscription with null domain', async () => {
      const db = require('@/utils/database')
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      const subscription = {
        owner_account: '0x123',
        chain: 1,
        plan_id: 'plan-1',
        domain: null,
        expiry_time: new Date().toISOString(),
        config_ipfs_hash: 'hash123',
      }

      const result = await db.updateAccountSubscriptions([subscription])
      expect(result).toEqual([subscription])
    })

    it('should handle multiple discord accounts for address', async () => {
      const db = require('@/utils/database')
      const mockAccounts = [
        { discord_id: 'id1', address: '0x123' },
        { discord_id: 'id2', address: '0x123' },
      ]
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockAccounts, error: null }),
      })

      const result = await db.getDiscordAccount('0x123')
      expect(result).toEqual(mockAccounts[0])
    })
  })
})

describe('Final Coverage Extension Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should handle group invite with all parameters', async () => {
    const db = require('@/utils/database')
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

    await db.createGroupInvite('group-1', 'test@example.com', 'discord-123', 'user-1')
    expect(insertMock).toHaveBeenCalledWith({
      discord_id: 'discord-123',
      email: 'test@example.com',
      group_id: 'group-1',
      user_id: 'user-1',
    })
  })

  it('should handle group invite with only email', async () => {
    const db = require('@/utils/database')
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

    await db.createGroupInvite('group-1', 'test@example.com')
    expect(insertMock).toHaveBeenCalledWith({
      discord_id: undefined,
      email: 'test@example.com',
      group_id: 'group-1',
      user_id: null,
    })
  })

  it('should handle multiple subscriptions update', async () => {
    const db = require('@/utils/database')
    const mockSubscriptions = [
      {
        owner_account: '0x123',
        chain: 1,
        plan_id: 'plan-1',
        domain: 'test1.eth',
        expiry_time: new Date().toISOString(),
        config_ipfs_hash: 'hash1',
      },
      {
        owner_account: '0x123',
        chain: 137,
        plan_id: 'plan-2',
        domain: 'test2.eth',
        expiry_time: new Date().toISOString(),
        config_ipfs_hash: 'hash2',
      },
    ]

    mockSupabaseClient.from.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    })

    const result = await db.updateAccountSubscriptions(mockSubscriptions)
    expect(result).toEqual(mockSubscriptions)
  })

  it('should handle first subscription when multiple exist', async () => {
    const db = require('@/utils/database')
    const mockSubscriptions = [
      { domain: 'test.eth', registered_at: '2023-01-01' },
      { domain: 'test.eth', registered_at: '2023-01-02' },
    ]
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockSubscriptions, error: null }),
    })

    const result = await db.getSubscription('test.eth')
    expect(result).toEqual(mockSubscriptions[0])
  })

  it('should filter expired subscriptions by timestamp', async () => {
    const db = require('@/utils/database')
    const gtMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gt: gtMock,
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const beforeCall = Date.now()
    await db.getSubscriptionFromDBForAccount('0x123')
    const afterCall = Date.now()

    const callArg = gtMock.mock.calls[0][1]
    const callTime = new Date(callArg).getTime()
    expect(callTime).toBeGreaterThanOrEqual(beforeCall)
    expect(callTime).toBeLessThanOrEqual(afterCall)
  })

  it('should handle transactions without receiver_address', async () => {
    const db = require('@/utils/database')
    const mockTx = {
      id: 'tx-1',
      initiator_address: '0x123',
      metadata: {},
    }

    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [mockTx], error: null }),
    })

    const result = await db.getWalletTransactions('0x123')
    expect(result.transactions[0].has_full_metadata).toBe(false)
  })

  it('should handle special characters in discord_id', async () => {
    const db = require('@/utils/database')
    const mockAccount = { discord_id: 'special-id_123', address: '0x123' }
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [mockAccount], error: null }),
    })

    const result = await db.getDiscordAccount('0x123')
    expect(result.discord_id).toBe('special-id_123')
  })

  it('should delete discord account with correct address parameter', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseClient.from.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: eqMock,
    })

    await db.deleteDiscordAccount('0x456')
    expect(eqMock).toHaveBeenCalledWith('address', '0x456')
  })

  it('should filter by group_id, member_id and role for admin check', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: eqMock,
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })

    await db.isUserAdminOfGroup('group-123', '0xabc')
    expect(eqMock).toHaveBeenCalledWith('group_id', 'group-123')
    expect(eqMock).toHaveBeenCalledWith('member_id', '0xabc')
    expect(eqMock).toHaveBeenCalledWith('role', 'admin')
  })

  it('should handle availability block query by id and owner', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: eqMock,
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })

    await db.getAvailabilityBlock('block-123', '0xabc')
    expect(eqMock).toHaveBeenCalledWith('id', 'block-123')
    expect(eqMock).toHaveBeenCalledWith('account_owner_address', '0xabc')
  })

  it('should include owner address in availability block creation', async () => {
    const db = require('@/utils/database')
    const insertMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      insert: insertMock,
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })

    await db.createAvailabilityBlock('0xowner', 'Test', 'UTC', [])
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ account_owner_address: '0xowner' }),
    ])
  })

  it('should handle subscriptions with different chains', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      eq: eqMock,
    })

    await db.getSubscriptionFromDBForAccount('0x123', 137)
    expect(eqMock).toHaveBeenCalledWith('chain', 137)
  })

  it('should handle wallet transactions with token filter', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: eqMock,
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    await db.getWalletTransactions('0x123', '0xtoken123')
    expect(eqMock).toHaveBeenCalledWith('token_address', '0xtoken123')
  })

  it('should handle wallet transactions with chain filter', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: eqMock,
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    await db.getWalletTransactions('0x123', undefined, 1)
    expect(eqMock).toHaveBeenCalledWith('chain_id', 1)
  })

  it('should handle wallet transactions with both token and chain filters', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: eqMock,
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    await db.getWalletTransactions('0x123', '0xtoken', 137)
    expect(eqMock).toHaveBeenCalledWith('token_address', '0xtoken')
    expect(eqMock).toHaveBeenCalledWith('chain_id', 137)
  })

  it('should handle wallet transactions pagination correctly', async () => {
    const db = require('@/utils/database')
    const rangeMock = jest.fn().mockResolvedValue({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: rangeMock,
    })

    await db.getWalletTransactions('0x123', undefined, undefined, 25, 50)
    expect(rangeMock).toHaveBeenCalledWith(50, 74)
  })

  it('should handle getWalletTransactionsByToken delegation', async () => {
    const db = require('@/utils/database')
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await db.getWalletTransactionsByToken('0x123', '0xtoken', 1, 25, 10)
    expect(result).toBeDefined()
    expect(result.transactions).toBeDefined()
  })

  it('should handle account preferences with nested select structure', async () => {
    const db = require('@/utils/database')
    const selectMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: selectMock,
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })

    await db.getAccountPreferences('0x123')
    expect(selectMock).toHaveBeenCalled()
    const selectArg = selectMock.mock.calls[0][0]
    expect(selectArg).toContain('default_availability')
    expect(selectArg).toContain('availabilities')
  })

  it('should handle group invites with role parameter', async () => {
    const db = require('@/utils/database')
    const insertMock = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseClient.from.mockReturnValue({ insert: insertMock })

    await db.addUserToGroupInvites('group-1', 'admin', 'test@example.com', '0x123')
    expect(insertMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      group_id: 'group-1',
      role: 'admin',
      user_id: '0x123',
    })
  })

  it('should update group invite user_id correctly', async () => {
    const db = require('@/utils/database')
    const updateMock = jest.fn().mockReturnThis()
    const eqMock = jest.fn().mockResolvedValue({ error: null })
    mockSupabaseClient.from.mockReturnValue({
      update: updateMock,
      eq: eqMock,
    })

    await db.updateGroupInviteUserId('invite-1', 'user-123')
    expect(updateMock).toHaveBeenCalledWith({ user_id: 'user-123' })
    expect(eqMock).toHaveBeenCalledWith('id', 'invite-1')
  })

  it('should handle subscription update with all required fields', async () => {
    const db = require('@/utils/database')
    const updateMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      update: updateMock,
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
    })

    const subscription = {
      owner_account: '0x123',
      chain: 1,
      plan_id: 'plan-1',
      domain: 'test.eth',
      expiry_time: new Date().toISOString(),
      config_ipfs_hash: 'hash123',
    }

    await db.updateAccountSubscriptions([subscription])
    expect(updateMock).toHaveBeenCalledWith({
      config_ipfs_hash: 'hash123',
      domain: 'test.eth',
      expiry_time: subscription.expiry_time,
      plan_id: 'plan-1',
    })
  })

  it('should handle availability block with different timezones', async () => {
    const db = require('@/utils/database')
    const insertMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      insert: insertMock,
      select: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })

    await db.createAvailabilityBlock('0x123', 'Test', 'Europe/London', [])
    expect(insertMock).toHaveBeenCalledWith([
      expect.objectContaining({ timezone: 'Europe/London' }),
    ])
  })

  it('should handle transaction total count correctly', async () => {
    const db = require('@/utils/database')
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await db.getWalletTransactions('0x123')
    expect(result.totalCount).toBe(0)
  })

  it('should handle case-insensitive subscription address lookup', async () => {
    const db = require('@/utils/database')
    const ilikeMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      ilike: ilikeMock,
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    await db.getExistingSubscriptionsByAddress('0xABC123')
    expect(ilikeMock).toHaveBeenCalledWith('owner_account', '0xabc123')
  })

  it('should handle case-insensitive subscription domain lookup', async () => {
    const db = require('@/utils/database')
    const ilikeMock = jest.fn().mockReturnThis()
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      ilike: ilikeMock,
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    await db.getExistingSubscriptionsByDomain('TEST.ETH')
    expect(ilikeMock).toHaveBeenCalledWith('domain', 'test.eth')
  })

  it('should handle empty subscription results', async () => {
    const db = require('@/utils/database')
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await db.getExistingSubscriptionsByAddress('0x123')
    expect(result).toBeUndefined()
  })

  it('should handle empty domain subscription results', async () => {
    const db = require('@/utils/database')
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    })

    const result = await db.getExistingSubscriptionsByDomain('test.eth')
    expect(result).toBeUndefined()
  })

  it('should convert account address to lowercase in subscription query', async () => {
    const db = require('@/utils/database')
    const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
    mockSupabaseClient.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      eq: eqMock,
    })

    await db.getSubscriptionFromDBForAccount('0xABC123')
    expect(eqMock).toHaveBeenCalledWith('owner_account', '0xabc123')
  })
})
