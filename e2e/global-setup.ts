/** biome-ignore-all lint/suspicious/noConsole: For tracing */
import { request } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { AUTH_STATE_PATH, TEST_DATA_PATH } from './helpers/constants'
import { createTestWallet, generateTestWallet } from './helpers/wallet'

async function globalSetup() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'

  // Create or use a deterministic test wallet
  const wallet = process.env.TEST_WALLET_PRIVATE_KEY
    ? createTestWallet(process.env.TEST_WALLET_PRIVATE_KEY)
    : generateTestWallet()

  console.log(
    `[E2E Setup] Using test wallet: ${wallet.address}, ${wallet.privateKey}`
  )

  const nonce = Date.now()
  const signature = await wallet.signMessage(nonce)

  // Create a request context with extended timeout
  const requestContext = await request.newContext({ baseURL, timeout: 60_000 })

  try {
    // Attempt signup
    const response = await requestContext.post('/api/auth/signup', {
      data: {
        address: wallet.address,
        signature,
        nonce,
        timezone: 'UTC',
      },
    })

    if (response.status() !== 200) {
      // If signup fails (account may already exist), try login
      console.log(
        `[E2E Setup] Signup returned ${response.status()}, attempting login...`
      )

      // Fetch nonce from DB
      const nonceResponse = await requestContext.get(
        `/api/auth/signature/${wallet.address}`
      )
      if (nonceResponse.status() !== 200) {
        throw new Error(
          `Failed to fetch nonce for login: ${await nonceResponse.text()}`
        )
      }
      const { nonce: dbNonce } = (await nonceResponse.json()) as {
        nonce: number
      }
      const loginSignature = await wallet.signMessage(dbNonce)

      const loginResponse = await requestContext.post('/api/auth/login', {
        data: {
          identifier: wallet.address,
          signature: loginSignature,
        },
      })

      if (loginResponse.status() !== 200) {
        throw new Error(
          `Login also failed: ${loginResponse.status()} ${await loginResponse.text()}`
        )
      }
    }

    // Save storage state (cookies) for authenticated tests
    const authDir = path.dirname(AUTH_STATE_PATH)
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    await requestContext.storageState({ path: AUTH_STATE_PATH })

    // Save test data for cross-test reference
    const testData = {
      walletAddress: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
    }
    fs.writeFileSync(TEST_DATA_PATH, JSON.stringify(testData, null, 2))

    console.log('[E2E Setup] Auth state saved successfully')
  } finally {
    await requestContext.dispose()
  }
}

export default globalSetup
