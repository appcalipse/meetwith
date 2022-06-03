const apiUrl =
  process.env.NEXT_PUBLIC_ENV === 'production'
    ? 'https://meetwithwallet.xyz/api'
    : process.env.NEXT_PUBLIC_ENV === 'development'
    ? 'https://meet-with-wallet-git-develop-appcalipse.vercel.app/api'
    : 'http://localhost:3000/api'

const isProduction = process.env.NEXT_PUBLIC_ENV === 'production'

const appUrl =
  process.env.NEXT_PUBLIC_ENV === 'production'
    ? 'https://meetwithwallet.xyz/'
    : process.env.NEXT_PUBLIC_ENV === 'development'
    ? 'https://meet-with-wallet-git-develop-appcalipse.vercel.app/'
    : 'http://localhost:3000/'

const DEFAULT_MESSAGE = (nonce: number) =>
  `Welcome to Meet with Wallet!\n\nPlease sign this message to prove you are the owner of your account and enable your data to be encrypted and private.\n\nDon't worry, no actual transaction, gas or assets will be used for it.\n\nYour unique number is ${nonce}`

const YEAR_DURATION_IN_SECONDS = 31536000

const MWW_DISCORD_SERVER = 'https://discord.gg/an2q4xUkcR'

const discordRedirectUrl =
  process.env.NEXT_PUBLIC_ENV === 'production'
    ? 'https://meetwithwallet.xyz/dashboard/notifications?discordResult=true'
    : process.env.NEXT_PUBLIC_ENV === 'development'
    ? 'https://meet-with-wallet-git-develop-appcalipse.vercel.app/dashboard/notifications?discordResult=true'
    : 'http://localhost:3000/dashboard/notifications?discordResult=true'

export {
  apiUrl,
  appUrl,
  DEFAULT_MESSAGE,
  discordRedirectUrl,
  isProduction,
  MWW_DISCORD_SERVER,
  YEAR_DURATION_IN_SECONDS,
}
