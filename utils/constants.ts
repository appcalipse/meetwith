const apiUrl = process.env.NEXT_PUBLIC_ENV !== 'production' ? (process.env.NEXT_PUBLIC_ENV !== 'development' ? 'http://localhost:3000/api' : 'https://meet-with-wallet-git-develop-appcalipse.vercel.app/') : 'https://meetwithwallet.xyz/api';
const isProduction = process.env.NEXT_PUBLIC_ENV === 'production';
const DEFAULT_MESSAGE = `Welcome to Meet with Wallet! Please sign this message to make your experience safe.`

console.log(process.env.NEXT_PUBLIC_ENV) 
export { apiUrl, isProduction, DEFAULT_MESSAGE }]