// This file is for client-side JWT utilities
// JWT verification happens on the server-side via API endpoints

import { verifyJwtToken } from './api_helper'

interface TokenPayload {
  type: 'reset_pin' | 'enable_pin' | 'change_email'
  account_address: string
  iat: number
  exp: number
  jti: string
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const result = await verifyJwtToken(token)
    return result.token
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

export async function isTokenExpired(token: string): Promise<boolean> {
  try {
    const decoded = await verifyToken(token)
    if (!decoded) {
      return true // Consider invalid tokens as expired
    }

    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  } catch (error) {
    return true // Consider invalid tokens as expired
  }
}
