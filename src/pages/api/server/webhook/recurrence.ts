/* eslint-disable no-restricted-syntax */
import { NextApiRequest, NextApiResponse } from 'next'

import { syncAllSeries, updateAllRecurringSlots } from '@/utils/database'
const TIMEOUT_MS = 25000
export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const startTime = Date.now()
      const jobId = `recurrence-${Date.now()}`

      console.log('[RecurrenceSync] Starting', { jobId })

      const syncPromise = Promise.allSettled([
        updateAllRecurringSlots().catch(err => {
          console.error('[RecurrenceSync] updateAllRecurringSlots failed', {
            jobId,
            error: err.message,
            stack: err.stack,
          })
        }),
        syncAllSeries().catch(err => {
          console.error('[RecurrenceSync] syncAllSeries failed', {
            jobId,
            error: err.message,
            stack: err.stack,
          })
        }),
      ])

      const timeoutPromise = new Promise<'timeout'>(resolve =>
        setTimeout(() => resolve('timeout'), TIMEOUT_MS)
      )

      const raceResult = await Promise.race([
        syncPromise.then(() => 'completed' as const),
        timeoutPromise,
      ])

      const elapsed = Date.now() - startTime

      if (raceResult === 'timeout') {
        // job Still running in background
        console.log('[RecurrenceSync] Timeout - job continues in background', {
          jobId,
          elapsed_ms: elapsed,
        })

        return res.status(202).json({
          success: true,
          message: 'Recurrence sync started (processing in background)',
          job_id: jobId,
          elapsed_ms: elapsed,
          status: 'processing',
        })
      }

      const results = await syncPromise
      const failed = results.filter(r => r.status === 'rejected')

      console.log('[RecurrenceSync] Completed', {
        jobId,
        elapsed_ms: elapsed,
        failures: failed.length,
      })

      if (failed.length > 0) {
        console.error('[RecurrenceSync] Partial failure', {
          jobId,
          errors: failed.map((f: PromiseRejectedResult) => f.reason?.message),
        })
      }

      return res.status(200).json({
        success: true,
        message: 'Recurrence sync completed',
        job_id: jobId,
        elapsed_ms: elapsed,
        partial_failure: failed.length > 0,
      })
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
