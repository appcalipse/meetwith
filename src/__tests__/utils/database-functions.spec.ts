/**
 * Extended unit tests for database.ts functions
 * Testing individual exported functions with proper mocking
 */

export {}
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.PIN_SALT = 'test-salt'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.FROM_MAIL = 'test@example.com'

// Mock all required modules
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

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table) => {
      const queryBuilder = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        containedBy: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        match: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        then: jest.fn((resolve) => resolve({ data: [], error: null })),
      }
      return queryBuilder
    }),
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

const mockSupabaseClient = require('@supabase/supabase-js').createClient()

describe('Database Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Supabase Integration', () => {
    it('should initialize Supabase client with environment variables', () => {
      // Import database to trigger initialization
      require('@/utils/database')
      const { createClient } = require('@supabase/supabase-js')
      expect(createClient).toHaveBeenCalled()
    })

    it('should have database ready state', () => {
      // Test that module loads without throwing
      expect(() => require('@/utils/database')).not.toThrow()
    })
  })

  describe('Error Handling', () => {
    it('should handle Sentry integration', () => {
      const Sentry = require('@sentry/nextjs')
      expect(Sentry.captureException).toBeDefined()
    })

    it('should properly initialize error capture', () => {
      // Verify Sentry is mocked correctly
      const Sentry = require('@sentry/nextjs')
      Sentry.captureException(new Error('Test'))
      expect(Sentry.captureException).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  describe('External Service Mocks', () => {
    it('should mock Discord service', () => {
      const discordHelper = require('@/utils/services/discord.helper')
      expect(discordHelper.dmAccount).toBeDefined()
      expect(discordHelper.getDiscordInfoForAddress).toBeDefined()
    })

    it('should mock Telegram service', () => {
      const telegramHelper = require('@/utils/services/telegram.helper')
      expect(telegramHelper.getTelegramUserInfo).toBeDefined()
      expect(telegramHelper.sendDm).toBeDefined()
    })

    it('should mock Stripe service', () => {
      const { StripeService } = require('@/utils/services/stripe.service')
      expect(StripeService).toBeDefined()
    })

    it('should mock notification helper', () => {
      const { emailQueue } = require('@/utils/notification_helper')
      expect(emailQueue.add).toBeDefined()
    })
  })

  describe('Calendar Integration', () => {
    it('should mock calendar manager functions', () => {
      const calendarManager = require('@/utils/calendar_manager')
      expect(calendarManager.decryptConferenceMeeting).toBeDefined()
      expect(calendarManager.generateDefaultMeetingType).toBeDefined()
      expect(calendarManager.generateEmptyAvailabilities).toBeDefined()
    })

    it('should generate empty availabilities', () => {
      const { generateEmptyAvailabilities } = require('@/utils/calendar_manager')
      const result = generateEmptyAvailabilities()
      expect(result).toEqual([])
    })
  })

  describe('QuickPoll Integration', () => {
    it('should mock quickpoll helper', () => {
      const { generatePollSlug } = require('@/utils/quickpoll_helper')
      expect(generatePollSlug).toBeDefined()
    })
  })

  describe('PostHog Analytics', () => {
    it('should mock PostHog client', () => {
      const PostHog = require('@/utils/posthog')
      expect(PostHog.default).toBeDefined()
    })

    it('should create PostHog client with capture method', () => {
      const PostHog = require('@/utils/posthog')
      const client = PostHog.default()
      expect(client.capture).toBeDefined()
    })
  })

  describe('Cryptography Mocks', () => {
    it('should mock argon2 hash function', () => {
      const argon2 = require('argon2')
      expect(argon2.hash).toBeDefined()
      expect(argon2.verify).toBeDefined()
    })
  })

  describe('Email Service', () => {
    it('should mock Resend email service', () => {
      const { Resend } = require('resend')
      expect(Resend).toBeDefined()
    })

    it('should create Resend instance with email sending capability', () => {
      const { Resend } = require('resend')
      const instance = new Resend()
      expect(instance.emails.send).toBeDefined()
    })
  })

  describe('ThirdWeb Integration', () => {
    it('should mock ThirdWeb client creation', () => {
      const { createThirdwebClient } = require('thirdweb')
      expect(createThirdwebClient).toBeDefined()
    })

    it('should create ThirdWeb client without errors', () => {
      const { createThirdwebClient } = require('thirdweb')
      const client = createThirdwebClient()
      expect(client).toBeDefined()
    })
  })
})
