import { expect, Page } from '@playwright/test'

/**
 * Centralized selectors for E2E tests.
 * Only 8 data-testid attributes exist in the codebase — most selectors
 * rely on accessible roles, text content, and placeholders.
 */
export const SELECTORS = {
  // data-testid selectors (existing in the codebase)
  mainContainer: '[data-testid="main-container"]',
  dashboardMeetings: '[data-testid="dashboard-meetings"]',
  dashboardSchedule: '[data-testid="dashboard-schedule"]',
  features: '[data-testid="features"]',
  pricing: '[data-testid="pricing"]',
  changeTheme: '[data-testid="change-theme"]',
  darkMode: '[data-testid="dark-mode"]',
  lightMode: '[data-testid="light-mode"]',
} as const

/**
 * Wait for the meetings dashboard page to be ready.
 * Asserts the route-specific data-testid container is visible.
 */
export async function waitForMeetingsPage(page: Page, timeout = 10_000) {
  await expect(page.locator(SELECTORS.dashboardMeetings)).toBeVisible({
    timeout,
  })
}

/**
 * Wait for the schedule dashboard page to be ready.
 * Asserts the route-specific data-testid container is visible.
 */
export async function waitForSchedulePage(page: Page, timeout = 15_000) {
  await expect(page.locator(SELECTORS.dashboardSchedule)).toBeVisible({
    timeout,
  })
}
