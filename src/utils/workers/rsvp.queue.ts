// src/utils/workers/rsvp.queue.ts
import { AttendeeStatus } from '@/types/Calendar'
import { updateCalendarRsvpStatus } from '@/utils/api_helper'

type RSVPRequest = {
  calendarId: string
  eventId: string
  status: AttendeeStatus
  attendeeEmail: string
  abortSignal?: AbortSignal
  resolve: (value: void) => void
  reject: (error: unknown) => void
  aborted: boolean
}

class RSVPQueue {
  private queue: Map<string, RSVPRequest> = new Map()
  private processing = false
  private currentRequest: RSVPRequest | null = null
  private readonly minDelay = 200

  async enqueue(
    calendarId: string,
    eventId: string,
    status: AttendeeStatus,
    attendeeEmail: string,
    abortSignal?: AbortSignal
  ): Promise<void> {
    const key = `${calendarId}:${eventId}`

    const existing = this.queue.get(key)
    if (existing) {
      existing.aborted = true
      existing.reject(new Error('Superseded'))
    }

    if (
      this.currentRequest &&
      `${this.currentRequest.calendarId}:${this.currentRequest.eventId}` === key
    ) {
      this.currentRequest.aborted = true
    }

    return new Promise((resolve, reject) => {
      const request: RSVPRequest = {
        calendarId,
        eventId,
        status,
        attendeeEmail,
        abortSignal,
        resolve,
        reject,
        aborted: false,
      }

      if (abortSignal) {
        abortSignal.addEventListener(
          'abort',
          () => {
            request.aborted = true
            this.queue.delete(key)
            reject(new Error('Aborted'))
          },
          { once: true }
        )
      }

      this.queue.set(key, request)
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.size === 0) return

    this.processing = true

    while (this.queue.size > 0) {
      const value = this.queue.entries().next().value
      if (!value) break
      const [key, request] = value
      this.queue.delete(key)

      if (request.aborted || request.abortSignal?.aborted) {
        request.reject(new Error('Aborted'))
        continue
      }

      this.currentRequest = request

      try {
        await updateCalendarRsvpStatus(
          request.calendarId,
          request.eventId,
          request.status,
          request.attendeeEmail,
          request.abortSignal
        )

        if (request.aborted) {
          request.reject(new Error('Aborted'))
          continue
        }

        request.resolve()
      } catch (error) {
        if (request.aborted) {
          request.reject(new Error('Aborted'))
        } else {
          request.reject(error)
        }
      } finally {
        this.currentRequest = null
      }

      if (this.queue.size > 0) {
        await new Promise(resolve => setTimeout(resolve, this.minDelay))
      }
    }

    this.processing = false
  }

  getPendingCount(): number {
    return this.queue.size + (this.currentRequest ? 1 : 0)
  }
}

export const rsvpQueue = new RSVPQueue()
