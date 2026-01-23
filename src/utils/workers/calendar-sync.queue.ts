import { v4 as uuidv4 } from 'uuid'
import { ZodVoidDef } from 'zod'
import { Account } from '@/types/Account'
import {
  DeleteInstanceRequest,
  MeetingCancelSyncRequest,
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'
import { ExternalCalendarSync } from '../sync_helper'

type CalendarSyncTask<T = void> = {
  id: string
  accountAddress: string
  execute: () => Promise<void>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

class CalendarSyncQueue {
  // biome-ignore lint/suspicious/noExplicitAny: Accept any for generic tasks
  private accountQueues: Map<string, CalendarSyncTask<any>[]> = new Map()
  private activeAccounts: Set<string> = new Set()

  enqueue<T>(accountAddress: string, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const taskId = uuidv4()
      const syncTask: CalendarSyncTask<T> = {
        id: taskId,
        accountAddress,
        execute: async () => {
          try {
            const result = await task()
            resolve(result)
          } catch (error) {
            reject(error)
          }
        },
        resolve,
        reject,
      }

      if (!this.accountQueues.has(accountAddress)) {
        this.accountQueues.set(accountAddress, [])
      }

      this.accountQueues.get(accountAddress)!.push(syncTask)
      this.processQueue(accountAddress)
    })
  }

  private async processQueue(accountAddress: string): Promise<void> {
    if (this.activeAccounts.has(accountAddress)) {
      return
    }

    const queue = this.accountQueues.get(accountAddress)
    if (!queue || queue.length === 0) {
      return
    }

    this.activeAccounts.add(accountAddress)

    const task = queue.shift()!

    try {
      await task.execute()
    } catch (error) {
      console.error(
        `Calendar sync task ${task.id} failed for account ${accountAddress}:`,
        error
      )
    } finally {
      this.activeAccounts.delete(accountAddress)

      if (queue.length > 0) {
        setImmediate(() => this.processQueue(accountAddress))
      } else {
        this.accountQueues.delete(accountAddress)
      }
    }
  }

  getQueueStats() {
    const stats = {
      totalQueues: this.accountQueues.size,
      activeAccounts: this.activeAccounts.size,
      queuedByAccount: {} as Record<string, number>,
    }

    this.accountQueues.forEach((queue, account) => {
      stats.queuedByAccount[account] = queue.length
    })

    return stats
  }
}

const calendarSyncQueue = new CalendarSyncQueue()

/**
 * Queue a calendar sync operation. Multiple events can be processed concurrently,
 * but only one event per account address at a time.
 */
export async function queueCalendarUpdateSync(
  update: MeetingCreationSyncRequest
): Promise<void> {
  return calendarSyncQueue.enqueue(
    update.participantActing.account_address ||
      update.participantActing.guest_email ||
      '',
    async () => {
      return ExternalCalendarSync.update(update)
    }
  )
}
export async function queueCalendarDeleteSync(
  targetAccount: Account['address'][],
  eventIds: string[]
): Promise<void> {
  targetAccount.map(account =>
    calendarSyncQueue.enqueue(account, async () => {
      return ExternalCalendarSync.delete(account, eventIds)
    })
  )
}

export async function queueCalendarInstanceUpdateSync(
  update: MeetingInstanceCreationSyncRequest
): Promise<void> {
  return calendarSyncQueue.enqueue(
    update.participantActing.account_address ||
      update.participantActing.guest_email ||
      '',
    async () => {
      return ExternalCalendarSync.updateInstance(update)
    }
  )
}
export async function queueCalendarInstanceDeleteSync(
  targetAccount: Account['address'][],
  update: DeleteInstanceRequest
): Promise<void> {
  targetAccount.map(account =>
    calendarSyncQueue.enqueue(account, async () => {
      return ExternalCalendarSync.deleteInstance(account, update)
    })
  )
}
