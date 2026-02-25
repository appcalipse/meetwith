import { expect, test } from '@playwright/test'

import { test as authTest } from '../fixtures/auth.fixture'
import { DEFAULT_MESSAGE } from '../helpers/constants'
import { SELECTORS } from '../helpers/selectors'
import { generateTestWallet } from '../helpers/wallet'

test.describe('Signup Flow', () => {
  test.describe('API-level signup', () => {
    test('should sign up a new wallet and return account with jti', async ({
      request,
    }) => {
      const wallet = generateTestWallet()
      const nonce = Date.now()
      const signature = await wallet.signMessage(nonce)

      const response = await request.post('/api/auth/signup', {
        data: {
          address: wallet.address,
          signature,
          nonce,
          timezone: 'UTC',
        },
      })

      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.address.toLowerCase()).toBe(wallet.address.toLowerCase())
      expect(body.jti).toBeTruthy()
    })

    test('should reject signup with mismatched address', async ({
      request,
    }) => {
      const walletA = generateTestWallet()
      const walletB = generateTestWallet()
      const nonce = Date.now()
      // Sign with wallet A but submit wallet B's address
      const signature = await walletA.signMessage(nonce)

      const response = await request.post('/api/auth/signup', {
        data: {
          address: walletB.address,
          signature,
          nonce,
          timezone: 'UTC',
        },
      })

      expect(response.status()).toBe(401)
    })

    test('should reject signup with empty body', async ({ request }) => {
      const response = await request.post('/api/auth/signup', {
        data: {},
      })

      expect(response.status()).toBe(500)
    })

    test('should set mww_iron cookie on successful signup', async ({
      request,
    }) => {
      const wallet = generateTestWallet()
      const nonce = Date.now()
      const signature = await wallet.signMessage(nonce)

      const response = await request.post('/api/auth/signup', {
        data: {
          address: wallet.address,
          signature,
          nonce,
          timezone: 'UTC',
        },
      })

      expect(response.status()).toBe(200)

      const setCookie = response.headers()['set-cookie'] || ''
      expect(setCookie).toContain('mww_iron')
    })
  })

  test.describe('Landing page UI', () => {
    test('should render landing page with key sections', async ({ page }) => {
      await page.goto('/')

      await expect(page.locator(SELECTORS.mainContainer)).toBeVisible()
      await expect(page.locator(SELECTORS.features)).toBeVisible()
      await expect(page.locator(SELECTORS.pricing)).toBeVisible()
    })

    test('should show wallet connection option in navbar', async ({
      page,
    }) => {
      await page.goto('/')

      // Look for sign in / connect wallet button
      const signInButton = page.getByRole('button', { name: /sign in/i })
      const connectButton = page.getByRole('button', {
        name: /connect.*wallet/i,
      })

      // One of these should be visible
      const hasSignIn = await signInButton.isVisible().catch(() => false)
      const hasConnect = await connectButton.isVisible().catch(() => false)

      expect(hasSignIn || hasConnect).toBeTruthy()
    })
  })

  test.describe('Authenticated state', () => {
    authTest(
      'should redirect authenticated user to dashboard',
      async ({ page }) => {
        await page.goto('/')

        // Authenticated users should be redirected to meetings dashboard
        await page.waitForURL('**/dashboard/**', { timeout: 10_000 })

        await expect(
          page.locator(SELECTORS.dashboardMeetings)
        ).toBeVisible({ timeout: 10_000 })
      }
    )
  })
})
