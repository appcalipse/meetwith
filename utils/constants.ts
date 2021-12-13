const apiUrl = process.env.NODE_ENV !== 'production' ? `${window.location.origin}/api` : 'https://meetwithwallet.xyz/api';
const isProduction = process.env.NODE_ENV === 'production';
const DEFAULT_MESSAGE = `Welcome to Meet with Wallet! Please sign this message to make your experience safe.`

export { apiUrl, isProduction, DEFAULT_MESSAGE }