/** biome-ignore-all lint/suspicious/noConsole: For tracing */
import { request } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { AUTH_STATE_PATH, TEST_DATA_PATH } from './helpers/constants'
import { createTestWallet, generateTestWallet } from './helpers/wallet'

/**
 * Authenticate a wallet via signup (or login if already registered).
 * Returns the request context with the session cookie.
 */
async function authenticateWallet(
  wallet: ReturnType<typeof createTestWallet>,
  baseURL: string
) {
  const nonce = Date.now()
  const signature = await wallet.signMessage(nonce)

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
        `[E2E Setup] Signup returned ${response.status()} for ${wallet.address}, attempting login...`
      )

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

    return requestContext
  } catch (error) {
    await requestContext.dispose()
    throw error
  }
}

async function globalSetup() {
  const baseURL = process.env.BASE_URL || 'http://localhost:3000'

  // Create or use a deterministic test wallet (primary)
  const wallet = process.env.TEST_WALLET_PRIVATE_KEY
    ? createTestWallet(process.env.TEST_WALLET_PRIVATE_KEY)
    : generateTestWallet()

  console.log(
    `[E2E Setup] Using test wallet: ${wallet.address}, ${wallet.privateKey}`
  )

  // Authenticate primary wallet
  const requestContext = await authenticateWallet(wallet, baseURL)

  try {
    // Save storage state (cookies) for authenticated tests
    const authDir = path.dirname(AUTH_STATE_PATH)
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    await requestContext.storageState({ path: AUTH_STATE_PATH })

    // Save test data for cross-test reference
    const testData: Record<string, unknown> = {
      walletAddress: wallet.address,
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
      participants: [] as Array<{ address: string; privateKey: string }>,
    }

    // Register participant wallets if private keys are provided
    const participantKeys = [
      process.env.TEST_PARTICIPANT_1_PRIVATE_KEY,
      process.env.TEST_PARTICIPANT_2_PRIVATE_KEY,
    ].filter(Boolean) as string[]

    const participants: Array<{ address: string; privateKey: string }> = []

    for (const pk of participantKeys) {
      const participantWallet = createTestWallet(pk)
      console.log(
        `[E2E Setup] Registering participant wallet: ${participantWallet.address}`
      )

      const participantCtx = await authenticateWallet(
        participantWallet,
        baseURL
      )
      await participantCtx.dispose()

      participants.push({
        address: participantWallet.address,
        privateKey: participantWallet.privateKey,
      })
    }

    testData.participants = participants
    fs.writeFileSync(TEST_DATA_PATH, JSON.stringify(testData, null, 2))

    console.log('[E2E Setup] Auth state saved successfully')
  } finally {
    await requestContext.dispose()
  }
}

export default globalSetup
