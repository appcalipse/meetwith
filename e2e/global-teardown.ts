/** biome-ignore-all lint/suspicious/noConsole: For tracing */
import fs from 'fs'

import { AUTH_STATE_PATH, TEST_DATA_PATH } from './helpers/constants'

async function globalTeardown() {
  console.log('[E2E Teardown] Cleaning up test artifacts...')

  // Read test data to identify wallets to clean up
  let testAddresses: string[] = []
  if (fs.existsSync(TEST_DATA_PATH)) {
    try {
      const testData = JSON.parse(fs.readFileSync(TEST_DATA_PATH, 'utf-8'))
      testAddresses.push(testData.walletAddress)
      if (Array.isArray(testData.participants)) {
        for (const p of testData.participants) {
          testAddresses.push(p.address)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  // If Supabase credentials are available, clean up test data
  if (
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_KEY &&
    testAddresses.length > 0
  ) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )

      const lowerAddresses = testAddresses.map(a => a.toLowerCase())

      // Delete slots created by test wallets
      const { error: slotsError } = await supabase
        .from('slots')
        .delete()
        .in('address', lowerAddresses)

      if (slotsError) {
        console.log(
          `[E2E Teardown] Slots cleanup error: ${slotsError.message}`
        )
      } else {
        console.log('[E2E Teardown] Test slots cleaned up')
      }

      // Delete conference_meetings created by test wallets
      const { error: meetingsError } = await supabase
        .from('conference_meetings')
        .delete()
        .in('scheduler_address', lowerAddresses)

      if (meetingsError) {
        console.log(
          `[E2E Teardown] Meetings cleanup error: ${meetingsError.message}`
        )
      } else {
        console.log('[E2E Teardown] Test meetings cleaned up')
      }
    } catch (error) {
      console.log(`[E2E Teardown] Supabase cleanup failed: ${error}`)
    }
  } else {
    console.log(
      '[E2E Teardown] Supabase cleanup skipped — missing credentials or no test addresses'
    )
  }

  // Clean up auth state files
  for (const filePath of [AUTH_STATE_PATH, TEST_DATA_PATH]) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[E2E Teardown] Removed ${filePath}`)
    }
  }

  console.log('[E2E Teardown] Done')
}

export default globalTeardown
