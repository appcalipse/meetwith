const apiUrl =
  process.env.NEXT_PUBLIC_ENV !== 'production'
    ? process.env.NEXT_PUBLIC_ENV !== 'development'
      ? 'http://localhost:3000/api'
      : 'https://meet-with-wallet-git-develop-appcalipse.vercel.app/api'
    : 'https://meetwithwallet.xyz/api'
const isProduction = process.env.NEXT_PUBLIC_ENV === 'production'
const appUrl =
  process.env.NEXT_PUBLIC_ENV !== 'production'
    ? process.env.NEXT_PUBLIC_ENV !== 'development'
      ? 'http://localhost:3000/'
      : 'https://meet-with-wallet-git-develop-appcalipse.vercel.app/'
    : 'https://meetwithwallet.xyz/'

const DEFAULT_MESSAGE = (nonce: number) =>
  `Welcome to Meet with Wallet!\n\nPlease sign this message to prove you are the owner of your account and enable your data to be encrypted and private.\n\nDon't worry, no actual transaction, gas or assets will be used for it.\n\nYour unique number is ${nonce}`

export { apiUrl, appUrl, DEFAULT_MESSAGE, isProduction }
