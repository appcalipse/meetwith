const baseURL = process.env.NEXT_PUBLIC_HOSTED_AT!.replace(/\/$/, '')

const apiUrl = `${baseURL}/api`

const isProduction = process.env.NEXT_PUBLIC_ENV === 'production'

const appUrl = baseURL

const DEFAULT_MESSAGE = (nonce: number) =>
  `Welcome to Meet with Wallet!\n\nPlease sign this message to prove you are the owner of your account and enable your data to be encrypted and private.\n\nDon't worry, no actual transaction, gas or assets will be used for it.\n\nYour unique number is ${nonce}`

const YEAR_DURATION_IN_SECONDS = 31536000

const MWW_DISCORD_SERVER = 'https://discord.gg/an2q4xUkcR'

const discordRedirectUrl = `${baseURL}/dashboard/notifications?discordResult=true`

export {
  apiUrl,
  appUrl,
  DEFAULT_MESSAGE,
  discordRedirectUrl,
  isProduction,
  MWW_DISCORD_SERVER,
  YEAR_DURATION_IN_SECONDS,
}
