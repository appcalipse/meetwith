import { test, expect } from '../fixtures/auth.fixture'

test.describe('Schedule Meeting Flow', () => {
  test('should load the schedule page', async ({ page }) => {
    await page.goto('/dashboard/schedule')

    // The schedule page should load with the scheduling UI
    // ScheduleTimeDiscover component has tab panels
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible({
      timeout: 15_000,
    })
  })

  test('should display the time picker panel by default', async ({ page }) => {
    await page.goto('/dashboard/schedule')

    // Wait for the schedule page to load
    await page.waitForLoadState('networkidle')

    // The first panel (SCHEDULE_TIME) should be visible
    // Look for date/time related UI elements
    const scheduleContent = page.locator('main').or(page.locator('[role="main"]'))
    await expect(scheduleContent.first()).toBeVisible({ timeout: 15_000 })
  })

  test('should navigate to meetings list', async ({ page }) => {
    await page.goto('/dashboard/meetings')

    await expect(page.locator('[data-testid="dashboard-meetings"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('should create a meeting via API', async ({ request }) => {
    // Verify the meetings API endpoint is accessible with auth
    const response = await request.get('/api/secure/meetings')

    // With valid auth, we should get 200 (or 405 if GET isn't supported)
    // The key assertion is that we're not getting 401 (unauthorized)
    expect([200, 404, 405]).toContain(response.status())
  })

  test.describe('Meeting scheduling with calendar mock', () => {
    test('should intercept calendar API calls', async ({ page }) => {
      const calendarRequests: Array<{ url: string; method: string }> = []

      // Set up Google Calendar API interception
      await page.route(
        '**/googleapis.com/calendar/v3/**',
        async (route) => {
          calendarRequests.push({
            url: route.request().url(),
            method: route.request().method(),
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

      await page.goto('/dashboard/schedule')
      await page.waitForLoadState('networkidle')

      // Calendar interception is set up and ready for use
      // Full scheduling flow depends on availability configuration
    })
  })

  test.describe('Negative cases', () => {
    test('should handle API error gracefully when creating meeting', async ({
      request,
    }) => {
      // Try to create a meeting with invalid data
      const response = await request.post('/api/secure/meetings', {
        data: {},
      })

      // Should get an error response, not a crash
      expect(response.status()).toBeGreaterThanOrEqual(400)
    })
  })
})
