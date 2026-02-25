import { Page, Route } from '@playwright/test'

import { test as authTest } from './auth.fixture'
import {
  googleCalendarEventResponse,
  office365CalendarEventResponse,
} from '../mocks/calendar-responses'

export interface CalendarRequest {
  url: string
  method: string
  body: Record<string, unknown> | null
  provider: 'google' | 'office365'
}

/**
 * Extends the authenticated test fixture with calendar API mocking.
 * Intercepts Google Calendar and Office 365 API calls at the browser
 * network layer using page.route().
 *
 * Note: Calendar sync typically happens server-side in the API route,
 * so page.route() may not intercept those calls. These mocks are
 * useful for any client-side calendar API interactions.
 */
export const test = authTest.extend<{ calendarRequests: CalendarRequest[] }>({
  calendarRequests: [
    async ({ page }, use) => {
      const requests: CalendarRequest[] = []

      // Intercept Google Calendar API
      await page.route('**/googleapis.com/calendar/v3/**', async (route: Route) => {
        const request = route.request()
        let body: Record<string, unknown> | null = null
        try {
          body = request.postDataJSON()
        } catch {
          // No body or not JSON
        }

        requests.push({
          url: request.url(),
          method: request.method(),
          body,
          provider: 'google',
        })

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(googleCalendarEventResponse),
        })
      })

      // Intercept Office 365 Calendar API
      await page.route(
        '**/graph.microsoft.com/v1.0/me/calendar/**',
        async (route: Route) => {
          const request = route.request()
          let body: Record<string, unknown> | null = null
          try {
            body = request.postDataJSON()
          } catch {
            // No body or not JSON
          }

          requests.push({
            url: request.url(),
            method: request.method(),
            body,
            provider: 'office365',
          })

          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(office365CalendarEventResponse),
          })
        }
      )

      await use(requests)
    },
    { scope: 'test' },
  ],
})

export { expect } from '@playwright/test'
