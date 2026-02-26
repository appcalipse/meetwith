import { test as base } from '@playwright/test'

import { AUTH_STATE_PATH } from '../helpers/constants'

/**
 * Extends Playwright's base test with authenticated browser state.
 * Uses the storageState saved during global setup (iron-session cookie).
 */
export const test = base.extend({
  storageState: AUTH_STATE_PATH,
})

export { expect } from '@playwright/test'
