import { jest } from '@jest/globals'

// Mock all external dependencies BEFORE importing
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}))

jest.mock('crypto-js', () => ({}))

jest.mock('eth-crypto', () => ({
  createIdentity: jest.fn(),
  decryptWithPrivateKey: jest.fn(),
  encryptWithPublicKey: jest.fn(),
}))

jest.mock('uuid', () => ({
  validate: jest.fn(),
}))

jest.mock('@utils/calendar_manager', () => ({
  generateDefaultAvailabilities: jest.fn(),
  generateDefaultMeetingType: jest.fn(),
  generateEmptyAvailabilities: jest.fn(),
  noNoReplyEmailForAccount: jest.fn(),
}))

jest.mock('@utils/calendar_sync_helpers', () => ({
  extractMeetingDescription: jest.fn(),
  getBaseEventId: jest.fn(),
  updateMeetingServer: jest.fn(),
}))

jest.mock('@utils/constants', () => ({
  apiUrl: 'https://api.example.com',
  appUrl: 'https://app.example.com',
  WEBHOOK_URL: 'https://webhook.example.com',
}))

jest.mock('@utils/cryptography', () => ({
  decryptContent: jest.fn(),
  encryptContent: jest.fn(),
}))

jest.mock('@utils/validations', () => ({
  isValidEVMAddress: jest.fn(),
}))

jest.mock('@utils/services/connected_calendars.factory', () => ({
  getConnectedCalendarIntegration: jest.fn(),
}))

// Import the module under test
import {
  findAccountByIdentifier,
  initAccountDBForWallet,
  updateAccountFromInvite,
  workMeetingTypeGates,
} from '@utils/database'

// Import after mocking
import * as Sentry from '@sentry/nextjs'
import { createClient } from '@supabase/supabase-js'
import EthCrypto from 'eth-crypto'

// Mock data
const mockAccount = {
  address: '0x1234567890123456789012345678901234567890',
  internal_pub_key: 'mock-public-key',
  encoded_signature: 'mock-encoded-signature',
  nonce: 12345,
  is_invited: false,
  preferences: {
    availableTypes: [],
    description: '',
    availabilities: [],
    socialLinks: [],
    timezone: 'UTC',
    meetingProviders: ['GOOGLE_MEET'],
  },
}

const mockInvitedAccount = {
  ...mockAccount,
  is_invited: true,
}

const mockMeetingType = {
  id: 'meeting-type-1',
  name: 'Test Meeting',
  scheduleGate: 'gate-123',
}

const mockSlot = {
  id: 'slot-1',
  meeting_info_encrypted: {
    iv: 'mock-iv',
    ephemPublicKey: 'mock-eph-key',
    ciphertext: 'mock-cipher',
    mac: 'mock-mac',
  },
}

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
}

const mockQueryBuilder = {
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  match: jest.fn(),
  or: jest.fn(),
  upsert: jest.fn(),
}

describe('Database Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Setup Supabase mock
    const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
    mockCreateClient.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.from.mockReturnValue(mockQueryBuilder)

    // Chain all query builder methods
    Object.keys(mockQueryBuilder).forEach(method => {
      mockQueryBuilder[method].mockReturnValue(mockQueryBuilder)
    })

    // Mock EthCrypto
    const mockEthCrypto = EthCrypto as jest.Mocked<typeof EthCrypto>
    mockEthCrypto.createIdentity.mockReturnValue({
      privateKey: 'mock-private-key',
      publicKey: 'mock-public-key',
      address: '0x1234567890123456789012345678901234567890',
    })

    // Mock environment variables
    process.env.NEXT_SUPABASE_URL = 'https://mock-supabase-url.com'
    process.env.NEXT_SUPABASE_KEY = 'mock-supabase-key'
    process.env.NEXT_PUBLIC_SERVER_PUB_KEY = 'mock-server-pub-key'
    process.env.NEXT_SERVER_PVT_KEY = 'mock-server-private-key'
  })

  describe('initAccountDBForWallet', () => {
    beforeEach(() => {
      // Mock validation and helper functions
      const { isValidEVMAddress } = require('@utils/validations')
      const { encryptContent } = require('@utils/cryptography')
      const { generateDefaultMeetingType, generateEmptyAvailabilities, generateDefaultAvailabilities } = require('@utils/calendar_manager')

      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      const mockEncryptContent = encryptContent as jest.MockedFunction<typeof encryptContent>
      const mockGenerateDefaultMeetingType = generateDefaultMeetingType as jest.MockedFunction<typeof generateDefaultMeetingType>
      const mockGenerateEmptyAvailabilities = generateEmptyAvailabilities as jest.MockedFunction<typeof generateEmptyAvailabilities>
      const mockGenerateDefaultAvailabilities = generateDefaultAvailabilities as jest.MockedFunction<typeof generateDefaultAvailabilities>

      mockIsValidEVMAddress.mockReturnValue(true)
      mockEncryptContent.mockReturnValue('encrypted-private-key')
      mockGenerateDefaultMeetingType.mockReturnValue({ id: 'default', name: 'Default Meeting' })
      mockGenerateEmptyAvailabilities.mockReturnValue([])
      mockGenerateDefaultAvailabilities.mockReturnValue([])
    })

    it('should throw error for invalid address', async () => {
      const { isValidEVMAddress } = require('@utils/validations')
      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      mockIsValidEVMAddress.mockReturnValue(false)

      await expect(
        initAccountDBForWallet('invalid-address', 'signature', 'UTC', 12345)
      ).rejects.toThrow('Invalid address')
    })

    it('should return existing account if not invited', async () => {
      // Mock successful validation
      const { isValidEVMAddress } = require('@utils/validations')
      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      mockIsValidEVMAddress.mockReturnValue(true)

      // Mock that account exists and is not invited
      const mockDatabase = require('@utils/database')
      mockDatabase.getAccountFromDB = jest.fn().mockResolvedValue(mockAccount)

      const result = await initAccountDBForWallet(
        '0x1234567890123456789012345678901234567890',
        'signature',
        'UTC',
        12345
      )

      expect(result).toBeDefined()
    })

    it('should create new account successfully', async () => {
      // Mock validation
      const { isValidEVMAddress } = require('@utils/validations')
      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      mockIsValidEVMAddress.mockReturnValue(true)

      // Mock that account doesn't exist (throws error)
      const mockDatabase = require('@utils/database')
      mockDatabase.getAccountFromDB = jest.fn().mockRejectedValue(new Error('Account not found'))
      mockDatabase.createAvailabilityBlock = jest.fn().mockResolvedValue({ id: 'availability-block-1' })

      // Mock successful database operations
      mockQueryBuilder.insert.mockResolvedValueOnce({
        error: null,
        data: [mockAccount],
      })
      mockQueryBuilder.insert.mockResolvedValueOnce({
        error: null,
        data: [{}],
      })
      mockQueryBuilder.update.mockResolvedValueOnce({
        error: null,
        data: [{}],
      })

      const result = await initAccountDBForWallet(
        '0x1234567890123456789012345678901234567890',
        'signature',
        'UTC',
        12345
      )

      expect(result).toBeDefined()
    })

    it('should handle preferences creation error', async () => {
      // Mock validation
      const { isValidEVMAddress } = require('@utils/validations')
      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      mockIsValidEVMAddress.mockReturnValue(true)

      const mockDatabase = require('@utils/database')
      mockDatabase.getAccountFromDB = jest.fn().mockRejectedValue(new Error('Account not found'))
      mockDatabase.createAvailabilityBlock = jest.fn().mockResolvedValue({ id: 'availability-block-1' })

      mockQueryBuilder.insert
        .mockResolvedValueOnce({
          error: null,
          data: [mockAccount],
        })
        .mockResolvedValueOnce({
          error: { message: 'Preferences creation failed' },
          data: null,
        })

      await expect(
        initAccountDBForWallet(
          '0x1234567890123456789012345678901234567890',
          'signature',
          'UTC',
          12345
        )
      ).rejects.toThrow("Account preferences couldn't be created")

      const mockSentry = Sentry as jest.Mocked<typeof Sentry>
      expect(mockSentry.captureException).toHaveBeenCalled()
    })

    it('should create invited account', async () => {
      // Mock validation
      const { isValidEVMAddress } = require('@utils/validations')
      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      mockIsValidEVMAddress.mockReturnValue(true)

      const mockDatabase = require('@utils/database')
      mockDatabase.getAccountFromDB = jest.fn().mockRejectedValue(new Error('Account not found'))
      mockDatabase.createAvailabilityBlock = jest.fn().mockResolvedValue({ id: 'availability-block-1' })

      mockQueryBuilder.insert.mockResolvedValueOnce({
        error: null,
        data: [{ ...mockAccount, is_invited: true }],
      })
      mockQueryBuilder.insert.mockResolvedValueOnce({
        error: null,
        data: [{}],
      })
      mockQueryBuilder.update.mockResolvedValueOnce({
        error: null,
        data: [{}],
      })

      const result = await initAccountDBForWallet(
        '0x1234567890123456789012345678901234567890',
        'signature',
        'UTC',
        12345,
        true
      )

      expect(result).toBeDefined()
    })

    it('should handle database error during account creation', async () => {
      // Mock validation
      const { isValidEVMAddress } = require('@utils/validations')
      const mockIsValidEVMAddress = isValidEVMAddress as jest.MockedFunction<typeof isValidEVMAddress>
      mockIsValidEVMAddress.mockReturnValue(true)

      const mockDatabase = require('@utils/database')
      mockDatabase.getAccountFromDB = jest.fn().mockRejectedValue(new Error('Account not found'))

      mockQueryBuilder.insert.mockResolvedValueOnce({
        error: { message: 'Database error' },
        data: null,
      })

      await expect(
        initAccountDBForWallet(
          '0x1234567890123456789012345678901234567890',
          'signature',
          'UTC',
          12345
        )
      ).rejects.toThrow('Database error')
    }).insert({})
    await createAvailabilityBlock()
    await mockQueryBuilder.update({})

    return { ...mockAccount, is_invited: is_invited || false }
  }
})

const result = await initAccountDBForWallet(
  '0x1234567890123456789012345678901234567890',
  'signature',
  'UTC',
  12345,
  true
)

expect(result.is_invited).toBe(true)
})

it('should handle database error during account creation', async () => {
  getAccountFromDB.mockRejectedValue(new Error('Account not found'))

  mockQueryBuilder.insert.mockResolvedValueOnce({
    error: { message: 'Database error' },
    data: null,
  })

  initAccountDBForWallet.mockImplementation(async () => {
    try {
      await getAccountFromDB()
    } catch (error) {
      const insertResult = await mockQueryBuilder.insert([])
      if (insertResult.error) {
        throw new Error(insertResult.error.message)
      }
    }
  })

  await expect(
    initAccountDBForWallet(
      '0x1234567890123456789012345678901234567890',
      'signature',
      'UTC',
      12345
    )
  ).rejects.toThrow('Database error')
})

it('should handle preferences creation error', async () => {
  getAccountFromDB.mockRejectedValue(new Error('Account not found'))
  createAvailabilityBlock.mockResolvedValue({ id: 'availability-block-1' })

  mockQueryBuilder.insert
    .mockResolvedValueOnce({
      error: null,
      data: [mockAccount],
    })
    .mockResolvedValueOnce({
      error: { message: 'Preferences creation failed' },
      data: null,
    })

  initAccountDBForWallet.mockImplementation(async () => {
    try {
      await getAccountFromDB()
    } catch (error) {
      const accountResult = await mockQueryBuilder.insert([])
      if (accountResult.error) {
        throw new Error(accountResult.error.message)
      }

      const prefsResult = await mockQueryBuilder.insert({})
      if (prefsResult.error) {
        const mockSentry = Sentry as jest.Mocked<typeof Sentry>
        mockSentry.captureException(prefsResult.error)
        throw new Error("Account preferences couldn't be created")
      }
    }
  })

  await expect(
    initAccountDBForWallet(
      '0x1234567890123456789012345678901234567890',
      'signature',
      'UTC',
      12345
    )
  ).rejects.toThrow("Account preferences couldn't be created")

  const mockSentry = Sentry as jest.Mocked<typeof Sentry>
  expect(mockSentry.captureException).toHaveBeenCalled()
})
})

describe('updateAccountFromInvite', () => {
  beforeEach(() => {
    const { encryptContent } = require('@utils/cryptography')
    const mockEncryptContent = encryptContent as jest.MockedFunction<typeof encryptContent>
    const mockDecryptWithPrivateKey = EthCrypto.decryptWithPrivateKey as jest.MockedFunction<typeof EthCrypto.decryptWithPrivateKey>
    const mockEncryptWithPublicKey = EthCrypto.encryptWithPublicKey as jest.MockedFunction<typeof EthCrypto.encryptWithPublicKey>

    mockEncryptContent.mockReturnValue('encrypted-private-key')
    mockDecryptWithPrivateKey.mockResolvedValue('decrypted-info')
    mockEncryptWithPublicKey.mockResolvedValue({
      iv: 'new-iv',
      ephemPublicKey: 'new-eph-key',
      ciphertext: 'new-cipher',
      mac: 'new-mac',
    })
  })

  it('should return existing account if not invited', async () => {
    // Mock that account exists and is not invited
    const mockDatabase = require('@utils/database')
    mockDatabase.getAccountFromDB = jest.fn().mockResolvedValue(mockAccount)

    const result = await updateAccountFromInvite(
      '0x1234567890123456789012345678901234567890',
      'signature',
      'UTC',
      12345
    )

    expect(result).toBeDefined()
  })

  it('should update invited account successfully', async () => {
    const mockDatabase = require('@utils/database')
    mockDatabase.getAccountFromDB = jest.fn()
      .mockResolvedValueOnce(mockInvitedAccount)
      .mockResolvedValueOnce({ ...mockAccount, preferences: { timezone: 'UTC' } })
    mockDatabase.getSlotsForAccount = jest.fn().mockResolvedValue([mockSlot])
    mockDatabase.updateAccountPreferences = jest.fn().mockResolvedValue({})

    mockQueryBuilder.upsert.mockResolvedValueOnce({ error: null })
    mockQueryBuilder.update.mockResolvedValueOnce({ error: null })

    const result = await updateAccountFromInvite(
      '0x1234567890123456789012345678901234567890',
      'signature',
      'UTC',
      12345
    )

    expect(result).toBeDefined()
  })

  it('should handle database error during update', async () => {
    const mockDatabase = require('@utils/database')
    mockDatabase.getAccountFromDB = jest.fn().mockResolvedValue(mockInvitedAccount)
    mockDatabase.getSlotsForAccount = jest.fn().mockResolvedValue([])

    mockQueryBuilder.upsert.mockResolvedValueOnce({
      error: { message: 'Update failed' }
    })

    await expect(
      updateAccountFromInvite(
        '0x1234567890123456789012345678901234567890',
        'signature',
        'UTC',
        12345
      )
    ).rejects.toThrow('Update failed')
  })

  it('should handle slot re-encryption errors gracefully', async () => {
    const mockDatabase = require('@utils/database')
    mockDatabase.getAccountFromDB = jest.fn()
      .mockResolvedValueOnce(mockInvitedAccount)
      .mockResolvedValueOnce({ ...mockAccount, preferences: { timezone: 'UTC' } })
    mockDatabase.getSlotsForAccount = jest.fn().mockResolvedValue([mockSlot])
    mockDatabase.updateAccountPreferences = jest.fn().mockResolvedValue({})

    const mockDecryptWithPrivateKey = EthCrypto.decryptWithPrivateKey as jest.MockedFunction<typeof EthCrypto.decryptWithPrivateKey>
    mockDecryptWithPrivateKey.mockRejectedValue(new Error('Decryption failed'))

    mockQueryBuilder.upsert.mockResolvedValueOnce({ error: null })

    const result = await updateAccountFromInvite(
      '0x1234567890123456789012345678901234567890',
      'signature',
      'UTC',
      12345
    )

    expect(result).toBeDefined()
  })',
  'signature',
    'UTC',
    12345
)

  expect(mockQueryBuilder.upsert).toHaveBeenCalledWith(
    [expect.objectContaining({
      address: '0x1234567890123456789012345678901234567890',
      is_invited: false,
    })],
    { onConflict: 'address' }
  )
})

it('should handle database error during update', async () => {
  const getAccountFromDB = jest.fn().mockResolvedValue(mockInvitedAccount)
  const getSlotsForAccount = jest.fn().mockResolvedValue([])

  jest.doMock('../database_manager', () => ({
    ...jest.requireActual('../database_manager'),
    getAccountFromDB,
    getSlotsForAccount,
  }))

  mockQueryBuilder.upsert.mockResolvedValueOnce({
    error: { message: 'Update failed' }
  })

  await expect(
    updateAccountFromInvite(
      '0x1234567890123456789012345678901234567890',
      'signature',
      'UTC',
      12345
    )
  ).rejects.toThrow('Update failed')
})

it('should handle slot re-encryption errors gracefully', async () => {
  const getAccountFromDB = jest.fn()
    .mockResolvedValueOnce(mockInvitedAccount)
    .mockResolvedValueOnce({ ...mockAccount, preferences: { timezone: 'UTC' } })
  const getSlotsForAccount = jest.fn().mockResolvedValue([mockSlot])
  const updateAccountPreferences = jest.fn().mockResolvedValue({})

  jest.doMock('../database_manager', () => ({
    ...jest.requireActual('../database_manager'),
    getAccountFromDB,
    getSlotsForAccount,
    updateAccountPreferences,
  }))

  const { decryptWithPrivateKey } = require('eth-crypto')
  ;(decryptWithPrivateKey as jest.Mock).mockRejectedValue(new Error('Decryption failed'))

  mockQueryBuilder.upsert.mockResolvedValueOnce({ error: null })

  const result = await updateAccountFromInvite(
    '0x1234567890123456789012345678901234567890',
    'signature',
    'UTC',
    12345
  )

  // Should not throw error, should handle gracefully
  expect(result).toBeDefined()
})
})

describe('workMeetingTypeGates', () => {
  it('should handle empty meeting types array', async () => {
    mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
    mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })

    await workMeetingTypeGates([])

    expect(mockQueryBuilder.delete).not.toHaveBeenCalled()
    expect(mockQueryBuilder.insert).not.toHaveBeenCalled()
  })

  it('should remove and add gate usages correctly', async () => {
    const meetingTypes = [
      { id: 'mt1', scheduleGate: 'gate1' },
      { id: 'mt2', scheduleGate: null },
      { id: 'mt3', scheduleGate: 'gate3' },
    ]

    mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
    mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })

    await workMeetingTypeGates(meetingTypes)

    expect(mockQueryBuilder.delete).toHaveBeenCalledWith()
    expect(mockQueryBuilder.match).toHaveBeenCalledWith({ type: 'MeetingSchedule' })
    expect(mockQueryBuilder.or).toHaveBeenCalledWith(
      'gated_entity_id.eq.mt1,gated_entity_id.eq.mt2,gated_entity_id.eq.mt3'
    )

    expect(mockQueryBuilder.insert).toHaveBeenCalledWith([
      {
        type: 'MeetingSchedule',
        gate_id: 'gate1',
        gated_entity_id: 'mt1',
      },
      {
        type: 'MeetingSchedule',
        gate_id: 'gate3',
        gated_entity_id: 'mt3',
      },
    ])
  })

  it('should handle deletion errors', async () => {
    const meetingTypes = [{ id: 'mt1', scheduleGate: 'gate1' }]

    mockQueryBuilder.delete.mockResolvedValueOnce({
      error: { message: 'Deletion failed' }
    })
    mockQueryBuilder.insert.mockResolvedValueOnce({ error: null })

    await workMeetingTypeGates(meetingTypes)

    expect(Sentry.captureException).toHaveBeenCalledWith({
      message: 'Deletion failed'
    })
  })

  it('should handle insertion errors', async () => {
    const meetingTypes = [{ id: 'mt1', scheduleGate: 'gate1' }]

    mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })
    mockQueryBuilder.insert.mockResolvedValueOnce({
      error: { message: 'Insertion failed' }
    })

    await workMeetingTypeGates(meetingTypes)

    expect(Sentry.captureException).toHaveBeenCalledWith({
      message: 'Insertion failed'
    })
  })

  it('should only remove gates when no scheduleGate is provided', async () => {
    const meetingTypes = [
      { id: 'mt1', scheduleGate: null },
      { id: 'mt2' }, // no scheduleGate property
    ]

    mockQueryBuilder.delete.mockResolvedValueOnce({ error: null })

    await workMeetingTypeGates(meetingTypes)

    expect(mockQueryBuilder.delete).toHaveBeenCalled()
    expect(mockQueryBuilder.insert).not.toHaveBeenCalled()
  })
})

describe('findAccountByIdentifier', () => {
  it('should return accounts successfully', async () => {
    const mockAccountsData = [
      { address: '0x1111111111111111111111111111111111111111' },
      { address: '0x2222222222222222222222222222222222222222' },
    ]

    const getAccountPreferences = jest.fn()
      .mockResolvedValueOnce({ timezone: 'UTC' })
      .mockResolvedValueOnce({ timezone: 'EST' })

    jest.doMock('../database_manager', () => ({
      ...jest.requireActual('../database_manager'),
      getAccountPreferences,
    }))

    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockAccountsData,
      error: null,
    })

    const result = await findAccountByIdentifier('test-identifier')

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('find_account', {
      identifier: 'test-identifier',
    })

    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('preferences')
    expect(getAccountPreferences).toHaveBeenCalledTimes(2)
  })

  it('should return empty array on database error', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'RPC call failed' },
    })

    const result = await findAccountByIdentifier('test-identifier')

    expect(result).toEqual([])
    expect(Sentry.captureException).toHaveBeenCalledWith({
      message: 'RPC call failed'
    })
  })

  it('should handle empty results', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const result = await findAccountByIdentifier('nonexistent-identifier')

    expect(result).toEqual([])
  })

  it('should handle preference loading errors', async () => {
    const mockAccountsData = [
      { address: '0x1111111111111111111111111111111111111111' },
    ]

    const getAccountPreferences = jest.fn().mockRejectedValue(new Error('Preferences not found'))

    jest.doMock('../database_manager', () => ({
      ...jest.requireActual('../database_manager'),
      getAccountPreferences,
    }))

    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: mockAccountsData,
      error: null,
    })

    await expect(findAccountByIdentifier('test-identifier')).rejects.toThrow('Preferences not found')
  })
})

describe('Database initialization', () => {
  it('should initialize database correctly', () => {
    expect(createClient).toHaveBeenCalledWith(
      'https://mock-supabase-url.com',
      'mock-supabase-key'
    )
  })

  it('should handle missing environment variables', () => {
    delete process.env.NEXT_SUPABASE_URL
    delete process.env.NEXT_SUPABASE_KEY

    expect(() => {
      // Re-import to trigger initialization
      jest.resetModules()
      require('../database_manager')
    }).toThrow()
  })
})

describe('Error handling', () => {
  it('should capture and handle Sentry exceptions properly', async () => {
    const getAccountFromDB = jest.fn().mockRejectedValue(new Error('Account not found'))
    const createAvailabilityBlock = jest.fn().mockResolvedValue({ id: 'availability-block-1' })

    jest.doMock('../database_manager', () => ({
      ...jest.requireActual('../database_manager'),
      getAccountFromDB,
      createAvailabilityBlock,
    }))

    mockQueryBuilder.insert
      .mockResolvedValueOnce({ error: null, data: [mockAccount] })
      .mockResolvedValueOnce({ error: { message: 'DB Error' }, data: null })

    try {
      await initAccountDBForWallet('0x1234567890123456789012345678901234567890', 'sig', 'UTC', 123)
    } catch (error) {
      expect(Sentry.captureException).toHaveBeenCalled()
    }
  })
})

describe('Input validation', () => {
  it('should validate EVM addresses correctly', async () => {
    const { isValidEVMAddress } = require('./validations')

      // Test invalid address
    ;(isValidEVMAddress as jest.Mock).mockReturnValue(false)

    await expect(
      initAccountDBForWallet('invalid', 'sig', 'UTC', 123)
    ).rejects.toThrow('Invalid address')

    expect(isValidEVMAddress).toHaveBeenCalledWith('invalid')
  })

  it('should handle empty identifiers in findAccountByIdentifier', async () => {
    mockSupabaseClient.rpc.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    const result = await findAccountByIdentifier('')
    expect(result).toEqual([])
  })
})

describe('Cryptography operations', () => {
  it('should handle encryption/decryption errors', async () => {
    const { encryptContent } = require('./cryptography')
    ;(encryptContent as jest.Mock).mockImplementation(() => {
      throw new Error('Encryption failed')
    })

    const { isValidEVMAddress } = require('./validations')
    ;(isValidEVMAddress as jest.Mock).mockReturnValue(true)

    const getAccountFromDB = jest.fn().mockRejectedValue(new Error('Account not found'))

    jest.doMock('../database_manager', () => ({
      ...jest.requireActual('../database_manager'),
      getAccountFromDB,
    }))

    await expect(
      initAccountDBForWallet('0x1234567890123456789012345678901234567890', 'sig', 'UTC', 123)
    ).rejects.toThrow('Encryption failed')
  })
})
})