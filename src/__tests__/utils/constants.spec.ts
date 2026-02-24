import {
  COMMON_CURRENCIES,
  CONTEXT_EXPIRY_MS,
  DEFAULT_MESSAGE,
  EMAIL_CHANGE_TOKEN_EXPIRY,
  getCurrencyDisplayName,
  isSupportedCurrency,
  NO_REPLY_EMAIL,
  OnboardingSubject,
  PaymentNotificationType,
  QUICKPOLL_DEFAULT_LIMIT,
  QUICKPOLL_MAX_DURATION_MINUTES,
  QUICKPOLL_MIN_DURATION_MINUTES,
  VERIFICATION_CODE_COUNTDOWN_SECONDS,
  YEAR_DURATION_IN_SECONDS,
} from '@/utils/constants'

describe('constants', () => {
  describe('isSupportedCurrency', () => {
    it.each(['USD', 'EUR', 'GBP', 'NGN', 'INR', 'CAD', 'AUD', 'JPY', 'CHF'])(
      'returns true for supported currency %s',
      (currency) => {
        expect(isSupportedCurrency(currency)).toBe(true)
      }
    )

    it.each(['BTC', 'XYZ', ''])('returns false for unsupported currency "%s"', (currency) => {
      expect(isSupportedCurrency(currency)).toBe(false)
    })
  })

  describe('getCurrencyDisplayName', () => {
    it.each([
      ['USD', 'US Dollar'],
      ['EUR', 'Euro'],
      ['GBP', 'British Pound'],
      ['NGN', 'Nigerian Naira'],
      ['INR', 'Indian Rupee'],
      ['CAD', 'Canadian Dollar'],
      ['AUD', 'Australian Dollar'],
      ['JPY', 'Japanese Yen'],
      ['CHF', 'Swiss Franc'],
    ])('returns correct display name for %s', (currency, expected) => {
      expect(getCurrencyDisplayName(currency)).toBe(expected)
    })

    it('returns the input string for unsupported currencies', () => {
      expect(getCurrencyDisplayName('BTC')).toBe('BTC')
      expect(getCurrencyDisplayName('XYZ')).toBe('XYZ')
    })
  })

  describe('DEFAULT_MESSAGE', () => {
    it('returns correct string with nonce interpolated', () => {
      const message = DEFAULT_MESSAGE(12345)
      expect(message).toContain('Welcome to Meet with Wallet!')
      expect(message).toContain('Your unique number is 12345')
    })

    it('produces different strings for different nonces', () => {
      expect(DEFAULT_MESSAGE(1)).not.toBe(DEFAULT_MESSAGE(2))
    })
  })

  describe('constant values', () => {
    it('YEAR_DURATION_IN_SECONDS equals 31536000', () => {
      expect(YEAR_DURATION_IN_SECONDS).toBe(31536000)
    })

    it('EMAIL_CHANGE_TOKEN_EXPIRY equals "5m"', () => {
      expect(EMAIL_CHANGE_TOKEN_EXPIRY).toBe('5m')
    })

    it('VERIFICATION_CODE_COUNTDOWN_SECONDS equals 300', () => {
      expect(VERIFICATION_CODE_COUNTDOWN_SECONDS).toBe(300)
    })

    it('QUICKPOLL_DEFAULT_LIMIT equals 5', () => {
      expect(QUICKPOLL_DEFAULT_LIMIT).toBe(5)
    })

    it('QUICKPOLL_MIN_DURATION_MINUTES equals 15', () => {
      expect(QUICKPOLL_MIN_DURATION_MINUTES).toBe(15)
    })

    it('QUICKPOLL_MAX_DURATION_MINUTES equals 180', () => {
      expect(QUICKPOLL_MAX_DURATION_MINUTES).toBe(180)
    })

    it('NO_REPLY_EMAIL equals "no-reply@meetwith.xyz"', () => {
      expect(NO_REPLY_EMAIL).toBe('no-reply@meetwith.xyz')
    })

    it('CONTEXT_EXPIRY_MS equals 1800000', () => {
      expect(CONTEXT_EXPIRY_MS).toBe(1800000)
    })
  })

  describe('enums', () => {
    describe('OnboardingSubject', () => {
      it('has correct values', () => {
        expect(OnboardingSubject.Discord).toBe('discord')
        expect(OnboardingSubject.DiscordConnectedInPage).toBe('discord_connected_page')
        expect(OnboardingSubject.DiscordConnectedInModal).toBe('discord_connected_modal')
        expect(OnboardingSubject.GoogleCalendarConnected).toBe('google_calendar_connected')
        expect(OnboardingSubject.Office365CalendarConnected).toBe('office365_calendar_connected')
      })
    })

    describe('PaymentNotificationType', () => {
      it('has correct values', () => {
        expect(PaymentNotificationType.SEND_TOKENS).toBe('send-tokens')
        expect(PaymentNotificationType.RECEIVE_TOKENS).toBe('receive-tokens')
      })
    })
  })

  describe('COMMON_CURRENCIES', () => {
    it('is an array of 9 elements', () => {
      expect(COMMON_CURRENCIES).toHaveLength(9)
    })

    it.each(['USD', 'EUR', 'GBP', 'NGN', 'INR', 'CAD', 'AUD', 'JPY', 'CHF'])(
      'contains %s',
      (currency) => {
        expect(COMMON_CURRENCIES).toContain(currency)
      }
    )
  })
})
