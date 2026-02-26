/** biome-ignore-all lint/suspicious/noConsole: For tracing */
import fs from 'fs'

import { AUTH_STATE_PATH, TEST_DATA_PATH } from './helpers/constants'

async function globalTeardown() {
  console.log('[E2E Teardown] Cleaning up test artifacts...')

  // Clean up auth state files
  for (const filePath of [AUTH_STATE_PATH, TEST_DATA_PATH]) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[E2E Teardown] Removed ${filePath}`)
    }
  }

  // If Supabase credentials are available, clean up test data
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    console.log(
      '[E2E Teardown] Supabase cleanup available but skipped — implement if needed'
    )
    // TODO: Delete test accounts and slots from Supabase
  }

  console.log('[E2E Teardown] Done')
}

export default globalTeardown
