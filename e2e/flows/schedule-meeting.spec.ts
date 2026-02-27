import { Page } from '@playwright/test'
import { test, expect } from '../fixtures/auth.fixture'
import { SELECTORS, waitForMeetingsPage, waitForSchedulePage } from '../helpers/selectors'
import { TEST_MEETING_TITLE } from '../helpers/constants'

/**
 * Helper: add a participant via the invite modal.
 * Meetings require at least one participant beyond the auto-added scheduler,
 * otherwise the backend throws MeetingWithYourselfError.
 */
async function addParticipantViaModal(page: Page, identifier: string) {
  const addParticipantsBtn = page.locator(SELECTORS.addParticipantsBtn)
  await expect(addParticipantsBtn).toBeVisible({ timeout: 10_000 })
  await addParticipantsBtn.click()

  const inviteInput = page.locator(SELECTORS.inviteModalInput)
  await expect(inviteInput).toBeVisible({ timeout: 5_000 })
  await inviteInput.click()
  await inviteInput.fill(identifier)
  await page.keyboard.press('Enter')

  const saveBtn = page.locator(SELECTORS.inviteModalSave)
  await expect(saveBtn).toBeVisible()
  await saveBtn.click()

  // Modal should close
  await expect(inviteInput).not.toBeVisible({ timeout: 5_000 })
}

test.describe('Schedule Meeting Flow', () => {
  test.describe('Grid interaction and navigation', () => {
    test('should click a green time slot and land on the details form', async ({ page }) => {
      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      // Wait for the grid to render with slot buttons
      const grid = page.locator(SELECTORS.scheduleGrid)
      await expect(grid).toBeVisible({ timeout: 20_000 })

      // Find and click the first available (green) slot
      const availableSlot = page.locator('button[data-state="0"]').first()
      await expect(availableSlot).toBeVisible({ timeout: 15_000 })
      await availableSlot.click()

      // After clicking a slot, the details form should appear with the title input
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await expect(titleInput).toBeVisible({ timeout: 10_000 })
    })

    test('should navigate grid forward and back with arrow buttons', async ({ page }) => {
      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      const grid = page.locator(SELECTORS.scheduleGrid)
      await expect(grid).toBeVisible({ timeout: 20_000 })

      // Capture the initial day header text
      const firstDayHeader = grid.locator('text >> nth=0')
      const initialText = await firstDayHeader.textContent()

      // Click the forward arrow
      const forwardBtn = page.locator(SELECTORS.gridForwardBtn)
      await expect(forwardBtn).toBeVisible()
      await forwardBtn.click()

      // Wait for the day header text to change (deterministic wait)
      await expect(firstDayHeader).not.toHaveText(initialText || '', { timeout: 5_000 })
      const updatedText = await firstDayHeader.textContent()
      expect(updatedText).not.toBe(initialText)

      // Click the back arrow to return
      const backBtn = page.locator(SELECTORS.gridBackBtn)
      await expect(backBtn).toBeVisible()
      await backBtn.click()

      // Wait for the day header text to revert back
      await expect(firstDayHeader).toHaveText(initialText || '', { timeout: 5_000 })
    })
  })

  test.describe('Full scheduling with Jitsi', () => {
    test('should add a participant, pick a slot, type a title, select Jitsi, click Schedule, and see Success', async ({ page }) => {
      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      // --- Step 1: Wait for grid and click an available slot ---
      const grid = page.locator(SELECTORS.scheduleGrid)
      await expect(grid).toBeVisible({ timeout: 20_000 })

      const availableSlot = page.locator('button[data-state="0"]').first()
      await expect(availableSlot).toBeVisible({ timeout: 15_000 })
      await availableSlot.click()

      // --- Step 2: Add a participant (required — scheduling with only yourself throws MeetingWithYourselfError) ---
      await addParticipantViaModal(page, 'guest@example.com')

      // --- Step 3: Type a meeting title ---
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await expect(titleInput).toBeVisible({ timeout: 10_000 })
      await titleInput.click()
      await titleInput.fill(TEST_MEETING_TITLE)
      await expect(titleInput).toHaveValue(TEST_MEETING_TITLE)

      // --- Step 4: Select Jitsi Meet as provider ---
      const providerSelect = page.locator(SELECTORS.providerSelect)
      await expect(providerSelect).toBeVisible()
      await providerSelect.click()
      await page.keyboard.type('Jitsi')
      const jitsiOption = page.getByText('Jitsi Meet', { exact: true })
      await jitsiOption.click()

      // --- Step 5: Click "Schedule now" ---
      const scheduleBtn = page.locator(SELECTORS.scheduleNowBtn)
      await expect(scheduleBtn).toBeEnabled({ timeout: 5_000 })
      await scheduleBtn.click()

      // --- Step 6: Verify the success page ---
      const successContainer = page.locator(SELECTORS.scheduleCompleted)
      await expect(successContainer).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('h1')).toContainText('Success!')
      await expect(successContainer).toContainText(TEST_MEETING_TITLE)

      // --- Step 7: Click "View meetings" and verify navigation ---
      const viewMeetingsBtn = page.locator(SELECTORS.viewMeetingsBtn)
      await expect(viewMeetingsBtn).toBeVisible()
      await viewMeetingsBtn.click()

      await waitForMeetingsPage(page)
      await expect(page).toHaveURL(/\/dashboard\/meetings/)
    })
  })

  test.describe('Schedule button validation', () => {
    test('should disable Schedule button when title is empty and enable after typing', async ({ page }) => {
      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      // Pick a time slot first
      const grid = page.locator(SELECTORS.scheduleGrid)
      await expect(grid).toBeVisible({ timeout: 20_000 })

      const availableSlot = page.locator('button[data-state="0"]').first()
      await expect(availableSlot).toBeVisible({ timeout: 15_000 })
      await availableSlot.click()

      // Title input should be visible and empty
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await expect(titleInput).toBeVisible({ timeout: 10_000 })
      await expect(titleInput).toHaveValue('')

      // Schedule button should be disabled (no title — the scheduler is auto-added as a participant)
      const scheduleBtn = page.locator(SELECTORS.scheduleNowBtn)
      await expect(scheduleBtn).toBeDisabled()

      // Type a title — button should become enabled (scheduler counts as participant)
      await titleInput.click()
      await titleInput.fill('Valid Meeting Title')
      await expect(scheduleBtn).toBeEnabled()

      // Clear the title — button should become disabled again
      await titleInput.fill('')
      await expect(scheduleBtn).toBeDisabled()

      // Force-click schedule to trigger "Title is required" validation
      await scheduleBtn.click({ force: true })
      await expect(page.getByText('Title is required')).toBeVisible({ timeout: 3_000 })
    })
  })

  test.describe('Multi-participant scheduling', () => {
    test('should open invite modal, type addresses, save, and complete scheduling', async ({ page }) => {
      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      // --- Step 1: Pick a slot to get to the details form ---
      const grid = page.locator(SELECTORS.scheduleGrid)
      await expect(grid).toBeVisible({ timeout: 20_000 })

      const availableSlot = page.locator('button[data-state="0"]').first()
      await expect(availableSlot).toBeVisible({ timeout: 15_000 })
      await availableSlot.click()

      // --- Step 2: Click "Add participants" icon button to open the modal ---
      const addParticipantsBtn = page.locator(SELECTORS.addParticipantsBtn)
      await expect(addParticipantsBtn).toBeVisible({ timeout: 10_000 })
      await addParticipantsBtn.click()

      // --- Step 3: Type a wallet address in the invite modal input and press Enter ---
      const inviteInput = page.locator(SELECTORS.inviteModalInput)
      await expect(inviteInput).toBeVisible({ timeout: 5_000 })
      await inviteInput.click()
      await inviteInput.fill('0x752b8B86C9252B169fAf2Ab3FA913e0D850AbAfC')
      await page.keyboard.press('Enter')

      // --- Step 4: Type a guest email and press Enter ---
      await inviteInput.click()
      await inviteInput.fill('guest@example.com')
      await page.keyboard.press('Enter')

      // --- Step 5: Click "Save Changes" to close the modal ---
      const saveBtn = page.locator(SELECTORS.inviteModalSave)
      await expect(saveBtn).toBeVisible()
      await saveBtn.click()

      // Modal should close
      await expect(inviteInput).not.toBeVisible({ timeout: 5_000 })

      // --- Step 6: Fill title and select Jitsi ---
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await expect(titleInput).toBeVisible()
      await titleInput.click()
      await titleInput.fill('Multi-Participant E2E Meeting')

      const providerSelect = page.locator(SELECTORS.providerSelect)
      await providerSelect.click()
      await page.keyboard.type('Jitsi')
      const jitsiOption = page.getByText('Jitsi Meet', { exact: true })
      await jitsiOption.click()

      // --- Step 7: Click "Schedule now" ---
      const scheduleBtn = page.locator(SELECTORS.scheduleNowBtn)
      await expect(scheduleBtn).toBeEnabled({ timeout: 5_000 })
      await scheduleBtn.click()

      // --- Step 8: Verify success ---
      const successContainer = page.locator(SELECTORS.scheduleCompleted)
      await expect(successContainer).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('h1')).toContainText('Success!')
      await expect(successContainer).toContainText('Multi-Participant E2E Meeting')
    })
  })

  test.describe('Error handling', () => {
    test('should show error when scheduling API returns 409 conflict', async ({ page }) => {
      await page.goto('/dashboard/schedule')
      await waitForSchedulePage(page)

      // Pick a slot and fill out the form
      const grid = page.locator(SELECTORS.scheduleGrid)
      await expect(grid).toBeVisible({ timeout: 20_000 })
      const availableSlot = page.locator('button[data-state="0"]').first()
      await expect(availableSlot).toBeVisible({ timeout: 15_000 })
      await availableSlot.click()

      // Add a participant first (required for scheduling)
      await addParticipantViaModal(page, 'guest@example.com')

      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await expect(titleInput).toBeVisible({ timeout: 10_000 })
      await titleInput.click()
      await titleInput.fill('Conflict Test Meeting')

      // Intercept the meetings API to return a 409 conflict
      await page.route('**/api/secure/meetings', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 409,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Time not available' }),
          })
        } else {
          await route.continue()
        }
      })

      // Click schedule
      const scheduleBtn = page.locator(SELECTORS.scheduleNowBtn)
      await expect(scheduleBtn).toBeEnabled()
      await scheduleBtn.click()

      // Should NOT navigate to success page
      const successContainer = page.locator(SELECTORS.scheduleCompleted)
      await expect(successContainer).not.toBeVisible({ timeout: 5_000 })

      // An error toast should appear
      await expect(page.getByText(/failed|error|not available/i).first()).toBeVisible({ timeout: 5_000 })
    })

    test('should reject API meeting creation with empty data', async ({ request }) => {
      const response = await request.post('/api/secure/meetings', {
        data: {},
      })

      expect(response.status()).toBeGreaterThanOrEqual(400)
    })
  })
})
