import * as Sentry from '@sentry/nextjs'

import { RESEND_RATE_LIMIT_DELAY_MS } from '@/utils/constants'

/**
 * Queue for Resend write operations (e.g. audience/segment updates).
 * Processes one task at a time with a delay between tasks to stay under
 * Resend's 2 req/s limit when multiple users update segments concurrently.
 */
class ResendQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false

  /**
   * Enqueue a task. Returns immediately; the task runs in the background.
   */
  add(task: () => Promise<void>): void {
    this.queue.push(task)
    void this.process()
  }

  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) return

    this.processing = true
    while (this.queue.length > 0) {
      const task = this.queue.shift()!
      try {
        await task()
      } catch (error) {
        console.error('[ResendQueue] Task failed:', error)
        Sentry.captureException(error)
      }
      if (this.queue.length > 0) {
        await new Promise(resolve =>
          setTimeout(resolve, RESEND_RATE_LIMIT_DELAY_MS)
        )
      }
    }
    this.processing = false
  }
}

export const resendQueue = new ResendQueue()
