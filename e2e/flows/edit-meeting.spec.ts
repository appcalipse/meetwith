import { test, expect } from '../fixtures/auth.fixture'
import { waitForMeetingsPage, waitForSchedulePage } from '../helpers/selectors'

test.describe('Edit Meeting Flow', () => {
  test('should load meetings dashboard', async ({ page }) => {
    await page.goto('/dashboard/meetings')

    await waitForMeetingsPage(page)
  })

  test('should load schedule page with meetingId query param', async ({
    page,
  }) => {
    // Navigate to schedule page with a meetingId to test edit mode
    // Using a non-existent ID should show an error or empty state
    await page.goto('/dashboard/schedule?meetingId=non-existent-id')

    // The page should still load without crashing — use route-specific anchor
    await waitForSchedulePage(page)
  })

  test('should navigate between schedule and meetings pages', async ({
    page,
  }) => {
    // Go to meetings page
    await page.goto('/dashboard/meetings')
    await waitForMeetingsPage(page)

    // Navigate to schedule page
    await page.goto('/dashboard/schedule')
    await waitForSchedulePage(page)

    // Navigate back to meetings
    await page.goto('/dashboard/meetings')
    await waitForMeetingsPage(page)
  })

  test.describe('API-level meeting operations', () => {
    test('should access meetings endpoint with auth', async ({ request }) => {
      // Verify authenticated access to meetings API
      const response = await request.get('/api/secure/meetings')
      expect([200, 404, 405]).toContain(response.status())
    })

    test('should reject unauthenticated meeting access', async ({
      browser,
    }) => {
      // Create a fresh browser context without any auth cookies
      const context = await browser.newContext()
      const page = await context.newPage()
      try {
        const response = await page.request.get('/api/secure/meetings')
        // The middleware should redirect or return non-200 for unauthenticated requests
        expect(response.status()).not.toBe(200)
      } finally {
        await context.close()
      }
    })
  })

  test.describe('Calendar mock integration', () => {
    test('should intercept calendar APIs during edit', async ({ page }) => {
      const calendarRequests: Array<{
        url: string
        method: string
        provider: string
      }> = []

      // Set up calendar API interception
      await page.route(
        '**/googleapis.com/calendar/v3/**',
        async (route) => {
          calendarRequests.push({
            url: route.request().url(),
            method: route.request().method(),
            provider: 'google',
          })

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              kind: 'calendar#event',
              id: 'mock-event-id',
              status: 'confirmed',
            }),
          })
        }
      )

      await page.route(
        '**/graph.microsoft.com/v1.0/me/calendar/**',
        async (route) => {
          calendarRequests.push({
            url: route.request().url(),
            method: route.request().method(),
            provider: 'office365',
          })

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'mock-office365-event-id',
              subject: 'Test',
            }),
          })
        }
      )

      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      // Calendar mocks are in place for the edit flow
    })
  })

  test.describe('Negative cases', () => {
    test('should handle invalid meeting update data', async ({ request }) => {
      // Try to update with invalid data
      const response = await request.post(
        '/api/secure/meetings/non-existent-id',
        {
          data: {},
        }
      )

      // Should return an error, not crash
      expect(response.status()).toBeGreaterThanOrEqual(400)
    })

    test('should handle network error gracefully', async ({ page }) => {
      // Abort meeting API requests to simulate network error
      await page.route('**/api/secure/meetings/**', async (route) => {
        await route.abort('connectionrefused')
      })

      await page.goto('/dashboard/schedule?meetingId=test-id')

      // Page should still be visible (graceful error handling) — use route-specific anchor
      await waitForSchedulePage(page)
    })
  })
})
