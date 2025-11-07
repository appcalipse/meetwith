import { validate } from 'uuid'

import {
  Account,
  AccountPreferences,
  PublicAccount,
  SimpleAccountInfo,
} from '@/types/Account'
import { AccountNotFoundError } from '@/utils/errors'

// Mock uuid functions
jest.mock('uuid', () => ({
  validate: jest.fn(),
  v4: jest.fn(() => 'mock-uuid-v4'),
  v1: jest.fn(() => 'mock-uuid-v1'),
}))

const mockValidate = validate as jest.MockedFunction<typeof validate>

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    storage: {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockReturnThis(),
      getPublicUrl: jest.fn().mockReturnThis(),
    },
  })),
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Mock other dependencies
jest.mock('@/utils/cryptography', () => ({
  encryptContent: jest.fn(() => 'encrypted-content'),
  decryptContent: jest.fn(() => 'decrypted-content'),
  checkSignature: jest.fn(() => true),
}))

jest.mock('@/utils/validations', () => ({
  isValidEVMAddress: jest.fn(() => true),
}))

jest.mock('@/utils/constants/meeting-types', () => ({
  generateDefaultMeetingType: jest.fn(() => ({
    id: 'default-meeting-type',
    title: 'Default Meeting',
    duration_minutes: 30,
  })),
}))

jest.mock('@/utils/constants/schedule', () => ({
  generateGroupSchedulingDurations: jest.fn(() => []),
}))

jest.mock('@/utils/calendar_manager', () => ({
  getConnectedCalendarIntegration: jest.fn(() => null),
}))

jest.mock('@/utils/slots.helper', () => ({
  isTimeInsideAvailabilities: jest.fn(() => true),
}))

jest.mock('@/utils/subscription_manager', () => ({
  isProAccount: jest.fn(() => false),
}))

jest.mock('@/utils/token.gate.service', () => ({
  isConditionValid: jest.fn(() => true),
}))

jest.mock('@/utils/user_manager', () => ({
  ellipsizeAddress: jest.fn(address => address),
}))

jest.mock('@/utils/errors', () => ({
  AccountNotFoundError: class AccountNotFoundError extends Error {
    constructor(identifier: string) {
      super(`Account not found: ${identifier}`)
      this.name = 'AccountNotFoundError'
    }
  },
}))

// Mock the database module's db object
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockReturnThis(),
    getPublicUrl: jest.fn().mockReturnThis(),
  },
}

// Mock the database module
jest.mock('@/utils/database', () => {
  const originalModule = jest.requireActual('@/utils/database')

  // Replace the db object with our mock
  const mockDb = {
    ready: true,
    supabase: mockSupabaseClient,
  }

  return {
    ...originalModule,
    db: mockDb,
  }
})

// Import the functions after mocking
import {
  findAccountByIdentifier,
  getAccountFromDB,
  getAccountFromDBPublic,
  getAccountNonce,
  getAccountPreferences,
  getExistingAccountsFromDB,
  initAccountDBForWallet,
  initDB,
  updateAccountFromInvite,
  updateAccountPreferences,
  updatePreferenceAvatar,
} from '@/utils/database'

describe('Database Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initDB', () => {
    it('should initialize database', () => {
      const result = initDB()
      expect(result).toBeDefined()
      expect(result.ready).toBe(true)
    })
  })

  describe('getAccountNonce', () => {
    it('should get nonce for UUID identifier', async () => {
      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: [{ nonce: 12345 }],
        error: null,
      })

      const result = await getAccountNonce('test-uuid')
      expect(result).toBe(12345)
      expect(mockSupabaseClient.or).toHaveBeenCalledWith('id.eq.test-uuid')
    })

    it('should get nonce for address identifier', async () => {
      mockValidate.mockReturnValue(false)
      mockSupabaseClient.or.mockResolvedValue({
        data: [{ nonce: 12345 }],
        error: null,
      })

      const address = '0x1234567890123456789012345678901234567890'
      const result = await getAccountNonce(address)
      expect(result).toBe(12345)
      expect(mockSupabaseClient.or).toHaveBeenCalledWith(
        `address.ilike.${address},internal_pub_key.eq.${address}`
      )
    })

    it('should throw AccountNotFoundError when account not found', async () => {
      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: [],
        error: null,
      })

      await expect(getAccountNonce('test-uuid')).rejects.toThrow(
        AccountNotFoundError
      )
    })

    it('should handle database error', async () => {
      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getAccountNonce('test-uuid')).rejects.toThrow(
        'Database error'
      )
    })
  })

  describe('getAccountPreferences', () => {
    it('should get account preferences', async () => {
      const mockPreferences: AccountPreferences = {
        name: 'Test User',
        timezone: 'UTC',
        availableTypes: [],
        availabilities: [],
        meetingProviders: [],
      }

      mockSupabaseClient.eq.mockResolvedValue({
        data: [{ preferences: mockPreferences }],
        error: null,
      })

      const result = await getAccountPreferences(
        '0x1234567890123456789012345678901234567890'
      )
      expect(result).toEqual(mockPreferences)
    })

    it('should handle database error', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getAccountPreferences('0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Database error')
    })
  })

  describe('getExistingAccountsFromDB', () => {
    it('should get full account information', async () => {
      const mockAccounts: Account[] = [
        {
          id: 'test-id',
          address: '0x1234567890123456789012345678901234567890',
          nonce: 12345,
          internal_pub_key: '0x1234567890123456789012345678901234567890',
          encoded_signature: '0x1234567890123456789012345678901234567890',
          is_invited: false,
          subscriptions: [],
          preferences: {
            name: 'Test User',
            timezone: 'UTC',
            availableTypes: [],
            availabilities: [],
            meetingProviders: [],
          },
          created_at: new Date(),
        },
      ]

      mockSupabaseClient.in.mockResolvedValue({
        data: mockAccounts,
        error: null,
      })

      const result = await getExistingAccountsFromDB(
        ['0x1234567890123456789012345678901234567890'],
        true
      )
      expect(result).toEqual(mockAccounts)
    })

    it('should get simple account information', async () => {
      const mockSimpleAccounts: SimpleAccountInfo[] = [
        {
          address: '0x1234567890123456789012345678901234567890',
          internal_pub_key: '0x1234567890123456789012345678901234567890',
        },
      ]

      mockSupabaseClient.in.mockResolvedValue({
        data: mockSimpleAccounts,
        error: null,
      })

      const result = await getExistingAccountsFromDB(
        ['0x1234567890123456789012345678901234567890'],
        false
      )
      expect(result).toEqual(mockSimpleAccounts)
    })

    it('should handle database error', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getExistingAccountsFromDB([
          '0x1234567890123456789012345678901234567890',
        ])
      ).rejects.toThrow('Database error')
    })
  })

  describe('getAccountFromDB', () => {
    it('should get account with private information', async () => {
      const mockAccount: Account = {
        id: 'test-id',
        address: '0x1234567890123456789012345678901234567890',
        nonce: 12345,
        internal_pub_key: '0x1234567890123456789012345678901234567890',
        encoded_signature: '0x1234567890123456789012345678901234567890',
        is_invited: false,
        subscriptions: [],
        preferences: {
          name: 'Test User',
          timezone: 'UTC',
          availableTypes: [],
          availabilities: [],
          meetingProviders: [],
        },
        created_at: new Date(),
      }

      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: [mockAccount],
        error: null,
      })

      const result = await getAccountFromDB('test-uuid', true)
      expect(result).toEqual(mockAccount)
    })

    it('should get account without private information', async () => {
      const mockAccount: Account = {
        id: 'test-id',
        address: '0x1234567890123456789012345678901234567890',
        nonce: 12345,
        internal_pub_key: '0x1234567890123456789012345678901234567890',
        encoded_signature: '0x1234567890123456789012345678901234567890',
        is_invited: false,
        subscriptions: [],
        preferences: {
          name: 'Test User',
          timezone: 'UTC',
          availableTypes: [],
          availabilities: [],
          meetingProviders: [],
        },
        created_at: new Date(),
      }

      mockValidate.mockReturnValue(false)
      mockSupabaseClient.or.mockResolvedValue({
        data: [mockAccount],
        error: null,
      })

      const result = await getAccountFromDB(
        '0x1234567890123456789012345678901234567890',
        false
      )
      expect(result).toEqual(mockAccount)
    })

    it('should throw AccountNotFoundError when account not found', async () => {
      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: [],
        error: null,
      })

      await expect(getAccountFromDB('test-uuid')).rejects.toThrow(
        AccountNotFoundError
      )
    })

    it('should handle database error', async () => {
      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getAccountFromDB('test-uuid')).rejects.toThrow(
        'Database error'
      )
    })
  })

  describe('getAccountFromDBPublic', () => {
    it('should get public account information', async () => {
      const mockPublicAccount: PublicAccount = {
        id: 'test-id',
        address: '0x1234567890123456789012345678901234567890',
        internal_pub_key: '0x1234567890123456789012345678901234567890',
        encoded_signature: '0x1234567890123456789012345678901234567890',
        nonce: 12345,
        is_invited: false,
        subscriptions: [],
        preferences: {
          name: 'Test User',
          timezone: 'UTC',
          availableTypes: [],
          availabilities: [],
          meetingProviders: [],
        },
        created_at: new Date(),
      }

      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: [mockPublicAccount],
        error: null,
      })

      const result = await getAccountFromDBPublic('test-uuid')
      expect(result).toEqual(mockPublicAccount)
    })

    it('should throw AccountNotFoundError when account not found', async () => {
      mockValidate.mockReturnValue(true)
      mockSupabaseClient.or.mockResolvedValue({
        data: [],
        error: null,
      })

      await expect(getAccountFromDBPublic('test-uuid')).rejects.toThrow(
        AccountNotFoundError
      )
    })
  })
})
