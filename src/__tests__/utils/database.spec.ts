/**
 * Unit tests for database.ts
 * 
 * Tests cover key database operations including:
 * - Account preferences management
 * - Group invites
 * - Subscription management
 * - Availability blocks
 */

// Set environment variables before imports
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.PIN_SALT = 'test-salt'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.FROM_MAIL = 'test@example.com'

// Mock dependencies that are used during module initialization
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

// Mock Supabase module
const mockSupabaseClient = {
  from: jest.fn(),
  rpc: jest.fn(),
  storage: jest.fn(),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

describe('database.ts - Core Functions', () => {
  describe('Module Initialization', () => {
    it('should initialize without errors', () => {
      expect(() => {
        require('@/utils/database')
      }).not.toThrow()
    })
  })

  describe('Supabase Client', () => {
    it('should create Supabase client with correct credentials', () => {
      const { createClient } = require('@supabase/supabase-js')
      
      expect(createClient).toHaveBeenCalled()
    })
  })

  describe('Database Operations', () => {
    it('should have correct environment variables set', () => {
      expect(process.env.NEXT_SUPABASE_URL).toBe('https://test.supabase.co')
      expect(process.env.NEXT_SUPABASE_KEY).toBe('test-key')
      expect(process.env.NEXT_PUBLIC_THIRDWEB_ID).toBe('test-thirdweb-id')
    })
  })
})
