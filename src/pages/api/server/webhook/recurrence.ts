/* eslint-disable no-restricted-syntax */
import { NextApiRequest, NextApiResponse } from 'next'

import { syncAllSeries } from '@/utils/database'

const TIMEOUT_MS = 25000
export default async function recurrenceSync(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const startTime = Date.now()
      const jobId = `recurrence-${Date.now()}`

      console.debug('[RecurrenceSync] Starting', { jobId })

      const syncPromise = Promise.allSettled([
        syncAllSeries().catch(err => {
          console.error('[RecurrenceSync] syncAllSeries failed', {
            error: err.message,
            jobId,
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
        console.debug(
          '[RecurrenceSync] Timeout - job continues in background',
          {
            elapsed_ms: elapsed,
            jobId,
          }
        )

        return res.status(202).json({
          elapsed_ms: elapsed,
          job_id: jobId,
          message: 'Recurrence sync started (processing in background)',
          status: 'processing',
          success: true,
        })
      }

      const results = await syncPromise
      const failed = results.filter(r => r.status === 'rejected')

      console.debug('[RecurrenceSync] Completed', {
        elapsed_ms: elapsed,
        failures: failed.length,
        jobId,
      })

      if (failed.length > 0) {
        console.error('[RecurrenceSync] Partial failure', {
          errors: failed.map((f: PromiseRejectedResult) => f.reason?.message),
          jobId,
        })
      }

      return res.status(200).json({
        elapsed_ms: elapsed,
        job_id: jobId,
        message: 'Recurrence sync completed',
        partial_failure: failed.length > 0,
        success: true,
      })
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message })
    }
  }

  return res.status(404).send('Not found')
}
