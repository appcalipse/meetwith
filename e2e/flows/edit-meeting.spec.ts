import { test as meetingTest, expect as meetingExpect } from '../fixtures/meeting.fixture'
import { test, expect } from '../fixtures/auth.fixture'
import { SELECTORS, waitForMeetingsPage, waitForSchedulePage } from '../helpers/selectors'
import { TEST_MEETING_TITLE_EDITED } from '../helpers/constants'

test.describe('Edit Meeting Flow', () => {
  test.describe('Update an existing meeting', () => {
    meetingTest('should load a meeting in edit mode, change the title, and update', async ({ page, createMeeting }) => {
      // Create a meeting via API so we have something to edit
      const { meetingId } = await createMeeting({ title: 'Original Title' })

      // Navigate to schedule page in UPDATE mode
      await page.goto(`/dashboard/schedule?meetingId=${meetingId}&intent=UPDATE_MEETING`)
      await waitForSchedulePage(page)

      // The details form should be pre-populated (edit mode opens SCHEDULE_DETAILS directly)
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await meetingExpect(titleInput).toBeVisible({ timeout: 15_000 })

      // Verify the title is pre-filled with the original value
      await meetingExpect(titleInput).toHaveValue('Original Title', { timeout: 10_000 })

      // Clear the title and type a new one
      await titleInput.click()
      await titleInput.fill('')
      await titleInput.fill(TEST_MEETING_TITLE_EDITED)
      await meetingExpect(titleInput).toHaveValue(TEST_MEETING_TITLE_EDITED)

      // Click "Update Meeting"
      const updateBtn = page.locator(SELECTORS.scheduleNowBtn)
      await meetingExpect(updateBtn).toBeVisible()
      await meetingExpect(updateBtn).toContainText('Update Meeting')
      await meetingExpect(updateBtn).toBeEnabled()
      await updateBtn.click()

      // Verify success page says "updated" instead of "scheduled"
      const successContainer = page.locator(SELECTORS.scheduleCompleted)
      await meetingExpect(successContainer).toBeVisible({ timeout: 30_000 })
      await meetingExpect(page.locator('h1')).toContainText('Success!')
      await meetingExpect(successContainer).toContainText('updated')
      await meetingExpect(successContainer).toContainText(TEST_MEETING_TITLE_EDITED)

      // Click "View meetings" and verify we land on the meetings page
      const viewMeetingsBtn = page.locator(SELECTORS.viewMeetingsBtn)
      await meetingExpect(viewMeetingsBtn).toBeVisible()
      await viewMeetingsBtn.click()
      await waitForMeetingsPage(page)
    })

    meetingTest('should allow picking a new time slot during meeting update', async ({ page, createMeeting }) => {
      const { meetingId } = await createMeeting({ title: 'Reschedule Me' })

      await page.goto(`/dashboard/schedule?meetingId=${meetingId}&intent=UPDATE_MEETING`)
      await waitForSchedulePage(page)

      // Wait for the details form to load
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await meetingExpect(titleInput).toBeVisible({ timeout: 15_000 })

      // Click "Back" to go to the time picker
      const backLink = page.getByText('Back').first()
      await meetingExpect(backLink).toBeVisible()
      await backLink.click()

      // The grid should be visible with a "Continue scheduling" button
      const grid = page.locator(SELECTORS.scheduleGrid)
      await meetingExpect(grid).toBeVisible({ timeout: 20_000 })

      // Click a different available slot
      const availableSlot = page.locator('button[data-state="0"]').first()
      await meetingExpect(availableSlot).toBeVisible({ timeout: 15_000 })
      await availableSlot.click()

      // Should return to the details form with the title still present
      await meetingExpect(titleInput).toBeVisible({ timeout: 10_000 })
      await meetingExpect(titleInput).toHaveValue('Reschedule Me')
    })
  })

  test.describe('Cancel an existing meeting', () => {
    meetingTest('should open cancel dialog and confirm cancellation', async ({ page, createMeeting }) => {
      const { meetingId } = await createMeeting({ title: 'Cancel Me' })

      await page.goto(`/dashboard/schedule?meetingId=${meetingId}&intent=UPDATE_MEETING`)
      await waitForSchedulePage(page)

      // Wait for the form to load
      const titleInput = page.locator(SELECTORS.meetingTitleInput)
      await meetingExpect(titleInput).toBeVisible({ timeout: 15_000 })

      // Click "Cancel Meeting" button
      const cancelBtn = page.getByRole('button', { name: /Cancel Meeting/i })
      await meetingExpect(cancelBtn).toBeVisible()
      await cancelBtn.click()

      // A confirmation dialog should appear
      const confirmDialog = page.getByText(/are you sure|confirm|cancel this meeting/i).first()
      await meetingExpect(confirmDialog).toBeVisible({ timeout: 5_000 })

      // Click the confirm/yes button in the dialog
      const confirmBtn = page.getByRole('button', { name: /yes|confirm|cancel/i }).last()
      await confirmBtn.click()

      // Should navigate away from the schedule page (to meetings or show success)
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    })
  })

  test.describe('Edge cases', () => {
    test('should handle non-existent meeting ID gracefully', async ({ page }) => {
      const fakeId = '00000000-0000-4000-8000-000000000000'
      await page.goto(`/dashboard/schedule?meetingId=${fakeId}`)

      // Page should still load without crashing
      await waitForSchedulePage(page)
    })

    test('should handle network error gracefully', async ({ page }) => {
      // Abort meeting API requests to simulate network error
      await page.route('**/api/secure/meetings/**', async route => {
        await route.abort('connectionrefused')
      })

      const fakeId = '00000000-0000-4000-8000-000000000000'
      await page.goto(`/dashboard/schedule?meetingId=${fakeId}`)

      // Page should still be visible despite network error
      await waitForSchedulePage(page)
    })

    test('should reject unauthenticated meeting access', async ({ browser }) => {
      // Create a fresh browser context without any auth cookies
      const context = await browser.newContext()
      const page = await context.newPage()
      try {
        const response = await page.request.get('/api/secure/meetings')
        expect(response.status()).not.toBe(200)
      } finally {
        await context.close()
      }
    })
  })
})
