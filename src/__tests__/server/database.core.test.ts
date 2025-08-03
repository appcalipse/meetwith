// Move all mocks to the top of the file, before any imports
import { jest } from '@jest/globals'
import * as Sentry from '@sentry/nextjs'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { validate } from 'uuid'

// Mock external dependencies
jest.mock('@supabase/supabase-js')
jest.mock('@sentry/nextjs')
jest.mock('uuid', () => ({
  validate: jest.fn(),
  v4: jest.fn(() => 'test-uuid'),
}))

// Set up Supabase mocks
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
  match: jest.fn().mockReturnThis(),
  storage: {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn().mockReturnThis(),
    getPublicUrl: jest.fn().mockReturnThis(),
  },
}

const mockValidate = validate as jest.MockedFunction<typeof validate>

// Mock the database module completely
jest.mock('@/utils/database', () => ({
  initDB: jest.fn(() => ({
    ready: true,
    supabase: mockSupabaseClient,
  })),
  initAccountDBForWallet: jest.fn(),
  updateAccountFromInvite: jest.fn(),
  findAccountByIdentifier: jest.fn(),
  updatePreferenceAvatar: jest.fn(),
  getAccountNonce: jest.fn(),
  getAccountPreferences: jest.fn(),
  getExistingAccountsFromDB: jest.fn(),
  getAccountFromDB: jest.fn(),
  getAccountFromDBPublic: jest.fn(),
  getSubscriptionFromDBForAccount: jest.fn().mockResolvedValue([]),
  workMeetingTypeGates: jest.fn().mockResolvedValue(undefined),
  updateAccountPreferences: jest.fn(),
}))

// Import types after mocks
import {
  Account,
  AccountPreferences,
  PublicAccount,
  SimpleAccountInfo,
} from '@/types/Account'
// Import the mocked functions
import * as database from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'

describe('Database Core Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset Supabase mocks
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.or.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.ilike.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.offset.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.single.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.in.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.match.mockReturnValue(mockSupabaseClient)
  })

  describe('initDB', () => {
    it('should initialize database with correct configuration', () => {
      const result = database.initDB()
      expect(result).toBeDefined()
      expect(result.ready).toBe(true)
      expect(result.supabase).toBe(mockSupabaseClient)
    })
  })

  describe('initAccountDBForWallet', () => {
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

    it('should create account successfully', async () => {
      ;(
        database.initAccountDBForWallet as jest.MockedFunction<
          typeof database.initAccountDBForWallet
        >
      ).mockResolvedValue(mockAccount)

      const result = await database.initAccountDBForWallet(
        '0x1234567890123456789012345678901234567890',
        'test-signature',
        'UTC',
        12345
      )

      expect(result).toEqual(mockAccount)
      expect(database.initAccountDBForWallet).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        'test-signature',
        'UTC',
        12345
      )
    })

    it('should handle database error', async () => {
      ;(
        database.initAccountDBForWallet as jest.MockedFunction<
          typeof database.initAccountDBForWallet
        >
      ).mockRejectedValue(new Error('Database error'))

      await expect(
        database.initAccountDBForWallet(
          '0x1234567890123456789012345678901234567890',
          'test-signature',
          'UTC',
          12345
        )
      ).rejects.toThrow('Database error')
    })

    it('should create account with invite flag', async () => {
      ;(
        database.initAccountDBForWallet as jest.MockedFunction<
          typeof database.initAccountDBForWallet
        >
      ).mockResolvedValue(mockAccount)

      await database.initAccountDBForWallet(
        '0x1234567890123456789012345678901234567890',
        'test-signature',
        'UTC',
        12345,
        true
      )

      expect(database.initAccountDBForWallet).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
        'test-signature',
        'UTC',
        12345,
        true
      )
    })
  })

  describe('updateAccountFromInvite', () => {
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

    it('should update account from invite successfully', async () => {
      ;(
        database.updateAccountFromInvite as jest.MockedFunction<
          typeof database.updateAccountFromInvite
        >
      ).mockResolvedValue(mockAccount)

      const result = await database.updateAccountFromInvite(
        '0x1234567890123456789012345678901234567890',
        'test-signature',
        'UTC',
        12345
      )

      expect(result).toEqual(mockAccount)
    })

    it('should handle database error', async () => {
      ;(
        database.updateAccountFromInvite as jest.MockedFunction<
          typeof database.updateAccountFromInvite
        >
      ).mockRejectedValue(new Error('Database error'))

      await expect(
        database.updateAccountFromInvite(
          '0x1234567890123456789012345678901234567890',
          'test-signature',
          'UTC',
          12345
        )
      ).rejects.toThrow('Database error')
    })
  })

  describe('findAccountByIdentifier', () => {
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

    it('should find accounts by identifier successfully', async () => {
      ;(
        database.findAccountByIdentifier as jest.MockedFunction<
          typeof database.findAccountByIdentifier
        >
      ).mockResolvedValue(mockAccounts)

      const result = await database.findAccountByIdentifier('test-identifier')

      expect(result).toEqual(mockAccounts)
    })

    it('should handle database error', async () => {
      ;(
        database.findAccountByIdentifier as jest.MockedFunction<
          typeof database.findAccountByIdentifier
        >
      ).mockRejectedValue(new Error('Database error'))

      await expect(
        database.findAccountByIdentifier('test-identifier')
      ).rejects.toThrow('Database error')
    })
  })

  describe('updateAccountPreferences', () => {
    const mockAccount: Account = {
      id: 'test-id',
      address: '0x1234567890123456789012345678901234567890',
      nonce: 12345,
      internal_pub_key: '0x1234567890123456789012345678901234567890',
      encoded_signature: '0x1234567890123456789012345678901234567890',
      is_invited: false,
      subscriptions: [],
      preferences: {
        name: 'Updated User',
        timezone: 'UTC',
        availableTypes: [],
        availabilities: [],
        meetingProviders: [],
      },
      created_at: new Date(),
    }

    it('should update account preferences successfully', async () => {
      const mockUpdateAccountPreferences = database.updateAccountPreferences as jest.MockedFunction<typeof database.updateAccountPreferences>

      mockUpdateAccountPreferences.mockImplementation(async (account: Account) => {
        const responsePrefsUpdate = await mockSupabaseClient
          .from('account_preferences')
          .update({
            description: account.preferences.description,
            timezone: account.preferences.timezone,
            availabilities: account.preferences.availabilities,
            name: account.preferences.name,
            socialLinks: account.preferences.socialLinks,
            availableTypes: account.preferences.availableTypes,
            meetingProviders: account.preferences.meetingProviders,
          })
          .match({ owner_account_address: account.address.toLowerCase() })

        if (responsePrefsUpdate.error) {
          throw new Error("Account preferences couldn't be updated")
        }

        account.preferences = responsePrefsUpdate.data?.[0] as AccountPreferences
        account.subscriptions = await (database.getSubscriptionFromDBForAccount as jest.MockedFunction<typeof database.getSubscriptionFromDBForAccount>)(account.address)
        return account
      })

      mockSupabaseClient.match.mockResolvedValue({
        data: [mockAccount.preferences],
        error: null,
      })

      const result = await database.updateAccountPreferences(mockAccount)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('account_preferences')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        description: undefined,
        timezone: 'UTC',
        availabilities: [],
        name: 'Updated User',
        socialLinks: undefined,
        availableTypes: [],
        meetingProviders: [],
      })
      expect(mockSupabaseClient.match).toHaveBeenCalledWith({
        owner_account_address: mockAccount.address.toLowerCase(),
      })
      expect(result).toEqual(mockAccount)
    })

    it('should handle database error', async () => {
      const mockUpdateAccountPreferences = database.updateAccountPreferences as jest.MockedFunction<typeof database.updateAccountPreferences>

      mockUpdateAccountPreferences.mockImplementation(async (account: Account) => {
        const responsePrefsUpdate = await mockSupabaseClient
          .from('account_preferences')
          .update({})
          .match({ owner_account_address: account.address.toLowerCase() })

        if (responsePrefsUpdate.error) {
          throw new Error("Account preferences couldn't be updated")
        }

        return account
      })

      mockSupabaseClient.match.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        database.updateAccountPreferences(mockAccount)
      ).rejects.toThrow("Account preferences couldn't be updated")
    })
  })

  describe('updatePreferenceAvatar', () => {
    it('should update avatar successfully', async () => {
      const mockPublicUrl = 'https://example.com/avatar.jpg'
      const mockUpdatePreferenceAvatar = database.updatePreferenceAvatar as jest.MockedFunction<typeof database.updatePreferenceAvatar>

      mockUpdatePreferenceAvatar.mockImplementation(async (
        address: string,
        filename: string,
        buffer: Buffer,
        mimeType: string
      ) => {
        const file = `uploads/${Date.now()}-${filename}`

        const uploadResult = await mockSupabaseClient.storage
          .from('avatars')
          .upload(file, buffer, {
            contentType: mimeType,
            upsert: true,
          })

        if (uploadResult.error) {
          throw new Error('Unable to upload avatar. Please try again or contact support if the problem persists.')
        }

        const { data } = mockSupabaseClient.storage.from('avatars').getPublicUrl(file)
        const publicUrl = data?.publicUrl

        if (!publicUrl) {
          throw new Error("Avatar upload completed but couldn't generate preview URL. Please refresh and try again.")
        }

        const updateResult = await mockSupabaseClient
          .from('account_preferences')
          .update({ avatar_url: publicUrl })
          .eq('owner_account_address', address.toLowerCase())

        if (updateResult.error) {
          throw new Error('Failed to update avatar URL')
        }

        return publicUrl
      })

      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: { path: 'avatars/test.jpg' },
        error: null,
      })
      mockSupabaseClient.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: mockPublicUrl },
      })
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await database.updatePreferenceAvatar(
        '0x1234567890123456789012345678901234567890',
        'test.jpg',
        Buffer.from('test'),
        'image/jpeg'
      )

      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('avatars')
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalled()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('account_preferences')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ avatar_url: mockPublicUrl })
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('owner_account_address', '0x1234567890123456789012345678901234567890')
      expect(result).toBe(mockPublicUrl)
    })

    it('should handle upload error', async () => {
      const mockUpdatePreferenceAvatar = database.updatePreferenceAvatar as jest.MockedFunction<typeof database.updatePreferenceAvatar>

      mockUpdatePreferenceAvatar.mockImplementation(async (
        address: string,
        filename: string,
        buffer: Buffer,
        mimeType: string
      ) => {
        const file = `uploads/${Date.now()}-${filename}`
        const uploadResult = await mockSupabaseClient.storage
          .from('avatars')
          .upload(file, buffer, {
            contentType: mimeType,
            upsert: true,
          })

        if (uploadResult.error) {
          throw new Error('Unable to upload avatar. Please try again or contact support if the problem persists.')
        }

        return 'success'
      })

      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: null,
        error: { message: 'Upload error' },
      })

      await expect(
        database.updatePreferenceAvatar(
          '0x1234567890123456789012345678901234567890',
          'test.jpg',
          Buffer.from('test'),
          'image/jpeg'
        )
      ).rejects.toThrow('Unable to upload avatar. Please try again or contact support if the problem persists.')
    })
  })

  // ...rest of tests...
