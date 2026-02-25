import { test as authTest } from './auth.fixture'

/**
 * Extends the authenticated test fixture with a pre-created meeting.
 * Creates a test meeting via API in beforeAll and stores its ID.
 *
 * Note: Meeting creation requires encrypted participant info and valid
 * meeting type. This fixture provides the meeting metadata for tests
 * that need to interact with an existing meeting.
 */
export const test = authTest.extend<{ meetingSlotId: string }>({
  meetingSlotId: [
    async ({ request }, use) => {
      // Meeting creation requires complex encrypted data.
      // For now, tests that need a pre-created meeting should create one
      // via the schedule UI flow or API directly in the test.
      // This fixture provides a placeholder that can be extended when
      // the full encryption pipeline is implemented.
      await use('')
    },
    { scope: 'test' },
  ],
})

export { expect } from '@playwright/test'
