/**
 * Centralized selectors for E2E tests.
 * Only 8 data-testid attributes exist in the codebase — most selectors
 * rely on accessible roles, text content, and placeholders.
 */
export const SELECTORS = {
  // data-testid selectors (existing in the codebase)
  mainContainer: '[data-testid="main-container"]',
  dashboardMeetings: '[data-testid="dashboard-meetings"]',
  features: '[data-testid="features"]',
  pricing: '[data-testid="pricing"]',
  changeTheme: '[data-testid="change-theme"]',
  darkMode: '[data-testid="dark-mode"]',
  lightMode: '[data-testid="light-mode"]',
} as const
