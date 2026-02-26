import { APIRequestContext } from '@playwright/test'

import { TestWallet } from './wallet'

interface SignupResponse {
  address: string
  jti: string
  [key: string]: unknown
}

/**
 * Sign up a test wallet via the API.
 * Returns the signup response and the cookies from the response.
 */
export async function apiSignup(
  request: APIRequestContext,
  wallet: TestWallet,
  baseURL: string
): Promise<{ data: SignupResponse; cookies: string[] }> {
  const nonce = Date.now()
  const signature = await wallet.signMessage(nonce)

  const response = await request.post(`${baseURL}/api/auth/signup`, {
    data: {
      address: wallet.address,
      signature,
      nonce,
      timezone: 'UTC',
    },
  })

  if (response.status() !== 200) {
    const body = await response.text()
    throw new Error(`Signup failed with status ${response.status()}: ${body}`)
  }

  const data = (await response.json()) as SignupResponse
  const cookies = response.headers()['set-cookie']
    ? [response.headers()['set-cookie']]
    : []

  return { data, cookies }
}

/**
 * Login a test wallet via the API.
 * Requires the account's nonce from the DB (fetched via the signature endpoint).
 */
export async function apiLogin(
  request: APIRequestContext,
  wallet: TestWallet,
  baseURL: string
): Promise<{ data: Record<string, unknown>; cookies: string[] }> {
  // Fetch the account's nonce
  const nonceResponse = await request.get(
    `${baseURL}/api/auth/signature/${wallet.address}`
  )
  if (nonceResponse.status() !== 200) {
    throw new Error(
      `Failed to fetch nonce: ${nonceResponse.status()} ${await nonceResponse.text()}`
    )
  }
  const { nonce } = (await nonceResponse.json()) as { nonce: number }

  const signature = await wallet.signMessage(nonce)

  const response = await request.post(`${baseURL}/api/auth/login`, {
    data: {
      identifier: wallet.address,
      signature,
    },
  })

  if (response.status() !== 200) {
    const body = await response.text()
    throw new Error(`Login failed with status ${response.status()}: ${body}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  const cookies = response.headers()['set-cookie']
    ? [response.headers()['set-cookie']]
    : []

  return { data, cookies }
}
