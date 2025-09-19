const baseURL =
  typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_HOSTED_AT!.replace(/\/$/, '')
    : window.location.origin

const apiUrl = `${baseURL}/api`

const isProduction = process.env.NEXT_PUBLIC_ENV === 'production'

const appUrl = baseURL

const DEFAULT_MESSAGE = (nonce: number) =>
  `Welcome to Meet with Wallet!\n\nPlease sign this message to prove you are the owner of your account and enable your data to be encrypted and private.\n\nDon't worry, no actual transaction, gas or assets will be used for it.\n\nYour unique number is ${nonce}`

const YEAR_DURATION_IN_SECONDS = 31536000

const MWW_DISCORD_SERVER = 'https://discord.gg/En7BK4vhUF'

const discordRedirectUrl = `${baseURL}/dashboard/details`

const NO_REPLY_EMAIL = 'no-reply@meetwith.xyz'

const WEBHOOK_URL = `${apiUrl}/server/webhook/calendar/sync`

const EMAIL_CHANGE_TOKEN_EXPIRY = '5m'
const PIN_ENABLE_TOKEN_EXPIRY = '5m'
const PIN_RESET_TOKEN_EXPIRY = '5m'
const VERIFICATION_CODE_TOKEN_EXPIRY = '5m'
const TRANSFER_FUNCTION_SELECTOR = '0xa9059cbb'
const VERIFICATION_CODE_COUNTDOWN_SECONDS = 300 // 5 minutes

const VERIFICATION_CODE_EXPIRY_MS = 5 * 60 * 1000

const QUICKPOLL_DEFAULT_LIMIT = 10
const QUICKPOLL_MAX_LIMIT = 50
const QUICKPOLL_DEFAULT_OFFSET = 0

const QUICKPOLL_MIN_DURATION_MINUTES = 15
const QUICKPOLL_MAX_DURATION_MINUTES = 180

const QUICKPOLL_SLUG_MAX_ATTEMPTS = 5
const QUICKPOLL_SLUG_MAX_LENGTH = 30
const QUICKPOLL_SLUG_FALLBACK_LENGTH = 20

const QUICKPOLL_TITLE_MIN_LENGTH = 1
const QUICKPOLL_TITLE_MAX_LENGTH = 200
const QUICKPOLL_DESCRIPTION_MAX_LENGTH = 1000

const QUICKPOLL_EXPIRY_BUFFER_HOURS = 1 // Minimum hours before expiry

const DASHBOARD_ROUTE_PREFIX = '/dashboard'
const SETTINGS_ROUTE_PREFIX = `${DASHBOARD_ROUTE_PREFIX}/details`
const DASHBOARD_SCHEDULE_ROUTE = `${DASHBOARD_ROUTE_PREFIX}/schedule`
const PUBLIC_USERNAME_ROUTE = '/[...address]'
const PUBLIC_ADDRESS_ROUTE = `/address${PUBLIC_USERNAME_ROUTE}`

export enum OnboardingSubject {
  Discord = 'discord',
  DiscordConnectedInPage = 'discord_connected_page',
  DiscordConnectedInModal = 'discord_connected_modal',
  GoogleCalendarConnected = 'google_calendar_connected',
  Office365CalendarConnected = 'office365_calendar_connected',
}

export enum PaymentNotificationType {
  SEND_TOKENS = 'send-tokens',
  RECEIVE_TOKENS = 'receive-tokens',
}

export const COMMON_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'NGN',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'CHF',
] as const

export type CommonCurrency = (typeof COMMON_CURRENCIES)[number]

export const isSupportedCurrency = (
  currency: string
): currency is CommonCurrency => {
  return COMMON_CURRENCIES.includes(currency as CommonCurrency)
}

export const getCurrencyDisplayName = (currency: string): string => {
  const currencyNames: Record<CommonCurrency, string> = {
    USD: 'US Dollar',
    EUR: 'Euro',
    GBP: 'British Pound',
    NGN: 'Nigerian Naira',
    INR: 'Indian Rupee',
    CAD: 'Canadian Dollar',
    AUD: 'Australian Dollar',
    JPY: 'Japanese Yen',
    CHF: 'Swiss Franc',
  }

  return currencyNames[currency as CommonCurrency] || currency
}

export {
  apiUrl,
  appUrl,
  DASHBOARD_ROUTE_PREFIX,
  DASHBOARD_SCHEDULE_ROUTE,
  DEFAULT_MESSAGE,
  discordRedirectUrl,
  EMAIL_CHANGE_TOKEN_EXPIRY,
  isProduction,
  MWW_DISCORD_SERVER,
  NO_REPLY_EMAIL,
  PIN_ENABLE_TOKEN_EXPIRY,
  PIN_RESET_TOKEN_EXPIRY,
  PUBLIC_ADDRESS_ROUTE,
  PUBLIC_USERNAME_ROUTE,
  QUICKPOLL_DEFAULT_LIMIT,
  QUICKPOLL_DEFAULT_OFFSET,
  QUICKPOLL_DESCRIPTION_MAX_LENGTH,
  QUICKPOLL_EXPIRY_BUFFER_HOURS,
  QUICKPOLL_MAX_DURATION_MINUTES,
  QUICKPOLL_MAX_LIMIT,
  QUICKPOLL_MIN_DURATION_MINUTES,
  QUICKPOLL_SLUG_FALLBACK_LENGTH,
  QUICKPOLL_SLUG_MAX_ATTEMPTS,
  QUICKPOLL_SLUG_MAX_LENGTH,
  QUICKPOLL_TITLE_MAX_LENGTH,
  QUICKPOLL_TITLE_MIN_LENGTH,
  SETTINGS_ROUTE_PREFIX,
  TRANSFER_FUNCTION_SELECTOR,
  VERIFICATION_CODE_COUNTDOWN_SECONDS, // Add this to exports
  VERIFICATION_CODE_EXPIRY_MS,
  VERIFICATION_CODE_TOKEN_EXPIRY,
  WEBHOOK_URL,
  YEAR_DURATION_IN_SECONDS,
}
