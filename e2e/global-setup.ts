/** biome-ignore-all lint/suspicious/noConsole: For tracing */
import { request } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { AUTH_STATE_PATH, TEST_DATA_PATH } from './helpers/constants'
import { createTestWallet, generateTestWallet } from './helpers/wallet'

/**
 * Authenticate a wallet via signup (or login if already registered).
 * Returns the request context with the session cookie and the signature
 * used for authentication (needed for localStorage injection).
 */
async function authenticateWallet(
  wallet: ReturnType<typeof createTestWallet>,
  baseURL: string
): Promise<{
  requestContext: import('@playwright/test').APIRequestContext
  signature: string
}> {
  const requestContext = await request.newContext({ baseURL, timeout: 60_000 })

  try {
    // Attempt login first
    const nonceResponse = await requestContext.get(
      `/api/auth/signature/${wallet.address}`
    )
    if (nonceResponse.status() === 200) {
      const { nonce: dbNonce } = (await nonceResponse.json()) as {
        nonce: number
      }
      const loginSignature = await wallet.signMessage(dbNonce)

      const loginResponse = await requestContext.post('/api/auth/login', {
        data: {
          identifier: wallet.address.toLowerCase(),
          signature: loginSignature,
        },
      })

      if (loginResponse.status() === 200) {
        return { requestContext, signature: loginSignature }
      }
    }

    // If login fails or nonce fetch failed, attempt signup
    console.log(
      `[E2E Setup] Login failed for ${wallet.address}, attempting signup...`
    )

    const nonce = Date.now()
    const signature = await wallet.signMessage(nonce)

    const response = await requestContext.post('/api/auth/signup', {
      data: {
        address: wallet.address.toLowerCase(),
        signature,
        nonce,
        timezone: 'UTC',
      },
    })

    if (response.status() !== 200) {
      throw new Error(
        `Signup also failed: ${response.status()} ${await response.text()}`
      )
    }

    return { requestContext, signature }
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
  const { requestContext, signature } = await authenticateWallet(
    wallet,
    baseURL
  )

  try {
    // Save storage state (cookies) for authenticated tests
    const authDir = path.dirname(AUTH_STATE_PATH)
    if (!fs.existsSync(authDir)) {
      fs.mkdirSync(authDir, { recursive: true })
    }

    await requestContext.storageState({ path: AUTH_STATE_PATH })

    // Inject the wallet signature into localStorage in the saved storage state.
    // The app's decryptContent() reads this via getSignature(address) to decrypt
    // meeting data. Without it, the app redirects to /logout.
    const storageState = JSON.parse(fs.readFileSync(AUTH_STATE_PATH, 'utf-8'))
    const origin = baseURL
    const lsEntry = {
      name: `current_user_sig:${wallet.address.toLowerCase()}`,
      value: signature,
    }
    const existingOrigin = storageState.origins?.find(
      (o: { origin: string }) => o.origin === origin
    )
    if (existingOrigin) {
      existingOrigin.localStorage = existingOrigin.localStorage || []
      existingOrigin.localStorage.push(lsEntry)
    } else {
      storageState.origins = storageState.origins || []
      storageState.origins.push({
        origin,
        localStorage: [lsEntry],
      })
    }
    fs.writeFileSync(AUTH_STATE_PATH, JSON.stringify(storageState, null, 2))

    // Save test data for cross-test reference
    const testData: Record<string, unknown> = {
      walletAddress: wallet.address.toLowerCase(),
      privateKey: wallet.privateKey,
      createdAt: new Date().toISOString(),
      participants: [] as Array<{ address: string; privateKey: string }>,
    }

    // Register participant wallets if private keys are provided
    const participantKeys = [
      process.env.TEST_PARTICIPANT_1_PRIVATE_KEY, // b7f66c9deb6adc3203c2095e7442e9fe166fd313726d1a89cc6a02443e4101bc
      process.env.TEST_PARTICIPANT_2_PRIVATE_KEY, // 693a997c15bab4c116e7b88b006b89f31e62fe1e02cff804ae1fe4dd4506153b
    ].filter(Boolean) as string[]
    console.log(participantKeys)
    const participants: Array<{ address: string; privateKey: string }> = []

    for (const pk of participantKeys) {
      const participantWallet = createTestWallet(pk)
      console.log(
        `[E2E Setup] Registering participant wallet: ${participantWallet.address}`
      )

      const { requestContext: participantCtx } = await authenticateWallet(
        participantWallet,
        baseURL
      )
      await participantCtx.dispose()

      participants.push({
        address: participantWallet.address.toLowerCase(),
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
