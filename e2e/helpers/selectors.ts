import { expect, Page } from '@playwright/test'

/**
 * Centralized selectors for E2E tests.
 * data-testid attributes are added to key UI elements for stable test selectors.
 */
export const SELECTORS = {
  // Layout data-testid selectors
  mainContainer: '[data-testid="main-container"]',
  dashboardMeetings: '[data-testid="dashboard-meetings"]',
  dashboardSchedule: '[data-testid="dashboard-schedule"]',
  features: '[data-testid="features"]',
  pricing: '[data-testid="pricing"]',
  changeTheme: '[data-testid="change-theme"]',
  darkMode: '[data-testid="dark-mode"]',
  lightMode: '[data-testid="light-mode"]',

  // Schedule form selectors
  scheduleNowBtn: '[data-testid="schedule-now-btn"]',
  meetingTitleInput: '[data-testid="meeting-title-input"]',
  participantChipInput: '[data-testid="participant-chip-input"]',
  addParticipantsBtn: '[data-testid="add-participants-btn"]',
  providerSelect: '[data-testid="provider-select"]',

  // Invite modal selectors
  inviteModalInput: '[data-testid="invite-modal-input"]',
  inviteModalSave: '[data-testid="invite-modal-save"]',

  // Schedule completed selectors
  scheduleCompleted: '[data-testid="schedule-completed"]',
  viewMeetingsBtn: '[data-testid="view-meetings-btn"]',

  // Schedule grid selectors
  jumpToBestSlot: '[data-testid="jump-to-best-slot"]',
  gridForwardBtn: '[data-testid="grid-forward-btn"]',
  gridBackBtn: '[data-testid="grid-back-btn"]',
  scheduleGrid: '[data-testid="schedule-grid"]',
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
