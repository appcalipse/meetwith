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

const NO_REPLY_EMAIL = 'no-reply@meetwithwallet.xyz'

export enum OnboardingSubject {
  Discord = 'discord',
  DiscordConnectedInPage = 'discord_connected_page',
  DiscordConnectedInModal = 'discord_connected_modal',
  GoogleCalendarConnected = 'google_calendar_connected',
  Office365CalendarConnected = 'office365_calendar_connected',
}

export {
  apiUrl,
  appUrl,
  DEFAULT_MESSAGE,
  discordRedirectUrl,
  isProduction,
  MWW_DISCORD_SERVER,
  NO_REPLY_EMAIL,
  YEAR_DURATION_IN_SECONDS,
}
