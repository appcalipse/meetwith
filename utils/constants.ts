const apiUrl = process.env.NODE_ENV !== 'production' ? 'http://localhost:3000/api' : 'https://meetwithwallet.xyz/api';
const isProduction = process.env.NODE_ENV === 'production';

export { apiUrl, isProduction }