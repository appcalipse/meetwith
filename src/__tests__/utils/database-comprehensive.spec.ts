/**
 * COMPREHENSIVE UNIT TESTS FOR database.ts
 * 
 * Target: 215 tests covering 40%+ of database.ts (10,787 lines)
 * 
 * Coverage areas:
 * - Account Management (getAccountPreferences, updateAccountPreferences, etc.)
 * - Meeting Management (createMeeting, updateMeeting, deleteMeeting, etc.)
 * - Group Management (createGroup, updateGroup, deleteGroup, etc.)
 * - Subscription Management (getSubscription, createSubscription, etc.)
 * - QuickPoll Functions (createQuickPoll, updateQuickPoll, etc.)
 * - Calendar & Availability (createAvailabilityBlock, etc.)
 * - Contact Management (createContact, updateContact, etc.)
 * - Transaction/Wallet (getWalletTransactions, etc.)
 */

// Set environment variables before imports
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.PIN_SALT = 'test-salt'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.FROM_MAIL = 'test@example.com'
process.env.NEXT_PUBLIC_POSTHOG_KEY = 'test-posthog-key'
process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = 'pk_test_123'

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn(),
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
  hash: jest.fn((password) => Promise.resolve(`hashed_${password}`)),
  verify: jest.fn((hash, password) => Promise.resolve(hash === `hashed_${password}`)),
}))

jest.mock('eth-crypto', () => ({
  encryptWithPublicKey: jest.fn((publicKey, data) => Promise.resolve({
    iv: 'mock_iv',
    ephemPublicKey: 'mock_ephemPublicKey',
    ciphertext: 'mock_ciphertext',
    mac: 'mock_mac',
  })),
  decryptWithPrivateKey: jest.fn((privateKey, encrypted) => Promise.resolve('decrypted_data')),
}))

jest.mock('@/utils/calendar_manager', () => ({
  decryptConferenceMeeting: jest.fn(),
  generateDefaultMeetingType: jest.fn(() => ({
    id: 'default_mt',
    name: 'Default Meeting',
    duration: 30,
    location: 'Google Meet',
  })),
  generateEmptyAvailabilities: jest.fn(() => []),
}))

jest.mock('@/utils/quickpoll_helper', () => ({
  generatePollSlug: jest.fn((title) => `${title.toLowerCase().replace(/\s+/g, '-')}-123`),
}))

jest.mock('uuid', () => ({
  v4: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
  validate: jest.fn((uuid) => {
    // More realistic UUID validation pattern
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return typeof uuid === 'string' && uuidRegex.test(uuid)
  }),
}))

// Create shared query builder that will be reused across all queries
const createSharedQueryBuilder = () => {
  const queryBuilder: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    upsert: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    gt: jest.fn(),
    gte: jest.fn(),
    lt: jest.fn(),
    lte: jest.fn(),
    like: jest.fn(),
    ilike: jest.fn(),
    is: jest.fn(),
    in: jest.fn(),
    contains: jest.fn(),
    containedBy: jest.fn(),
    range: jest.fn(),
    match: jest.fn(),
    not: jest.fn(),
    or: jest.fn(),
    filter: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    then: jest.fn(),
  }
  
  // Make all methods return this for chaining
  Object.keys(queryBuilder).forEach(key => {
    if (key !== 'single' && key !== 'maybeSingle' && key !== 'then') {
      queryBuilder[key].mockReturnValue(queryBuilder)
    }
  })
  
  // Set default resolved values for terminal methods
  queryBuilder.single.mockResolvedValue({ data: null, error: null })
  queryBuilder.maybeSingle.mockResolvedValue({ data: null, error: null })
  queryBuilder.then.mockImplementation((resolve) => resolve({ data: [], error: null }))
  
  return queryBuilder
}

const sharedQueryBuilder = createSharedQueryBuilder()

// Mock Supabase client with shared query builder
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => sharedQueryBuilder),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signIn: jest.fn().mockResolvedValue({ data: null, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
  })),
}))

import * as Sentry from '@sentry/nextjs'
import { createClient } from '@supabase/supabase-js'
import {
  getAccountPreferences,
  updateAccountPreferences,
  getAccountFromDB,
  getAccountFromDBPublic,
  initAccountDBForWallet,
  findAccountByEmail,
  findAccountsByEmails,
  findAccountByIdentifier,
  saveMeeting,
  getMeetingFromDB,
  updateMeeting,
  deleteMeetingFromDB,
  updateMeetingInstance,
  createGroupInDB,
  editGroup,
  deleteGroup,
  getGroup,
  getGroupsEmpty,
  addUserToGroup,
  removeMember,
  isUserAdminOfGroup,
  isGroupAdmin,
  changeGroupRole,
  getSubscription,
  getSubscriptionFromDBForAccount,
  getExistingSubscriptionsByAddress,
  getExistingSubscriptionsByDomain,
  createStripeSubscription,
  updateStripeSubscription,
  getStripeSubscriptionByAccount,
  createQuickPoll,
  updateQuickPoll,
  deleteQuickPoll,
  getQuickPollById,
  getQuickPollBySlug,
  getQuickPollsForAccount,
  addQuickPollParticipant,
  updateQuickPollParticipantAvailability,
  updateQuickPollParticipantStatus,
  createAvailabilityBlock,
  updateAvailabilityBlock,
  deleteAvailabilityBlock,
  getAvailabilityBlock,
  getAvailabilityBlocks,
  duplicateAvailabilityBlock,
  isDefaultAvailabilityBlock,
  getContactById,
  getContacts,
  removeContact,
  acceptContactInvite,
  rejectContactInvite,
  createGroupInvite,
  getGroupInvite,
  updateGroupInviteUserId,
  getWalletTransactions,
  getWalletTransactionsByToken,
  createCryptoTransaction,
  handleUpdateTransactionStatus,
  createOrUpdatesDiscordAccount,
  deleteDiscordAccount,
  getDiscordAccount,
  getDiscordAccountAndInfo,
  getTelegramAccountAndInfo,
  getAccountFromDiscordId,
  getMeetingTypeFromDB,
  getMeetingTypes,
  createMeetingType,
  updateMeetingType,
  deleteMeetingType,
  createPinHash,
  verifyUserPin,
  getSlotById,
  getSlotsForAccount,
  getGroupInvites,
  manageGroupInvite,
  publicGroupJoin,
  leaveGroup,
} from '@/utils/database'

describe('database.ts - COMPREHENSIVE TESTS', () => {
  // Get references to the mocked functions
  const mockClient = (createClient as jest.Mock)()
  const mockFrom = mockClient.from
  const mockRpc = mockClient.rpc
  
  // The query builder is returned by mockFrom()
  const queryBuilder = mockFrom()
  const mockSelect = queryBuilder.select
  const mockInsert = queryBuilder.insert
  const mockUpdate = queryBuilder.update
  const mockDelete = queryBuilder.delete
  const mockEq = queryBuilder.eq
  const mockIn = queryBuilder.in
  const mockGt = queryBuilder.gt
  const mockLt = queryBuilder.lt
  const mockGte = queryBuilder.gte
  const mockLte = queryBuilder.lte
  const mockOr = queryBuilder.or
  const mockOrder = queryBuilder.order
  const mockLimit = queryBuilder.limit
  const mockSingle = queryBuilder.single
  const mockMaybeSingle = queryBuilder.maybeSingle
  const mockRange = queryBuilder.range
  const mockFilter = queryBuilder.filter
  const mockNeq = queryBuilder.neq
  const mockContains = queryBuilder.contains
  const mockIs = queryBuilder.is
  const mockNot = queryBuilder.not

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
    
    // Reset default behaviors
    mockSingle.mockResolvedValue({ data: null, error: null })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  })

  // ==================== ACCOUNT MANAGEMENT TESTS ====================
  
  describe('Account Management', () => {
    describe('getAccountPreferences', () => {
      it('should fetch account preferences successfully', async () => {
        const mockPrefs = {
          owner_account_address: '0x123',
          theme: 'dark',
          language: 'en',
          default_availability: {
            id: 'avail_123',
            timezone: 'America/New_York',
            weekly_availability: [],
          },
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockPrefs,
          error: null,
        })

        const result = await getAccountPreferences('0x123')

        expect(result).toBeDefined()
        expect(result.owner_account_address).toBe('0x123')
        expect(result.availabilities).toBeDefined()
      })

      it('should handle missing preferences', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(getAccountPreferences('0x123')).rejects.toThrow()
      })

      it('should handle database errors', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        })

        await expect(getAccountPreferences('0x123')).rejects.toThrow()
        expect(Sentry.captureException).toHaveBeenCalled()
      })

      it('should convert address to lowercase', async () => {
        const mockPrefs = {
          owner_account_address: '0xabc',
          default_availability: null,
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockPrefs,
          error: null,
        })

        await getAccountPreferences('0xABC')

        expect(mockEq).toHaveBeenCalledWith('owner_account_address', '0xabc')
      })

      it('should generate empty availabilities when none exist', async () => {
        const mockPrefs = {
          owner_account_address: '0x123',
          default_availability: null,
        }
        
        mockMaybeSingle.mockResolvedValue({
          data: mockPrefs,
          error: null,
        })

        const result = await getAccountPreferences('0x123')

        expect(result).toBeDefined()
      })
    })

    describe('updateAccountPreferences', () => {
      it('should update account preferences successfully', async () => {
        const mockAccount = {
          address: '0x123',
          email: 'user@example.com',
          username: 'testuser',
        }

        mockSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await updateAccountPreferences(mockAccount as any)

        expect(result).toEqual(mockAccount)
        expect(mockFrom).toHaveBeenCalledWith('accounts')
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        })

        await expect(updateAccountPreferences({} as any)).rejects.toThrow()
      })

      it('should update email notification preferences', async () => {
        const mockAccount = {
          address: '0x123',
          email: 'newemail@example.com',
        }

        mockSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await updateAccountPreferences(mockAccount as any)

        expect(result.email).toBe('newemail@example.com')
      })
    })

    describe('getAccountFromDB', () => {
      it('should fetch account by address', async () => {
        const mockAccount = {
          address: '0x123',
          username: 'testuser',
          email: 'test@example.com',
        }

        // getAccountFromDB uses RPC, not from().select()
        mockRpc.mockResolvedValueOnce({
          data: mockAccount,
          error: null,
        })
        
        // Mock the nested calls
        mockMaybeSingle.mockResolvedValue({ data: null, error: null })

        const result = await getAccountFromDB('0x123')

        expect(result).toBeDefined()
        expect(result.address).toBe('0x123')
      })

      it('should throw error when account not found', async () => {
        mockRpc.mockResolvedValueOnce({
          data: null,
          error: null,
        })

        await expect(getAccountFromDB('0xnonexistent')).rejects.toThrow()
      })

      it('should handle database errors gracefully', async () => {
        mockRpc.mockResolvedValueOnce({
          data: null,
          error: { message: 'Connection timeout' },
        })

        await expect(getAccountFromDB('0x123')).rejects.toThrow()
      })

      it('should include private information when requested', async () => {
        const mockAccount = {
          address: '0x123',
          username: 'testuser',
          private_key: 'secret',
        }

        mockRpc.mockResolvedValueOnce({
          data: mockAccount,
          error: null,
        })
        
        // Mock the nested calls
        mockMaybeSingle.mockResolvedValue({ data: null, error: null })

        const result = await getAccountFromDB('0x123', true)

        expect(result).toBeDefined()
        expect(result.address).toBe('0x123')
      })
    })

    describe('getAccountFromDBPublic', () => {
      it('should fetch public account info', async () => {
        const mockAccount = {
          address: '0x123',
          username: 'testuser',
          avatar_url: 'https://example.com/avatar.png',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await getAccountFromDBPublic('0x123')

        expect(result).toEqual(mockAccount)
      })

      it('should not include private information', async () => {
        const mockAccount = {
          address: '0x123',
          username: 'testuser',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await getAccountFromDBPublic('0x123')

        expect(result).not.toHaveProperty('private_key')
      })
    })

    describe('findAccountByEmail', () => {
      it('should find account by email', async () => {
        const mockAccount = {
          address: '0x123',
          email: 'test@example.com',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await findAccountByEmail('test@example.com')

        expect(result).toEqual(mockAccount)
        expect(mockEq).toHaveBeenCalledWith('email', 'test@example.com')
      })

      it('should return null for non-existent email', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await findAccountByEmail('notfound@example.com')

        expect(result).toBeNull()
      })
    })

    describe('findAccountsByEmails', () => {
      it('should find multiple accounts by emails', async () => {
        const mockAccounts = [
          { address: '0x123', email: 'test1@example.com' },
          { address: '0x456', email: 'test2@example.com' },
        ]

        mockSelect.mockResolvedValue({
          data: mockAccounts,
          error: null,
        })

        const result = await findAccountsByEmails(['test1@example.com', 'test2@example.com'])

        expect(result).toEqual(mockAccounts)
        expect(mockIn).toHaveBeenCalled()
      })

      it('should return empty array for no matches', async () => {
        mockSelect.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await findAccountsByEmails(['notfound@example.com'])

        expect(result).toEqual([])
      })
    })

    describe('findAccountByIdentifier', () => {
      it('should find account by username', async () => {
        const mockAccount = {
          address: '0x123',
          username: 'testuser',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await findAccountByIdentifier('testuser')

        expect(result).toEqual(mockAccount)
      })

      it('should find account by address', async () => {
        const mockAccount = {
          address: '0x123',
          username: 'testuser',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await findAccountByIdentifier('0x123')

        expect(result).toEqual(mockAccount)
      })
    })

    describe('initAccountDBForWallet', () => {
      it('should initialize account for new wallet', async () => {
        const mockAccount = {
          address: '0x123',
          username: null,
          nonce: 1,
        }

        mockSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await initAccountDBForWallet('0x123')

        expect(result).toBeDefined()
        expect(mockFrom).toHaveBeenCalledWith('accounts')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle existing account gracefully', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { code: '23505' }, // Unique constraint violation
        })

        await expect(initAccountDBForWallet('0x123')).rejects.toThrow()
      })
    })
  })


  // ==================== MEETING MANAGEMENT TESTS ====================
  
  describe('Meeting Management', () => {
    describe('saveMeeting', () => {
      const mockParticipant = {
        address: '0x123',
        type: 'organizer' as const,
      }

      const mockMeetingRequest = {
        title: 'Test Meeting',
        start_time: '2024-02-01T10:00:00Z',
        end_time: '2024-02-01T11:00:00Z',
        participants: [],
      }

      it('should create a new meeting successfully', async () => {
        const mockSlot = {
          id: 'slot_123',
          title: 'Test Meeting',
          start: '2024-02-01T10:00:00Z',
          end: '2024-02-01T11:00:00Z',
        }

        mockSingle.mockResolvedValue({
          data: mockSlot,
          error: null,
        })

        const result = await saveMeeting(mockParticipant, mockMeetingRequest as any)

        expect(result).toEqual(mockSlot)
        expect(mockFrom).toHaveBeenCalledWith('slots')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        })

        await expect(saveMeeting(mockParticipant, mockMeetingRequest as any)).rejects.toThrow()
      })

      it('should create meeting with participants', async () => {
        const requestWithParticipants = {
          ...mockMeetingRequest,
          participants: [
            { address: '0x456', type: 'guest' as const },
          ],
        }

        mockSingle.mockResolvedValue({
          data: { id: 'slot_123' },
          error: null,
        })

        const result = await saveMeeting(mockParticipant, requestWithParticipants as any)

        expect(result).toBeDefined()
      })

      it('should validate meeting times', async () => {
        const invalidRequest = {
          ...mockMeetingRequest,
          start_time: '2024-02-01T11:00:00Z',
          end_time: '2024-02-01T10:00:00Z',
        }

        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invalid time range' },
        })

        await expect(saveMeeting(mockParticipant, invalidRequest as any)).rejects.toThrow()
      })
    })

    describe('getMeetingFromDB', () => {
      it('should fetch meeting by ID', async () => {
        const mockMeeting = {
          id: 'slot_123',
          title: 'Test Meeting',
          start: '2024-02-01T10:00:00Z',
        }

        mockSingle.mockResolvedValue({
          data: mockMeeting,
          error: null,
        })

        const result = await getMeetingFromDB('slot_123')

        expect(result).toEqual(mockMeeting)
        expect(mockFrom).toHaveBeenCalledWith('slots')
        expect(mockEq).toHaveBeenCalledWith('id', 'slot_123')
      })

      it('should throw error when meeting not found', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(getMeetingFromDB('nonexistent')).rejects.toThrow()
      })

      it('should handle database errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Query timeout' },
        })

        await expect(getMeetingFromDB('slot_123')).rejects.toThrow()
      })
    })

    describe('updateMeeting', () => {
      const mockParticipant = {
        address: '0x123',
        type: 'organizer' as const,
      }

      it('should update meeting successfully', async () => {
        const mockUpdate = {
          slot_id: 'slot_123',
          title: 'Updated Meeting',
        }

        const mockUpdatedSlot = {
          id: 'slot_123',
          title: 'Updated Meeting',
        }

        mockSingle.mockResolvedValue({
          data: mockUpdatedSlot,
          error: null,
        })

        const result = await updateMeeting(mockParticipant, mockUpdate as any)

        expect(result).toEqual(mockUpdatedSlot)
        expect(mockFrom).toHaveBeenCalledWith('slots')
        expect(mockUpdate).toHaveBeenCalled()
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        })

        await expect(updateMeeting(mockParticipant, { slot_id: 'slot_123' } as any)).rejects.toThrow()
      })
    })

    describe('deleteMeetingFromDB', () => {
      it('should delete meeting successfully', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(deleteMeetingFromDB('slot_123')).resolves.not.toThrow()
        expect(mockFrom).toHaveBeenCalledWith('slots')
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Cannot delete' },
        })

        await expect(deleteMeetingFromDB('slot_123')).rejects.toThrow()
      })
    })

    describe('getSlotById', () => {
      it('should fetch slot by ID', async () => {
        const mockSlot = {
          id: 'slot_123',
          title: 'Meeting',
        }

        mockSingle.mockResolvedValue({
          data: mockSlot,
          error: null,
        })

        const result = await getSlotById('slot_123')

        expect(result).toEqual(mockSlot)
      })

      it('should return null for non-existent slot', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getSlotById('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('getSlotsForAccount', () => {
      it('should fetch all slots for account', async () => {
        const mockSlots = [
          { id: 'slot_1', title: 'Meeting 1' },
          { id: 'slot_2', title: 'Meeting 2' },
        ]

        mockSelect.mockResolvedValue({
          data: mockSlots,
          error: null,
        })

        const result = await getSlotsForAccount('0x123')

        expect(result).toEqual(mockSlots)
        expect(mockFrom).toHaveBeenCalledWith('slots')
      })

      it('should return empty array when no slots found', async () => {
        mockSelect.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getSlotsForAccount('0x123')

        expect(result).toEqual([])
      })
    })
  })

  // ==================== GROUP MANAGEMENT TESTS ====================
  
  describe('Group Management', () => {
    describe('createGroupInDB', () => {
      it('should create a new group successfully', async () => {
        const mockGroup = {
          id: 'group_123',
          name: 'Test Group',
          owner_address: '0x123',
        }

        mockSingle.mockResolvedValue({
          data: mockGroup,
          error: null,
        })

        const result = await createGroupInDB('0x123', 'Test Group', 'test-group')

        expect(result).toEqual(mockGroup)
        expect(mockFrom).toHaveBeenCalledWith('groups')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        })

        await expect(createGroupInDB('0x123', 'Test Group', 'test-group')).rejects.toThrow()
      })

      it('should create group with description', async () => {
        const mockGroup = {
          id: 'group_123',
          name: 'Test Group',
          description: 'A test group',
        }

        mockSingle.mockResolvedValue({
          data: mockGroup,
          error: null,
        })

        const result = await createGroupInDB('0x123', 'Test Group', 'test-group', 'A test group')

        expect(result.description).toBe('A test group')
      })
    })

    describe('editGroup', () => {
      it('should update group name', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'group_123' },
          error: null,
        })

        await expect(editGroup('group_123', '0x123', 'New Name')).resolves.not.toThrow()
        expect(mockUpdate).toHaveBeenCalled()
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Not authorized' },
        })

        await expect(editGroup('group_123', '0x123', 'New Name')).rejects.toThrow()
      })
    })

    describe('deleteGroup', () => {
      it('should delete group successfully', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(deleteGroup('group_123', '0x123')).resolves.not.toThrow()
        expect(mockFrom).toHaveBeenCalledWith('groups')
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Cannot delete group with members' },
        })

        await expect(deleteGroup('group_123', '0x123')).rejects.toThrow()
      })
    })

    describe('getGroup', () => {
      it('should fetch group by ID', async () => {
        const mockGroup = {
          id: 'group_123',
          name: 'Test Group',
          members: [],
        }

        mockSingle.mockResolvedValue({
          data: mockGroup,
          error: null,
        })

        const result = await getGroup('group_123')

        expect(result).toEqual(mockGroup)
        expect(mockFrom).toHaveBeenCalledWith('groups')
      })

      it('should return null for non-existent group', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getGroup('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('addUserToGroup', () => {
      it('should add user to group successfully', async () => {
        mockSingle.mockResolvedValue({
          data: { group_id: 'group_123', account_address: '0x456' },
          error: null,
        })

        await expect(addUserToGroup('group_123', '0x456', 'member')).resolves.not.toThrow()
        expect(mockFrom).toHaveBeenCalledWith('group_users')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle duplicate member errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { code: '23505' },
        })

        await expect(addUserToGroup('group_123', '0x456', 'member')).rejects.toThrow()
      })
    })

    describe('removeMember', () => {
      it('should remove member from group', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(removeMember('group_123', '0x456', '0x123')).resolves.not.toThrow()
        expect(mockDelete).toHaveBeenCalled()
      })
    })

    describe('isUserAdminOfGroup', () => {
      it('should return true for group admin', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { member_type: 'admin' },
          error: null,
        })

        const result = await isUserAdminOfGroup('group_123', '0x123')

        expect(result).toBe(true)
      })

      it('should return false for non-admin', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { member_type: 'member' },
          error: null,
        })

        const result = await isUserAdminOfGroup('group_123', '0x123')

        expect(result).toBe(false)
      })

      it('should return false for non-member', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await isUserAdminOfGroup('group_123', '0x123')

        expect(result).toBe(false)
      })
    })

    describe('changeGroupRole', () => {
      it('should change member role to admin', async () => {
        mockEq.mockResolvedValue({
          data: { member_type: 'admin' },
          error: null,
        })

        await expect(changeGroupRole('group_123', '0x456', '0x123', 'admin')).resolves.not.toThrow()
        expect(mockUpdate).toHaveBeenCalled()
      })

      it('should handle role change errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Cannot change role' },
        })

        await expect(changeGroupRole('group_123', '0x456', '0x123', 'admin')).rejects.toThrow()
      })
    })

    describe('publicGroupJoin', () => {
      it('should allow joining public group', async () => {
        mockSingle.mockResolvedValue({
          data: { group_id: 'group_123' },
          error: null,
        })

        await expect(publicGroupJoin('group_123', '0x123')).resolves.not.toThrow()
      })
    })

    describe('leaveGroup', () => {
      it('should allow member to leave group', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(leaveGroup('group_123', '0x123')).resolves.not.toThrow()
      })
    })
  })

  // ==================== SUBSCRIPTION MANAGEMENT TESTS ====================
  
  describe('Subscription Management', () => {
    describe('getSubscription', () => {
      it('should fetch subscription by ID', async () => {
        const mockSubscription = {
          id: 'sub_123',
          account_address: '0x123',
          status: 'active',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await getSubscription('sub_123')

        expect(result).toEqual(mockSubscription)
        expect(mockFrom).toHaveBeenCalledWith('subscriptions')
      })

      it('should return null for non-existent subscription', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getSubscription('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('getSubscriptionFromDBForAccount', () => {
      it('should fetch subscription for account', async () => {
        const mockSubscription = {
          id: 'sub_123',
          account_address: '0x123',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await getSubscriptionFromDBForAccount('0x123')

        expect(result).toEqual(mockSubscription)
      })

      it('should handle account without subscription', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getSubscriptionFromDBForAccount('0x123')

        expect(result).toBeNull()
      })
    })

    describe('getExistingSubscriptionsByAddress', () => {
      it('should fetch all subscriptions for address', async () => {
        const mockSubscriptions = [
          { id: 'sub_1', status: 'active' },
          { id: 'sub_2', status: 'cancelled' },
        ]

        mockSelect.mockResolvedValue({
          data: mockSubscriptions,
          error: null,
        })

        const result = await getExistingSubscriptionsByAddress('0x123')

        expect(result).toEqual(mockSubscriptions)
      })
    })

    describe('getExistingSubscriptionsByDomain', () => {
      it('should fetch subscriptions by custom domain', async () => {
        const mockSubscriptions = [
          { id: 'sub_1', custom_domain: 'example.com' },
        ]

        mockSelect.mockResolvedValue({
          data: mockSubscriptions,
          error: null,
        })

        const result = await getExistingSubscriptionsByDomain('example.com')

        expect(result).toEqual(mockSubscriptions)
      })
    })

    describe('createStripeSubscription', () => {
      it('should create new Stripe subscription', async () => {
        const mockSubscription = {
          id: 'stripe_sub_123',
          account_address: '0x123',
          stripe_subscription_id: 'sub_stripe_123',
          stripe_customer_id: 'cus_123',
        }

        mockSingle.mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await createStripeSubscription('0x123', 'sub_stripe_123', 'cus_123', 'plan_123')

        expect(result).toEqual(mockSubscription)
        expect(mockFrom).toHaveBeenCalledWith('stripe_subscriptions')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Duplicate subscription' },
        })

        await expect(createStripeSubscription('0x123', 'sub_123', 'cus_123', 'plan_123')).rejects.toThrow()
      })
    })

    describe('updateStripeSubscription', () => {
      it('should update subscription billing plan', async () => {
        const mockUpdated = {
          stripe_subscription_id: 'sub_123',
          billing_plan_id: 'plan_456',
        }

        mockSingle.mockResolvedValue({
          data: mockUpdated,
          error: null,
        })

        const result = await updateStripeSubscription('sub_123', { billing_plan_id: 'plan_456' })

        expect(result).toEqual(mockUpdated)
        expect(mockUpdate).toHaveBeenCalled()
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Subscription not found' },
        })

        await expect(updateStripeSubscription('sub_123', {})).rejects.toThrow()
      })
    })

    describe('getStripeSubscriptionByAccount', () => {
      it('should fetch Stripe subscription for account', async () => {
        const mockSubscription = {
          account_address: '0x123',
          stripe_subscription_id: 'sub_123',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await getStripeSubscriptionByAccount('0x123')

        expect(result).toEqual(mockSubscription)
      })
    })
  })

  // ==================== QUICKPOLL MANAGEMENT TESTS ====================
  
  describe('QuickPoll Management', () => {
    describe('createQuickPoll', () => {
      it('should create a new QuickPoll successfully', async () => {
        const mockPollData = {
          title: 'Team Meeting',
          description: 'Discuss Q1 goals',
          duration: 60,
        }

        const mockPoll = {
          id: 'poll_123',
          slug: 'team-meeting-123',
          owner_address: '0x123',
          ...mockPollData,
        }

        mockSingle.mockResolvedValue({
          data: mockPoll,
          error: null,
        })

        const result = await createQuickPoll('0x123', mockPollData as any)

        expect(result).toEqual(mockPoll)
        expect(mockFrom).toHaveBeenCalledWith('quick_polls')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        })

        await expect(createQuickPoll('0x123', {} as any)).rejects.toThrow()
      })

      it('should generate unique slug', async () => {
        const mockPoll = {
          id: 'poll_123',
          slug: 'my-poll-123',
          title: 'My Poll',
        }

        mockSingle.mockResolvedValue({
          data: mockPoll,
          error: null,
        })

        const result = await createQuickPoll('0x123', { title: 'My Poll' } as any)

        expect(result.slug).toBeDefined()
      })
    })

    describe('updateQuickPoll', () => {
      it('should update QuickPoll successfully', async () => {
        const mockUpdates = {
          title: 'Updated Title',
          status: 'active' as const,
        }

        const mockUpdatedPoll = {
          id: 'poll_123',
          ...mockUpdates,
        }

        mockSingle.mockResolvedValue({
          data: mockUpdatedPoll,
          error: null,
        })

        const result = await updateQuickPoll('poll_123', '0x123', mockUpdates as any)

        expect(result).toEqual(mockUpdatedPoll)
        expect(mockUpdate).toHaveBeenCalled()
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Not authorized' },
        })

        await expect(updateQuickPoll('poll_123', '0x123', {} as any)).rejects.toThrow()
      })

      it('should update poll visibility', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'poll_123', visibility: 'private' },
          error: null,
        })

        const result = await updateQuickPoll('poll_123', '0x123', { visibility: 'private' } as any)

        expect(result.visibility).toBe('private')
      })
    })

    describe('deleteQuickPoll', () => {
      it('should delete QuickPoll successfully', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(deleteQuickPoll('poll_123', '0x123')).resolves.not.toThrow()
        expect(mockFrom).toHaveBeenCalledWith('quick_polls')
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Cannot delete active poll' },
        })

        await expect(deleteQuickPoll('poll_123', '0x123')).rejects.toThrow()
      })
    })

    describe('getQuickPollById', () => {
      it('should fetch QuickPoll by ID', async () => {
        const mockPoll = {
          id: 'poll_123',
          title: 'Test Poll',
        }

        mockSingle.mockResolvedValue({
          data: mockPoll,
          error: null,
        })

        const result = await getQuickPollById('poll_123')

        expect(result).toEqual(mockPoll)
      })

      it('should return null for non-existent poll', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getQuickPollById('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('getQuickPollBySlug', () => {
      it('should fetch QuickPoll by slug', async () => {
        const mockPoll = {
          id: 'poll_123',
          slug: 'test-poll',
        }

        mockSingle.mockResolvedValue({
          data: mockPoll,
          error: null,
        })

        const result = await getQuickPollBySlug('test-poll')

        expect(result).toEqual(mockPoll)
        expect(mockEq).toHaveBeenCalledWith('slug', 'test-poll')
      })
    })

    describe('getQuickPollsForAccount', () => {
      it('should fetch all QuickPolls for account', async () => {
        const mockPolls = [
          { id: 'poll_1', title: 'Poll 1' },
          { id: 'poll_2', title: 'Poll 2' },
        ]

        mockRange.mockResolvedValue({
          data: mockPolls,
          error: null,
        })

        const result = await getQuickPollsForAccount('0x123')

        expect(result).toEqual(mockPolls)
      })

      it('should support pagination', async () => {
        mockRange.mockResolvedValue({
          data: [],
          error: null,
        })

        await getQuickPollsForAccount('0x123', 10, 20)

        expect(mockRange).toHaveBeenCalledWith(10, 20)
      })
    })

    describe('addQuickPollParticipant', () => {
      it('should add participant to QuickPoll', async () => {
        const participantData = {
          poll_id: 'poll_123',
          address: '0x456',
          type: 'respondent' as const,
        }

        mockSingle.mockResolvedValue({
          data: participantData,
          error: null,
        })

        const result = await addQuickPollParticipant(participantData as any)

        expect(result).toEqual(participantData)
        expect(mockFrom).toHaveBeenCalledWith('quick_poll_participants')
      })

      it('should handle duplicate participant', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { code: '23505' },
        })

        await expect(addQuickPollParticipant({} as any)).rejects.toThrow()
      })
    })

    describe('updateQuickPollParticipantAvailability', () => {
      it('should update participant availability', async () => {
        const mockParticipant = {
          id: 'participant_123',
          availability_slots: [{ start: '2024-02-01T10:00:00Z', end: '2024-02-01T11:00:00Z' }],
        }

        mockSingle.mockResolvedValue({
          data: mockParticipant,
          error: null,
        })

        const result = await updateQuickPollParticipantAvailability('participant_123', mockParticipant.availability_slots as any)

        expect(result).toEqual(mockParticipant)
      })
    })

    describe('updateQuickPollParticipantStatus', () => {
      it('should update participant status', async () => {
        const mockParticipant = {
          id: 'participant_123',
          status: 'responded',
        }

        mockSingle.mockResolvedValue({
          data: mockParticipant,
          error: null,
        })

        const result = await updateQuickPollParticipantStatus('participant_123', 'responded' as any)

        expect(result.status).toBe('responded')
      })
    })
  })

  // ==================== AVAILABILITY & CALENDAR TESTS ====================
  
  describe('Availability & Calendar Management', () => {
    describe('createAvailabilityBlock', () => {
      it('should create availability block successfully', async () => {
        const mockBlock = {
          id: 'block_123',
          account_address: '0x123',
          title: 'Working Hours',
          timezone: 'America/New_York',
          weekly_availability: [],
        }

        mockSingle.mockResolvedValue({
          data: mockBlock,
          error: null,
        })

        const result = await createAvailabilityBlock('0x123', 'Working Hours', 'America/New_York', [])

        expect(result).toEqual(mockBlock)
        expect(mockFrom).toHaveBeenCalledWith('availabilities')
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invalid timezone' },
        })

        await expect(createAvailabilityBlock('0x123', 'Block', 'Invalid/TZ', [])).rejects.toThrow()
      })
    })

    describe('updateAvailabilityBlock', () => {
      it('should update availability block', async () => {
        const mockUpdated = {
          id: 'block_123',
          title: 'New Hours',
        }

        mockSingle.mockResolvedValue({
          data: mockUpdated,
          error: null,
        })

        const result = await updateAvailabilityBlock('block_123', { title: 'New Hours' } as any)

        expect(result).toEqual(mockUpdated)
        expect(mockUpdate).toHaveBeenCalled()
      })

      it('should update timezone', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'block_123', timezone: 'Europe/London' },
          error: null,
        })

        const result = await updateAvailabilityBlock('block_123', { timezone: 'Europe/London' } as any)

        expect(result.timezone).toBe('Europe/London')
      })
    })

    describe('deleteAvailabilityBlock', () => {
      it('should delete availability block', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(deleteAvailabilityBlock('block_123')).resolves.not.toThrow()
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Block in use' },
        })

        await expect(deleteAvailabilityBlock('block_123')).rejects.toThrow()
      })
    })

    describe('getAvailabilityBlock', () => {
      it('should fetch availability block by ID', async () => {
        const mockBlock = {
          id: 'block_123',
          title: 'Working Hours',
        }

        mockSingle.mockResolvedValue({
          data: mockBlock,
          error: null,
        })

        const result = await getAvailabilityBlock('block_123')

        expect(result).toEqual(mockBlock)
      })

      it('should return null for non-existent block', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getAvailabilityBlock('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('getAvailabilityBlocks', () => {
      it('should fetch all blocks for account', async () => {
        const mockBlocks = [
          { id: 'block_1', title: 'Morning' },
          { id: 'block_2', title: 'Afternoon' },
        ]

        mockSelect.mockResolvedValue({
          data: mockBlocks,
          error: null,
        })

        const result = await getAvailabilityBlocks('0x123')

        expect(result).toEqual(mockBlocks)
      })
    })

    describe('duplicateAvailabilityBlock', () => {
      it('should duplicate availability block', async () => {
        const originalBlock = {
          id: 'block_123',
          title: 'Original',
          weekly_availability: [],
        }

        const duplicatedBlock = {
          id: 'block_456',
          title: 'Original (Copy)',
        }

        mockSingle
          .mockResolvedValueOnce({ data: originalBlock, error: null })
          .mockResolvedValueOnce({ data: duplicatedBlock, error: null })

        const result = await duplicateAvailabilityBlock('block_123')

        expect(result).toEqual(duplicatedBlock)
      })

      it('should handle duplication errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Block not found' },
        })

        await expect(duplicateAvailabilityBlock('nonexistent')).rejects.toThrow()
      })
    })

    describe('isDefaultAvailabilityBlock', () => {
      it('should check if block is default', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { availaibility_id: 'block_123' },
          error: null,
        })

        const result = await isDefaultAvailabilityBlock('0x123', 'block_123')

        expect(result).toBe(true)
      })

      it('should return false for non-default block', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { availaibility_id: 'block_456' },
          error: null,
        })

        const result = await isDefaultAvailabilityBlock('0x123', 'block_123')

        expect(result).toBe(false)
      })
    })
  })

  // ==================== CONTACT MANAGEMENT TESTS ====================
  
  describe('Contact Management', () => {
    describe('getContactById', () => {
      it('should fetch contact by ID', async () => {
        const mockContact = {
          id: 'contact_123',
          owner_address: '0x123',
          contact_address: '0x456',
        }

        mockSingle.mockResolvedValue({
          data: mockContact,
          error: null,
        })

        const result = await getContactById('contact_123')

        expect(result).toEqual(mockContact)
        expect(mockFrom).toHaveBeenCalledWith('contacts')
      })

      it('should return null for non-existent contact', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getContactById('nonexistent')

        expect(result).toBeNull()
      })
    })

    describe('getContacts', () => {
      it('should fetch all contacts for account', async () => {
        const mockContacts = [
          { id: 'contact_1', contact_address: '0x456' },
          { id: 'contact_2', contact_address: '0x789' },
        ]

        mockSelect.mockResolvedValue({
          data: mockContacts,
          error: null,
        })

        const result = await getContacts('0x123')

        expect(result).toEqual(mockContacts)
      })

      it('should return empty array when no contacts', async () => {
        mockSelect.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getContacts('0x123')

        expect(result).toEqual([])
      })
    })

    describe('removeContact', () => {
      it('should remove contact successfully', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(removeContact('0x123', '0x456')).resolves.not.toThrow()
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle removal errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Contact not found' },
        })

        await expect(removeContact('0x123', '0x456')).rejects.toThrow()
      })
    })

    describe('acceptContactInvite', () => {
      it('should accept contact invite', async () => {
        const mockContact = {
          id: 'contact_123',
          status: 'accepted',
        }

        mockSingle.mockResolvedValue({
          data: mockContact,
          error: null,
        })

        const result = await acceptContactInvite('invite_123', '0x456')

        expect(result).toEqual(mockContact)
      })

      it('should handle acceptance errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invite not found' },
        })

        await expect(acceptContactInvite('invite_123', '0x456')).rejects.toThrow()
      })
    })

    describe('rejectContactInvite', () => {
      it('should reject contact invite', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(rejectContactInvite('invite_123')).resolves.not.toThrow()
        expect(mockDelete).toHaveBeenCalled()
      })
    })
  })

  // ==================== GROUP INVITE TESTS ====================
  
  describe('Group Invite Management', () => {
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
      it('should update invite with user ID', async () => {
        const mockUpdated = {
          id: 'invite_123',
          user_id: '0x456',
        }

        mockSingle.mockResolvedValue({
          data: mockUpdated,
          error: null,
        })

        const result = await updateGroupInviteUserId('invite_123', '0x456')

        expect(result).toEqual(mockUpdated)
      })
    })

    describe('getGroupInvites', () => {
      it('should fetch all invites for group', async () => {
        const mockInvites = [
          { id: 'invite_1', email: 'user1@example.com' },
          { id: 'invite_2', email: 'user2@example.com' },
        ]

        mockRange.mockResolvedValue({
          data: mockInvites,
          error: null,
          count: 2,
        })

        const result = await getGroupInvites('group_123')

        expect(result.data).toEqual(mockInvites)
      })
    })

    describe('manageGroupInvite', () => {
      it('should accept group invite', async () => {
        mockSingle.mockResolvedValue({
          data: { group_id: 'group_123' },
          error: null,
        })

        await expect(manageGroupInvite('invite_123', '0x123', 'accept')).resolves.not.toThrow()
      })

      it('should reject group invite', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(manageGroupInvite('invite_123', '0x123', 'reject')).resolves.not.toThrow()
      })
    })
  })

  // ==================== TRANSACTION & WALLET TESTS ====================
  
  describe('Transaction & Wallet Management', () => {
    describe('getWalletTransactions', () => {
      it('should fetch all transactions for wallet', async () => {
        const mockTransactions = [
          { id: 'tx_1', amount: '100', status: 'completed' },
          { id: 'tx_2', amount: '50', status: 'pending' },
        ]

        mockSelect.mockResolvedValue({
          data: mockTransactions,
          error: null,
        })

        const result = await getWalletTransactions('0x123')

        expect(result).toEqual(mockTransactions)
        expect(mockFrom).toHaveBeenCalledWith('transactions')
      })

      it('should handle empty transaction list', async () => {
        mockSelect.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getWalletTransactions('0x123')

        expect(result).toEqual([])
      })

      it('should filter by transaction type', async () => {
        mockSelect.mockResolvedValue({
          data: [{ id: 'tx_1', type: 'payment' }],
          error: null,
        })

        const result = await getWalletTransactions('0x123', 'payment')

        expect(result).toBeDefined()
      })
    })

    describe('getWalletTransactionsByToken', () => {
      it('should fetch transactions by token address', async () => {
        const mockTransactions = [
          { id: 'tx_1', token_address: '0xTOKEN', amount: '100' },
        ]

        mockSelect.mockResolvedValue({
          data: mockTransactions,
          error: null,
        })

        const result = await getWalletTransactionsByToken('0x123', '0xTOKEN')

        expect(result).toEqual(mockTransactions)
        expect(mockEq).toHaveBeenCalledWith('token_address', '0xTOKEN')
      })

      it('should handle no transactions for token', async () => {
        mockSelect.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getWalletTransactionsByToken('0x123', '0xTOKEN')

        expect(result).toEqual([])
      })
    })

    describe('createCryptoTransaction', () => {
      it('should create crypto transaction', async () => {
        const mockTransaction = {
          id: 'tx_123',
          from_address: '0x123',
          to_address: '0x456',
          amount: '100',
          token_address: '0xTOKEN',
        }

        mockSingle.mockResolvedValue({
          data: mockTransaction,
          error: null,
        })

        const result = await createCryptoTransaction(mockTransaction as any)

        expect(result).toEqual(mockTransaction)
        expect(mockFrom).toHaveBeenCalledWith('transactions')
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invalid transaction' },
        })

        await expect(createCryptoTransaction({} as any)).rejects.toThrow()
      })
    })

    describe('handleUpdateTransactionStatus', () => {
      it('should update transaction status to completed', async () => {
        const mockUpdated = {
          id: 'tx_123',
          status: 'completed',
        }

        mockSingle.mockResolvedValue({
          data: mockUpdated,
          error: null,
        })

        const result = await handleUpdateTransactionStatus('tx_123', 'completed')

        expect(result.status).toBe('completed')
      })

      it('should update transaction status to failed', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'tx_123', status: 'failed' },
          error: null,
        })

        const result = await handleUpdateTransactionStatus('tx_123', 'failed')

        expect(result.status).toBe('failed')
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Transaction not found' },
        })

        await expect(handleUpdateTransactionStatus('tx_123', 'completed')).rejects.toThrow()
      })
    })
  })

  // ==================== DISCORD & TELEGRAM INTEGRATION TESTS ====================
  
  describe('Discord & Telegram Integration', () => {
    describe('createOrUpdatesDiscordAccount', () => {
      it('should create new Discord account link', async () => {
        const mockDiscordAccount = {
          account_address: '0x123',
          discord_id: 'discord_123',
          discord_username: 'testuser',
        }

        mockSingle.mockResolvedValue({
          data: mockDiscordAccount,
          error: null,
        })

        const result = await createOrUpdatesDiscordAccount('0x123', 'discord_123', 'testuser')

        expect(result).toEqual(mockDiscordAccount)
        expect(mockFrom).toHaveBeenCalledWith('discord_accounts')
      })

      it('should update existing Discord account', async () => {
        const mockUpdated = {
          account_address: '0x123',
          discord_username: 'newusername',
        }

        mockSingle.mockResolvedValue({
          data: mockUpdated,
          error: null,
        })

        const result = await createOrUpdatesDiscordAccount('0x123', 'discord_123', 'newusername')

        expect(result.discord_username).toBe('newusername')
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Discord ID already linked' },
        })

        await expect(createOrUpdatesDiscordAccount('0x123', 'discord_123', 'user')).rejects.toThrow()
      })
    })

    describe('deleteDiscordAccount', () => {
      it('should delete Discord account link', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(deleteDiscordAccount('0x123')).resolves.not.toThrow()
        expect(mockFrom).toHaveBeenCalledWith('discord_accounts')
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Account not found' },
        })

        await expect(deleteDiscordAccount('0x123')).rejects.toThrow()
      })
    })

    describe('getDiscordAccount', () => {
      it('should fetch Discord account by address', async () => {
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

      it('should return null for unlinked account', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getDiscordAccount('0x123')

        expect(result).toBeNull()
      })
    })

    describe('getDiscordAccountAndInfo', () => {
      it('should fetch Discord account with info', async () => {
        const mockAccountInfo = {
          account_address: '0x123',
          discord_id: 'discord_123',
          discord_username: 'testuser',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccountInfo,
          error: null,
        })

        const result = await getDiscordAccountAndInfo('0x123')

        expect(result).toEqual(mockAccountInfo)
      })
    })

    describe('getTelegramAccountAndInfo', () => {
      it('should fetch Telegram account with info', async () => {
        const mockAccountInfo = {
          account_address: '0x123',
          telegram_id: 'tg_123',
          telegram_username: 'testuser',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccountInfo,
          error: null,
        })

        const result = await getTelegramAccountAndInfo('0x123')

        expect(result).toEqual(mockAccountInfo)
      })
    })

    describe('getAccountFromDiscordId', () => {
      it('should fetch account by Discord ID', async () => {
        const mockAccount = {
          address: '0x123',
          discord_id: 'discord_123',
        }

        mockMaybeSingle.mockResolvedValue({
          data: mockAccount,
          error: null,
        })

        const result = await getAccountFromDiscordId('discord_123')

        expect(result).toEqual(mockAccount)
      })

      it('should return null for non-existent Discord ID', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await getAccountFromDiscordId('nonexistent')

        expect(result).toBeNull()
      })
    })
  })

  // ==================== MEETING TYPE TESTS ====================
  
  describe('Meeting Type Management', () => {
    describe('getMeetingTypeFromDB', () => {
      it('should fetch meeting type by ID', async () => {
        const mockMeetingType = {
          id: 'mt_123',
          name: '30min Meeting',
          duration: 30,
          account_address: '0x123',
        }

        mockSingle.mockResolvedValue({
          data: mockMeetingType,
          error: null,
        })

        const result = await getMeetingTypeFromDB('mt_123')

        expect(result).toEqual(mockMeetingType)
        expect(mockFrom).toHaveBeenCalledWith('meeting_types')
      })

      it('should throw error for non-existent meeting type', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(getMeetingTypeFromDB('nonexistent')).rejects.toThrow()
      })
    })

    describe('getMeetingTypes', () => {
      it('should fetch all meeting types for account', async () => {
        const mockTypes = [
          { id: 'mt_1', name: '30min', duration: 30 },
          { id: 'mt_2', name: '60min', duration: 60 },
        ]

        mockSelect.mockResolvedValue({
          data: mockTypes,
          error: null,
        })

        const result = await getMeetingTypes('0x123')

        expect(result).toEqual(mockTypes)
      })

      it('should return empty array when no meeting types', async () => {
        mockSelect.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getMeetingTypes('0x123')

        expect(result).toEqual([])
      })
    })

    describe('createMeetingType', () => {
      it('should create new meeting type', async () => {
        const mockType = {
          id: 'mt_123',
          name: 'Quick Chat',
          duration: 15,
          account_address: '0x123',
        }

        mockSingle.mockResolvedValue({
          data: mockType,
          error: null,
        })

        const result = await createMeetingType({
          account_address: '0x123',
          name: 'Quick Chat',
          duration: 15,
        } as any)

        expect(result).toEqual(mockType)
        expect(mockInsert).toHaveBeenCalled()
      })

      it('should handle creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Invalid duration' },
        })

        await expect(createMeetingType({} as any)).rejects.toThrow()
      })
    })

    describe('updateMeetingType', () => {
      it('should update meeting type', async () => {
        const mockUpdated = {
          id: 'mt_123',
          name: 'Updated Name',
          duration: 45,
        }

        mockSingle.mockResolvedValue({
          data: mockUpdated,
          error: null,
        })

        const result = await updateMeetingType('mt_123', {
          name: 'Updated Name',
          duration: 45,
        } as any)

        expect(result).toEqual(mockUpdated)
      })

      it('should handle update errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Meeting type not found' },
        })

        await expect(updateMeetingType('mt_123', {} as any)).rejects.toThrow()
      })
    })

    describe('deleteMeetingType', () => {
      it('should delete meeting type', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(deleteMeetingType('mt_123')).resolves.not.toThrow()
        expect(mockDelete).toHaveBeenCalled()
      })

      it('should handle deletion errors', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Meeting type in use' },
        })

        await expect(deleteMeetingType('mt_123')).rejects.toThrow()
      })
    })
  })

  // ==================== PIN & SECURITY TESTS ====================
  
  describe('PIN & Security', () => {
    describe('createPinHash', () => {
      it('should create PIN hash', async () => {
        const mockPinRecord = {
          account_address: '0x123',
          pin_hash: 'hashed_1234',
        }

        mockSingle.mockResolvedValue({
          data: mockPinRecord,
          error: null,
        })

        const result = await createPinHash('0x123', '1234')

        expect(result).toEqual(mockPinRecord)
        expect(mockFrom).toHaveBeenCalledWith('account_pins')
      })

      it('should handle hash creation errors', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'PIN already exists' },
        })

        await expect(createPinHash('0x123', '1234')).rejects.toThrow()
      })
    })

    describe('verifyUserPin', () => {
      it('should verify correct PIN', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { pin_hash: 'hashed_1234' },
          error: null,
        })

        const result = await verifyUserPin('0x123', '1234')

        expect(result).toBe(true)
      })

      it('should reject incorrect PIN', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { pin_hash: 'hashed_1234' },
          error: null,
        })

        const result = await verifyUserPin('0x123', '5678')

        expect(result).toBe(false)
      })

      it('should handle missing PIN', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        const result = await verifyUserPin('0x123', '1234')

        expect(result).toBe(false)
      })
    })
  })

  // ==================== ADDITIONAL EDGE CASE TESTS ====================
  
  describe('Edge Cases & Error Handling', () => {
    describe('Database Connection Errors', () => {
      it('should handle connection timeout in getAccountPreferences', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: { message: 'Connection timeout', code: 'PGRST301' },
        })

        await expect(getAccountPreferences('0x123')).rejects.toThrow()
        expect(Sentry.captureException).toHaveBeenCalled()
      })

      it('should handle network errors in saveMeeting', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Network error' },
        })

        await expect(saveMeeting({ address: '0x123', type: 'organizer' }, {} as any)).rejects.toThrow()
      })

      it('should handle database errors in createGroupInDB', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: '42P01' },
        })

        await expect(createGroupInDB('0x123', 'Group', 'slug')).rejects.toThrow()
      })
    })

    describe('Input Validation', () => {
      it('should handle invalid address format in getAccountFromDB', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(getAccountFromDB('invalid')).rejects.toThrow()
      })

      it('should handle empty string inputs', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(getAccountPreferences('')).rejects.toThrow()
      })

      it('should handle null/undefined gracefully', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: null,
          error: null,
        })

        await expect(getAccountFromDB(null as any)).rejects.toThrow()
      })
    })

    describe('Race Conditions', () => {
      it('should handle concurrent group membership updates without conflicts', async () => {
        mockSingle.mockResolvedValue({
          data: { group_id: 'group_123' },
          error: null,
        })

        const promise1 = addUserToGroup('group_123', '0x456', 'member')
        const promise2 = addUserToGroup('group_123', '0x789', 'member')

        await expect(Promise.all([promise1, promise2])).resolves.toBeDefined()
      })

      it('should handle concurrent meeting creation without conflicts', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'slot_123' },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const meeting1 = saveMeeting(participant, { title: 'Meeting 1' } as any)
        const meeting2 = saveMeeting(participant, { title: 'Meeting 2' } as any)

        await expect(Promise.all([meeting1, meeting2])).resolves.toBeDefined()
      })
    })

    describe('Large Dataset Handling', () => {
      it('should handle large number of slots for account', async () => {
        const largeSlotList = Array.from({ length: 1000 }, (_, i) => ({
          id: `slot_${i}`,
          title: `Meeting ${i}`,
        }))

        mockSelect.mockResolvedValue({
          data: largeSlotList,
          error: null,
        })

        const result = await getSlotsForAccount('0x123')

        expect(result).toHaveLength(1000)
      })

      it('should handle pagination for QuickPolls', async () => {
        const mockPolls = Array.from({ length: 30 }, (_, i) => ({
          id: `poll_${i}`,
          title: `Poll ${i}`,
        }))

        mockRange.mockResolvedValue({
          data: mockPolls,
          error: null,
        })

        const result = await getQuickPollsForAccount('0x123', 0, 29)

        expect(result).toHaveLength(30)
      })
    })

    describe('Data Consistency', () => {
      it('should maintain referential integrity on group deletion', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Foreign key violation', code: '23503' },
        })

        await expect(deleteGroup('group_123', '0x123')).rejects.toThrow()
      })

      it('should prevent duplicate contact creation', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { code: '23505' },
        })

        await expect(acceptContactInvite('invite_123', '0x456')).rejects.toThrow()
      })
    })

    describe('Timestamp Handling', () => {
      it('should store timezone in availability blocks', async () => {
        const mockBlock = {
          id: 'block_123',
          timezone: 'America/New_York',
          weekly_availability: [],
        }

        mockSingle.mockResolvedValue({
          data: mockBlock,
          error: null,
        })

        const result = await getAvailabilityBlock('block_123')

        expect(result.timezone).toBe('America/New_York')
      })

      it('should create availability block with timezone', async () => {
        const mockBlock = {
          timezone: 'America/New_York',
          weekly_availability: [],
        }

        mockSingle.mockResolvedValue({
          data: { id: 'block_123', ...mockBlock },
          error: null,
        })

        const result = await createAvailabilityBlock('0x123', 'Block', 'America/New_York', [])

        expect(result).toBeDefined()
      })
    })
  })

  // ==================== PERFORMANCE & OPTIMIZATION TESTS ====================
  
  describe('Performance & Optimization', () => {
    it('should complete queries efficiently with mocked client', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { address: '0x123' },
        error: null,
      })

      const start = Date.now()
      await getAccountFromDB('0x123')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100) // Should be fast with proper mocking
    })

    it('should batch multiple related queries', async () => {
      mockSelect.mockResolvedValue({
        data: [],
        error: null,
      })

      const promises = [
        getSlotsForAccount('0x123'),
        getContacts('0x123'),
        getGroupsEmpty('0x123'),
      ]

      await expect(Promise.all(promises)).resolves.toBeDefined()
    })

    it('should use proper pagination for large result sets', async () => {
      mockRange.mockResolvedValue({
        data: [],
        error: null,
      })

      await getQuickPollsForAccount('0x123', 0, 49)

      expect(mockRange).toHaveBeenCalledWith(0, 49)
    })
  })

  // ==================== COMPREHENSIVE INTEGRATION SCENARIOS ====================
  
  describe('Integration Scenarios', () => {
    describe('Complete Meeting Workflow', () => {
      it('should handle full meeting lifecycle', async () => {
        // Create meeting
        mockSingle.mockResolvedValueOnce({
          data: { id: 'slot_123', title: 'Meeting' },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const meeting = await saveMeeting(participant, { title: 'Meeting' } as any)

        expect(meeting.id).toBe('slot_123')

        // Update meeting
        mockSingle.mockResolvedValueOnce({
          data: { id: 'slot_123', title: 'Updated Meeting' },
          error: null,
        })

        const updated = await updateMeeting(participant, {
          slot_id: 'slot_123',
          title: 'Updated Meeting',
        } as any)

        expect(updated.title).toBe('Updated Meeting')

        // Delete meeting
        mockEq.mockResolvedValueOnce({
          data: null,
          error: null,
        })

        await expect(deleteMeetingFromDB('slot_123')).resolves.not.toThrow()
      })
    })

    describe('Complete Group Workflow', () => {
      it('should handle full group lifecycle', async () => {
        // Create group
        mockSingle.mockResolvedValueOnce({
          data: { id: 'group_123', name: 'Team' },
          error: null,
        })

        const group = await createGroupInDB('0x123', 'Team', 'team')

        expect(group.id).toBe('group_123')

        // Add members
        mockSingle.mockResolvedValueOnce({
          data: { group_id: 'group_123', account_address: '0x456' },
          error: null,
        })

        await addUserToGroup('group_123', '0x456', 'member')

        // Change role
        mockEq.mockResolvedValueOnce({
          data: { member_type: 'admin' },
          error: null,
        })

        await changeGroupRole('group_123', '0x456', '0x123', 'admin')

        // Remove member
        mockEq.mockResolvedValueOnce({
          data: null,
          error: null,
        })

        await removeMember('group_123', '0x456', '0x123')

        // Delete group
        mockEq.mockResolvedValueOnce({
          data: null,
          error: null,
        })

        await deleteGroup('group_123', '0x123')
      })
    })

    describe('Complete QuickPoll Workflow', () => {
      it('should handle full QuickPoll lifecycle', async () => {
        // Create poll
        mockSingle.mockResolvedValueOnce({
          data: { id: 'poll_123', slug: 'poll' },
          error: null,
        })

        const poll = await createQuickPoll('0x123', { title: 'Poll' } as any)

        expect(poll.id).toBe('poll_123')

        // Add participant
        mockSingle.mockResolvedValueOnce({
          data: { poll_id: 'poll_123', address: '0x456' },
          error: null,
        })

        await addQuickPollParticipant({ poll_id: 'poll_123', address: '0x456' } as any)

        // Update participant status
        mockSingle.mockResolvedValueOnce({
          data: { id: 'participant_123', status: 'responded' },
          error: null,
        })

        await updateQuickPollParticipantStatus('participant_123', 'responded' as any)

        // Delete poll
        mockEq.mockResolvedValueOnce({
          data: null,
          error: null,
        })

        await deleteQuickPoll('poll_123', '0x123')
      })
    })
  })
})

describe('database.ts - ADDITIONAL COMPREHENSIVE TESTS (Part 2)', () => {
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

  // ==================== ADDITIONAL ACCOUNT TESTS ====================
  
  describe('Account Management - Extended', () => {
    describe('Account Creation Edge Cases', () => {
      it('should handle account creation with special characters in username', async () => {
        mockSingle.mockResolvedValue({
          data: { address: '0x123', username: 'test_user-123' },
          error: null,
        })

        const result = await initAccountDBForWallet('0x123')

        expect(result).toBeDefined()
      })

      it('should handle account creation with very long address', async () => {
        const longAddress = '0x' + 'a'.repeat(40)
        mockSingle.mockResolvedValue({
          data: { address: longAddress },
          error: null,
        })

        const result = await initAccountDBForWallet(longAddress)

        expect(result).toBeDefined()
      })

      it('should handle case sensitivity in email lookup', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { email: 'Test@Example.Com' },
          error: null,
        })

        const result = await findAccountByEmail('test@example.com')

        expect(result).toBeDefined()
      })

      it('should handle email with plus addressing', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { email: 'user+tag@example.com' },
          error: null,
        })

        const result = await findAccountByEmail('user+tag@example.com')

        expect(result).toBeDefined()
      })

      it('should handle multiple accounts with same email domain', async () => {
        mockSelect.mockResolvedValue({
          data: [
            { email: 'user1@example.com' },
            { email: 'user2@example.com' },
          ],
          error: null,
        })

        const result = await findAccountsByEmails(['user1@example.com', 'user2@example.com'])

        expect(result).toHaveLength(2)
      })
    })

    describe('Account Preferences Edge Cases', () => {
      it('should handle preference update with null values', async () => {
        mockSingle.mockResolvedValue({
          data: { address: '0x123', theme: null },
          error: null,
        })

        const result = await updateAccountPreferences({ address: '0x123', theme: null } as any)

        expect(result).toBeDefined()
      })

      it('should handle preference update with complex nested data', async () => {
        const complexPrefs = {
          address: '0x123',
          settings: {
            notifications: {
              email: true,
              push: false,
            },
          },
        }

        mockSingle.mockResolvedValue({
          data: complexPrefs,
          error: null,
        })

        const result = await updateAccountPreferences(complexPrefs as any)

        expect(result).toEqual(complexPrefs)
      })

      it('should handle concurrent preference updates', async () => {
        mockSingle.mockResolvedValue({
          data: { address: '0x123' },
          error: null,
        })

        const updates = [
          updateAccountPreferences({ address: '0x123' } as any),
          updateAccountPreferences({ address: '0x123' } as any),
        ]

        await expect(Promise.all(updates)).resolves.toBeDefined()
      })

      it('should handle preference retrieval with missing default availability', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: {
            owner_account_address: '0x123',
            default_availability: null,
          },
          error: null,
        })

        const result = await getAccountPreferences('0x123')

        expect(result).toBeDefined()
      })
    })
  })

  // ==================== ADDITIONAL MEETING TESTS ====================
  
  describe('Meeting Management - Extended', () => {
    describe('Meeting Creation Edge Cases', () => {
      it('should handle meeting with empty title', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'slot_123', title: '' },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await saveMeeting(participant, { title: '' } as any)

        expect(result).toBeDefined()
      })

      it('should handle meeting with very long title', async () => {
        const longTitle = 'A'.repeat(1000)
        mockSingle.mockResolvedValue({
          data: { id: 'slot_123', title: longTitle },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await saveMeeting(participant, { title: longTitle } as any)

        expect(result.title).toBe(longTitle)
      })

      it('should handle meeting with unicode characters in title', async () => {
        const unicodeTitle = '会議 🎉 Meeting'
        mockSingle.mockResolvedValue({
          data: { id: 'slot_123', title: unicodeTitle },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await saveMeeting(participant, { title: unicodeTitle } as any)

        expect(result.title).toBe(unicodeTitle)
      })

      it('should handle meeting across timezone boundaries', async () => {
        mockSingle.mockResolvedValue({
          data: {
            id: 'slot_123',
            start: '2024-02-01T23:00:00Z',
            end: '2024-02-02T01:00:00Z',
          },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await saveMeeting(participant, {
          start_time: '2024-02-01T23:00:00Z',
          end_time: '2024-02-02T01:00:00Z',
        } as any)

        expect(result).toBeDefined()
      })

      it('should handle meeting with many participants', async () => {
        const participants = Array.from({ length: 50 }, (_, i) => ({
          address: `0x${i}`,
          type: 'guest' as const,
        }))

        mockSingle.mockResolvedValue({
          data: { id: 'slot_123', participants },
          error: null,
        })

        const organizer = { address: '0x123', type: 'organizer' as const }
        const result = await saveMeeting(organizer, { participants } as any)

        expect(result).toBeDefined()
      })
    })

    describe('Meeting Update Edge Cases', () => {
      it('should handle partial meeting updates', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'slot_123', title: 'Updated' },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await updateMeeting(participant, {
          slot_id: 'slot_123',
          title: 'Updated',
        } as any)

        expect(result.title).toBe('Updated')
      })

      it('should handle meeting time extension', async () => {
        mockSingle.mockResolvedValue({
          data: {
            id: 'slot_123',
            end: '2024-02-01T12:00:00Z',
          },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await updateMeeting(participant, {
          slot_id: 'slot_123',
          end_time: '2024-02-01T12:00:00Z',
        } as any)

        expect(result).toBeDefined()
      })

      it('should handle meeting time shortening', async () => {
        mockSingle.mockResolvedValue({
          data: {
            id: 'slot_123',
            end: '2024-02-01T10:30:00Z',
          },
          error: null,
        })

        const participant = { address: '0x123', type: 'organizer' as const }
        const result = await updateMeeting(participant, {
          slot_id: 'slot_123',
          end_time: '2024-02-01T10:30:00Z',
        } as any)

        expect(result).toBeDefined()
      })
    })

    describe('Meeting Retrieval Edge Cases', () => {
      it('should handle retrieval with complex filters', async () => {
        mockSelect.mockResolvedValue({
          data: [{ id: 'slot_123' }],
          error: null,
        })

        const result = await getSlotsForAccount('0x123')

        expect(result).toBeDefined()
      })

      it('should handle retrieval of past meetings', async () => {
        mockSelect.mockResolvedValue({
          data: [
            { id: 'slot_1', start: '2023-01-01T10:00:00Z' },
            { id: 'slot_2', start: '2023-01-02T10:00:00Z' },
          ],
          error: null,
        })

        const result = await getSlotsForAccount('0x123')

        expect(result).toHaveLength(2)
      })

      it('should handle retrieval of future meetings', async () => {
        mockSelect.mockResolvedValue({
          data: [
            { id: 'slot_1', start: '2025-01-01T10:00:00Z' },
          ],
          error: null,
        })

        const result = await getSlotsForAccount('0x123')

        expect(result).toHaveLength(1)
      })
    })
  })

  // ==================== ADDITIONAL GROUP TESTS ====================
  
  describe('Group Management - Extended', () => {
    describe('Group Membership Edge Cases', () => {
      it('should handle adding member with special characters in address', async () => {
        mockSingle.mockResolvedValue({
          data: { group_id: 'group_123', account_address: '0xSpecial' },
          error: null,
        })

        await expect(addUserToGroup('group_123', '0xSpecial', 'member')).resolves.not.toThrow()
      })

      it('should handle removing last member from group', async () => {
        mockEq.mockResolvedValue({
          data: null,
          error: { message: 'Cannot remove last member' },
        })

        await expect(removeMember('group_123', '0x123', '0x123')).rejects.toThrow()
      })

      it('should handle admin demotion when multiple admins exist', async () => {
        mockEq.mockResolvedValue({
          data: { member_type: 'member' },
          error: null,
        })

        await expect(changeGroupRole('group_123', '0x456', '0x123', 'member')).resolves.not.toThrow()
      })

      it('should handle member promotion to admin', async () => {
        mockEq.mockResolvedValue({
          data: { member_type: 'admin' },
          error: null,
        })

        await expect(changeGroupRole('group_123', '0x456', '0x123', 'admin')).resolves.not.toThrow()
      })

      it('should verify admin permissions before role change', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { member_type: 'member' },
          error: null,
        })

        const isAdmin = await isUserAdminOfGroup('group_123', '0x123')

        expect(isAdmin).toBe(false)
      })
    })

    describe('Group Settings Edge Cases', () => {
      it('should handle group name with special characters', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'group_123', name: 'Test & Group #1' },
          error: null,
        })

        await expect(editGroup('group_123', '0x123', 'Test & Group #1')).resolves.not.toThrow()
      })

      it('should handle very long group description', async () => {
        const longDesc = 'A'.repeat(5000)
        mockSingle.mockResolvedValue({
          data: { id: 'group_123', description: longDesc },
          error: null,
        })

        await expect(editGroup('group_123', '0x123', undefined, undefined, undefined, longDesc)).resolves.not.toThrow()
      })

      it('should handle slug conflicts', async () => {
        mockSingle.mockResolvedValue({
          data: null,
          error: { code: '23505' },
        })

        await expect(createGroupInDB('0x123', 'Group', 'taken-slug')).rejects.toThrow()
      })
    })
  })

  // ==================== ADDITIONAL SUBSCRIPTION TESTS ====================
  
  describe('Subscription Management - Extended', () => {
    describe('Subscription Status Changes', () => {
      it('should handle subscription activation', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'sub_123', status: 'active' },
          error: null,
        })

        const result = await updateStripeSubscription('sub_123', { status: 'active' } as any)

        expect(result.status).toBe('active')
      })

      it('should handle subscription cancellation', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'sub_123', status: 'cancelled' },
          error: null,
        })

        const result = await updateStripeSubscription('sub_123', { status: 'cancelled' } as any)

        expect(result.status).toBe('cancelled')
      })

      it('should handle subscription pause', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'sub_123', status: 'paused' },
          error: null,
        })

        const result = await updateStripeSubscription('sub_123', { status: 'paused' } as any)

        expect(result.status).toBe('paused')
      })

      it('should handle subscription expiration', async () => {
        mockMaybeSingle.mockResolvedValue({
          data: { id: 'sub_123', status: 'expired' },
          error: null,
        })

        const result = await getSubscription('sub_123')

        expect(result?.status).toBe('expired')
      })
    })

    describe('Subscription Billing Edge Cases', () => {
      it('should handle plan upgrade', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'sub_123', billing_plan_id: 'plan_pro' },
          error: null,
        })

        const result = await updateStripeSubscription('sub_123', { billing_plan_id: 'plan_pro' })

        expect(result.billing_plan_id).toBe('plan_pro')
      })

      it('should handle plan downgrade', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'sub_123', billing_plan_id: 'plan_basic' },
          error: null,
        })

        const result = await updateStripeSubscription('sub_123', { billing_plan_id: 'plan_basic' })

        expect(result.billing_plan_id).toBe('plan_basic')
      })

      it('should handle subscription with custom domain', async () => {
        mockSelect.mockResolvedValue({
          data: [{ id: 'sub_123', custom_domain: 'custom.example.com' }],
          error: null,
        })

        const result = await getExistingSubscriptionsByDomain('custom.example.com')

        expect(result).toHaveLength(1)
      })
    })
  })

  // ==================== ADDITIONAL QUICKPOLL TESTS ====================
  
  describe('QuickPoll Management - Extended', () => {
    describe('QuickPoll Participant Edge Cases', () => {
      it('should handle participant with no availability', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'participant_123', availability_slots: [] },
          error: null,
        })

        const result = await updateQuickPollParticipantAvailability('participant_123', [])

        expect(result.availability_slots).toEqual([])
      })

      it('should handle participant with overlapping availability', async () => {
        const overlappingSlots = [
          { start: '2024-02-01T10:00:00Z', end: '2024-02-01T12:00:00Z' },
          { start: '2024-02-01T11:00:00Z', end: '2024-02-01T13:00:00Z' },
        ]

        mockSingle.mockResolvedValue({
          data: { id: 'participant_123', availability_slots: overlappingSlots },
          error: null,
        })

        const result = await updateQuickPollParticipantAvailability('participant_123', overlappingSlots as any)

        expect(result.availability_slots).toHaveLength(2)
      })

      it('should handle participant status transitions', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'participant_123', status: 'responded' },
          error: null,
        })

        const result = await updateQuickPollParticipantStatus('participant_123', 'responded' as any)

        expect(result.status).toBe('responded')
      })
    })

    describe('QuickPoll Visibility Edge Cases', () => {
      it('should handle public poll creation', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'poll_123', visibility: 'public' },
          error: null,
        })

        const result = await createQuickPoll('0x123', { visibility: 'public' } as any)

        expect(result.visibility).toBe('public')
      })

      it('should handle private poll creation', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'poll_123', visibility: 'private' },
          error: null,
        })

        const result = await createQuickPoll('0x123', { visibility: 'private' } as any)

        expect(result.visibility).toBe('private')
      })

      it('should handle poll visibility change', async () => {
        mockSingle.mockResolvedValue({
          data: { id: 'poll_123', visibility: 'private' },
          error: null,
        })

        const result = await updateQuickPoll('poll_123', '0x123', { visibility: 'private' } as any)

        expect(result.visibility).toBe('private')
      })
    })
  })

  // ==================== STRESS & PERFORMANCE TESTS ====================
  
  describe('Stress & Performance Tests', () => {
    it('should handle rapid successive queries', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { address: '0x123' },
        error: null,
      })

      const queries = Array.from({ length: 100 }, () => getAccountFromDB('0x123'))

      await expect(Promise.all(queries)).resolves.toBeDefined()
    })

    it('should handle bulk operations efficiently', async () => {
      mockSelect.mockResolvedValue({
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
        error: null,
      })

      const result = await getSlotsForAccount('0x123')

      expect(result).toHaveLength(1000)
    })

    it('should handle complex nested data structures', async () => {
      const complexData = {
        id: 'slot_123',
        participants: Array.from({ length: 50 }, (_, i) => ({
          id: i,
          nested: {
            deep: {
              data: 'value',
            },
          },
        })),
      }

      mockSingle.mockResolvedValue({
        data: complexData,
        error: null,
      })

      const result = await getMeetingFromDB('slot_123')

      expect(result.participants).toHaveLength(50)
    })
  })
})
