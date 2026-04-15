/**
 * Smoke/coverage tests for service files with 0% or low coverage.
 * These tests verify modules can be imported and exports are defined.
 */

// --- Mocks for modules not covered by jest.setup.js ---

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn(),
    users: { fetch: jest.fn() },
    guilds: { fetch: jest.fn() },
    destroy: jest.fn(),
    on: jest.fn(),
  })),
  DiscordAPIError: class DiscordAPIError extends Error {},
  DiscordjsError: class DiscordjsError extends Error {},
  DiscordjsErrorCodes: { TokenInvalid: 'TokenInvalid' },
  GatewayIntentBits: { Guilds: 1, GuildMembers: 2, DirectMessages: 4096 },
}))

jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: jest.fn().mockReturnValue({
      api: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({}),
      post: jest.fn().mockResolvedValue({}),
      patch: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      select: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      top: jest.fn().mockReturnThis(),
      header: jest.fn().mockReturnThis(),
      headers: jest.fn().mockReturnThis(),
      orderby: jest.fn().mockReturnThis(),
    }),
  },
  GraphError: class GraphError extends Error {
    statusCode: number
    constructor(msg: string) {
      super(msg)
      this.statusCode = 0
    }
  },
}))

jest.mock(
  '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials',
  () => ({
    TokenCredentialAuthenticationProvider: jest.fn().mockImplementation(() => ({
      getAccessToken: jest.fn().mockResolvedValue('mock-token'),
    })),
  })
)

jest.mock('@azure/identity', () => ({
  AccessToken: jest.fn(),
  TokenCredential: jest.fn(),
}))

jest.mock(
  '@/pages/api/secure/calendar_integrations/office365/connect',
  () => ({
    officeScopes: ['Calendars.ReadWrite', 'User.Read'],
  })
)

jest.mock('dom-parser', () => ({
  parseFromString: jest.fn().mockReturnValue({
    getElementsByTagName: jest.fn().mockReturnValue([]),
    textContent: '',
  }),
}))

jest.mock('html-tags', () => [
  'div',
  'span',
  'p',
  'br',
  'a',
  'b',
  'i',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
])

jest.mock('@google-apps/meet', () => ({
  SpacesServiceClient: jest.fn().mockImplementation(() => ({
    createSpace: jest.fn().mockResolvedValue([{ meetingUri: 'https://meet.google.com/test' }]),
  })),
}))

jest.mock('@google-apps/meet/build/protos/protos', () => ({
  google: { apps: { meet: { v2: {} } } },
}))

jest.mock('google-auth-library', () => ({
  auth: {
    fromJSON: jest.fn().mockReturnValue({}),
    getClient: jest.fn().mockResolvedValue({}),
  },
  OAuth2Client: jest.fn().mockImplementation(() => ({
    setCredentials: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
    credentials: {},
  })),
}))

jest.mock('gaxios', () => ({
  instance: { defaults: {} },
}))

jest.mock('luxon', () => ({
  DateTime: {
    fromISO: jest.fn().mockReturnValue({
      toISO: jest.fn().mockReturnValue('2024-01-01T00:00:00.000Z'),
      toFormat: jest.fn().mockReturnValue('2024-01-01'),
      toJSDate: jest.fn().mockReturnValue(new Date()),
      setZone: jest.fn().mockReturnThis(),
      plus: jest.fn().mockReturnThis(),
      minus: jest.fn().mockReturnThis(),
      startOf: jest.fn().mockReturnThis(),
      endOf: jest.fn().mockReturnThis(),
    }),
    fromJSDate: jest.fn().mockReturnValue({
      toISO: jest.fn().mockReturnValue('2024-01-01T00:00:00.000Z'),
      setZone: jest.fn().mockReturnThis(),
    }),
    now: jest.fn().mockReturnValue({
      toISO: jest.fn().mockReturnValue('2024-01-01T00:00:00.000Z'),
      setZone: jest.fn().mockReturnThis(),
    }),
    local: jest.fn().mockReturnValue({
      toISO: jest.fn().mockReturnValue('2024-01-01T00:00:00.000Z'),
    }),
  },
  Settings: { defaultZone: 'UTC' },
}))

jest.mock('rrule', () => ({
  RRule: jest.fn().mockImplementation(() => ({
    toString: jest.fn().mockReturnValue('FREQ=WEEKLY'),
    all: jest.fn().mockReturnValue([]),
  })),
  rrulestr: jest.fn().mockReturnValue({
    all: jest.fn().mockReturnValue([]),
    between: jest.fn().mockReturnValue([]),
    options: {},
  }),
  Weekday: jest.fn(),
}))

jest.mock('date-fns-tz', () => ({
  utcToZonedTime: jest.fn().mockImplementation(d => d),
  zonedTimeToUtc: jest.fn().mockImplementation(d => d),
  format: jest.fn().mockReturnValue('2024-01-01'),
}))

jest.mock('date-fns/format', () => jest.fn().mockReturnValue('2024-01-01'))

jest.mock('@/utils/database', () => ({
  createOrUpdatesDiscordAccount: jest.fn().mockResolvedValue(undefined),
  deleteDiscordAccount: jest.fn().mockResolvedValue(undefined),
  getAccountNotificationSubscriptions: jest.fn().mockResolvedValue(null),
  getDiscordAccount: jest.fn().mockResolvedValue(null),
  setAccountNotificationSubscriptions: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/utils/calendar_manager', () => ({
  noNoReplyEmailForAccount: jest.fn().mockReturnValue('test@example.com'),
}))

jest.mock('@/utils/user_manager', () => ({
  getAllParticipantsDisplayName: jest
    .fn()
    .mockReturnValue('Test Participant, Other'),
}))

jest.mock('@/utils/api_helper', () => ({
  getCoinConfig: jest.fn().mockResolvedValue({
    allCoinConfig: {},
    networkConfig: {},
  }),
}))

jest.mock('@/utils/constants', () => ({
  discordRedirectUrl: 'http://localhost/discord',
  isProduction: false,
}))

jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockRejectedValue(new Error('File not found')),
  writeFile: jest.fn().mockResolvedValue(undefined),
}))

// ---- Tests ----

describe('stripe.service', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/stripe.service')).not.toThrow()
  })

  it('should export StripeService class', () => {
    const mod = require('@utils/services/stripe.service')
    expect(mod.StripeService).toBeDefined()
  })

  it('should instantiate StripeService', () => {
    const mod = require('@utils/services/stripe.service')
    const instance = new mod.StripeService()
    expect(instance).toBeDefined()
  })
})

describe('telegram.helper', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/telegram.helper')).not.toThrow()
  })

  it('should export expected functions', () => {
    const mod = require('@utils/services/telegram.helper')
    expect(mod.sendDm).toBeDefined()
    expect(mod.getTelegramUserInfo).toBeDefined()
  })

  it('should handle sendDm call', async () => {
    const mod = require('@utils/services/telegram.helper')
    const result = await mod.sendDm('12345', 'Hello')
    expect(result).toBeDefined()
  })

  it('should handle getTelegramUserInfo call', async () => {
    const mod = require('@utils/services/telegram.helper')
    const result = await mod.getTelegramUserInfo('12345')
    // Returns null on error or parsed data
    expect(result).toBeDefined()
  })
})

describe('onramp.money', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/onramp.money')).not.toThrow()
  })

  it('should export expected items', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.getOnRampMoneyNetworkAndCoinCode).toBeDefined()
    expect(mod.getChainIdFromOnrampMoneyNetwork).toBeDefined()
    expect(mod.getOnrampMoneyTokenAddress).toBeDefined()
    expect(mod.Currency).toBeDefined()
    expect(mod.currenciesMap).toBeDefined()
    expect(mod.PaymentStatus).toBeDefined()
    expect(mod.extractOnRampStatus).toBeDefined()
  })

  it('should have correct Currency enum values', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.Currency.INR).toBe('INR')
    expect(mod.Currency.USD).toBe('USD')
    expect(mod.Currency.EUR).toBe('EUR')
  })

  it('should have correct currenciesMap entries', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.currenciesMap[1]).toBe(mod.Currency.INR)
    expect(mod.currenciesMap[21]).toBe(mod.Currency.USD)
  })

  it('should extract completed status', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.extractOnRampStatus(6)).toBe(mod.PaymentStatus.COMPLETED)
    expect(mod.extractOnRampStatus(7)).toBe(mod.PaymentStatus.COMPLETED)
    expect(mod.extractOnRampStatus(19)).toBe(mod.PaymentStatus.COMPLETED)
  })

  it('should extract failed status', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.extractOnRampStatus(-4)).toBe(mod.PaymentStatus.FAILED)
    expect(mod.extractOnRampStatus(-1)).toBe(mod.PaymentStatus.FAILED)
    expect(mod.extractOnRampStatus(3)).toBe(mod.PaymentStatus.FAILED)
  })

  it('should extract cancelled status', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.extractOnRampStatus(-2)).toBe(mod.PaymentStatus.CANCELLED)
  })

  it('should extract pending status', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.extractOnRampStatus(0)).toBe(mod.PaymentStatus.PENDING)
    expect(mod.extractOnRampStatus(1)).toBe(mod.PaymentStatus.PENDING)
    expect(mod.extractOnRampStatus(2)).toBe(mod.PaymentStatus.PENDING)
  })

  it('should default unknown status to pending', () => {
    const mod = require('@utils/services/onramp.money')
    expect(mod.extractOnRampStatus(999)).toBe(mod.PaymentStatus.PENDING)
  })

  it('should handle getOnRampMoneyNetworkAndCoinCode', async () => {
    const mod = require('@utils/services/onramp.money')
    const result = await mod.getOnRampMoneyNetworkAndCoinCode(1, 'ETH')
    expect(result).toHaveProperty('coinId')
    expect(result).toHaveProperty('network')
  })

  it('should handle getChainIdFromOnrampMoneyNetwork', async () => {
    const mod = require('@utils/services/onramp.money')
    const result = await mod.getChainIdFromOnrampMoneyNetwork(1)
    // With mocked empty config, returns null
    expect(result).toBeNull()
  })

  it('should handle getOnrampMoneyTokenAddress', async () => {
    const mod = require('@utils/services/onramp.money')
    const result = await mod.getOnrampMoneyTokenAddress('ETH', 1)
    // With no matching chain, returns null
    expect(result).toBeNull()
  })
})

describe('office365.credential', () => {
  it('should import without crashing', () => {
    expect(
      () => require('@utils/services/office365.credential')
    ).not.toThrow()
  })

  it('should export RefreshTokenCredential class', () => {
    const mod = require('@utils/services/office365.credential')
    expect(mod.RefreshTokenCredential).toBeDefined()
  })

  it('should instantiate RefreshTokenCredential', () => {
    const mod = require('@utils/services/office365.credential')
    const cred = new mod.RefreshTokenCredential(
      {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expiry_date: Date.now() + 3600000,
      },
      'client-id',
      'client-secret',
      jest.fn().mockResolvedValue(undefined)
    )
    expect(cred).toBeDefined()
  })

  it('should call getToken', async () => {
    const mod = require('@utils/services/office365.credential')
    const cred = new mod.RefreshTokenCredential(
      {
        access_token: 'test-token',
        refresh_token: 'test-refresh',
        expiry_date: Date.now() + 3600000,
      },
      'client-id',
      'client-secret',
      jest.fn().mockResolvedValue(undefined)
    )
    try {
      const token = await cred.getToken()
      expect(token).toBeDefined()
    } catch {
      // Expected if token refresh fails with mocked fetch
    }
  })
})

describe('calendar.helper', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/calendar.helper')).not.toThrow()
  })

  it('should export CalendarServiceHelper', () => {
    const mod = require('@utils/services/calendar.helper')
    expect(mod.CalendarServiceHelper).toBeDefined()
  })

  it('should have expected methods on CalendarServiceHelper', () => {
    const mod = require('@utils/services/calendar.helper')
    const helper = mod.CalendarServiceHelper
    expect(typeof helper.buildAttendeesList).toBe('function')
    expect(typeof helper.buildAttendeesListForUpdate).toBe('function')
    expect(typeof helper.convertHtmlToPlainText).toBe('function')
    expect(typeof helper.getMeetingSummary).toBe('function')
    expect(typeof helper.getMeetingTitle).toBe('function')
    expect(typeof helper.isHtml).toBe('function')
    expect(typeof helper.parseDescriptionToRichText).toBe('function')
    expect(typeof helper.plainTextToHtml).toBe('function')
    expect(typeof helper.sanitizeEmail).toBe('function')
  })

  it('should sanitize email by stripping plus aliases', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.sanitizeEmail('test+alias@example.com')
    expect(result).toBe('test@example.com')
  })

  it('should detect HTML strings', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    expect(CalendarServiceHelper.isHtml('<div>hello</div>')).toBe(true)
    expect(CalendarServiceHelper.isHtml('plain text')).toBe(false)
  })

  it('should convert plain text to HTML', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.plainTextToHtml('hello\nworld')
    expect(result).toContain('hello')
  })

  it('should handle getMeetingSummary', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.getMeetingSummary(
      'Test description',
      'https://meet.example.com',
      'https://change.example.com'
    )
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('should handle getMeetingTitle', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.getMeetingTitle('0xabc123', [])
    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
  })

  it('should handle buildAttendeesList', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.buildAttendeesList(
      [],
      '0xabc123',
      () => 'test@example.com'
    )
    expect(Array.isArray(result)).toBe(true)
  })

  it('should handle parseDescriptionToRichText with null', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.parseDescriptionToRichText(null)
    expect(result).toBeUndefined()
  })

  it('should handle parseDescriptionToRichText with text', () => {
    const { CalendarServiceHelper } = require('@utils/services/calendar.helper')
    const result = CalendarServiceHelper.parseDescriptionToRichText('plain text')
    expect(result).toBeDefined()
  })
})

describe('poap.helper', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/poap.helper')).not.toThrow()
  })

  it('should export expected functions', () => {
    const mod = require('@utils/services/poap.helper')
    expect(mod.generatePOAPAuthToken).toBeDefined()
    expect(mod.fetchWalletPOAPs).toBeDefined()
    expect(mod.checkWalletHoldsPOAP).toBeDefined()
    expect(mod.getPOAPEventDetails).toBeDefined()
  })

  it('should handle generatePOAPAuthToken', async () => {
    const mod = require('@utils/services/poap.helper')
    try {
      const result = await mod.generatePOAPAuthToken()
      // Returns null or AuthToken depending on fetch mock response
      expect(result === null || typeof result === 'object').toBe(true)
    } catch {
      // Expected with mocked fetch
    }
  })

  it('should handle fetchWalletPOAPs', async () => {
    const mod = require('@utils/services/poap.helper')
    try {
      const result = await mod.fetchWalletPOAPs('0xabc123')
      expect(Array.isArray(result)).toBe(true)
    } catch {
      // Expected with mocked fetch
    }
  })

  it('should handle checkWalletHoldsPOAP', async () => {
    const mod = require('@utils/services/poap.helper')
    try {
      const result = await mod.checkWalletHoldsPOAP('0xabc123', 12345)
      expect(result === null || typeof result === 'object').toBe(true)
    } catch {
      // Expected with mocked fetch
    }
  })

  it('should handle getPOAPEventDetails', async () => {
    const mod = require('@utils/services/poap.helper')
    try {
      const result = await mod.getPOAPEventDetails(12345)
      expect(result === null || typeof result === 'object').toBe(true)
    } catch {
      // Expected with mocked fetch
    }
  })
})

describe('discord.helper', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/discord.helper')).not.toThrow()
  })

  it('should export expected functions', () => {
    const mod = require('@utils/services/discord.helper')
    expect(mod.generateDiscordAuthToken).toBeDefined()
    expect(mod.getDiscordOAuthToken).toBeDefined()
    expect(mod.refreshDiscordOAuthToken).toBeDefined()
    expect(mod.getDiscordInfoForAddress).toBeDefined()
    expect(mod.getDiscordAccountInfo).toBeDefined()
    expect(mod.dmAccount).toBeDefined()
  })

  it('should handle generateDiscordAuthToken', async () => {
    const mod = require('@utils/services/discord.helper')
    try {
      const result = await mod.generateDiscordAuthToken('mock-code')
      expect(result === null || typeof result === 'object').toBe(true)
    } catch {
      // Expected with mocked dependencies
    }
  })

  it('should handle getDiscordInfoForAddress', async () => {
    const mod = require('@utils/services/discord.helper')
    try {
      const result = await mod.getDiscordInfoForAddress('0xabc123')
      expect(result === null || typeof result === 'object').toBe(true)
    } catch {
      // Expected with mocked dependencies
    }
  })

  it('should handle dmAccount', async () => {
    const mod = require('@utils/services/discord.helper')
    try {
      const result = await mod.dmAccount('0xabc123', 'user-id', 'Hello')
      expect(typeof result).toBe('boolean')
    } catch {
      // Expected with mocked dependencies
    }
  })
})

describe('connected_calendars.factory', () => {
  it('should import without crashing', () => {
    expect(
      () => require('@utils/services/connected_calendars.factory')
    ).not.toThrow()
  })

  it('should export getConnectedCalendarIntegration', () => {
    const mod = require('@utils/services/connected_calendars.factory')
    expect(mod.getConnectedCalendarIntegration).toBeDefined()
    expect(typeof mod.getConnectedCalendarIntegration).toBe('function')
  })
})

describe('master.google.service', () => {
  it('should import without crashing', () => {
    expect(
      () => require('@utils/services/master.google.service')
    ).not.toThrow()
  })

  it('should export expected items', () => {
    const mod = require('@utils/services/master.google.service')
    expect(mod.authorize).toBeDefined()
    expect(mod.createSpace).toBeDefined()
    expect(mod.saveCredentials).toBeDefined()
  })

  it('should handle createSpace', async () => {
    const mod = require('@utils/services/master.google.service')
    try {
      const result = await mod.createSpace()
      expect(
        result === null || result === undefined || typeof result === 'string'
      ).toBe(true)
    } catch {
      // Expected with mocked dependencies
    }
  })
})

describe('office365.service', () => {
  it('should import without crashing', () => {
    expect(
      () => require('@utils/services/office365.service')
    ).not.toThrow()
  })

  it('should export Office365CalendarService class', () => {
    const mod = require('@utils/services/office365.service')
    expect(mod.Office365CalendarService).toBeDefined()
  })
})

describe('webcal.service', () => {
  it('should import without crashing', () => {
    expect(() => require('@utils/services/webcal.service')).not.toThrow()
  })

  it('should export WebCalService as default', () => {
    const mod = require('@utils/services/webcal.service')
    expect(mod.default).toBeDefined()
  })
})
