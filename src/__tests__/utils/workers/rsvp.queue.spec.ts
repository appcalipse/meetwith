import { AttendeeStatus } from '@/types/Calendar'

const mockUpdateCalendarRsvpStatus = jest.fn()

jest.mock('@/utils/api_helper', () => ({
  updateCalendarRsvpStatus: (...args: unknown[]) =>
    mockUpdateCalendarRsvpStatus(...args),
}))

// Need to import after mocks are set up
let rsvpQueue: typeof import('@/utils/workers/rsvp.queue')['rsvpQueue']

beforeEach(async () => {
  jest.clearAllMocks()
  // Re-import to get fresh singleton
  jest.resetModules()
  const mod = await import('@/utils/workers/rsvp.queue')
  rsvpQueue = mod.rsvpQueue
})

describe('RSVPQueue', () => {
  const calendarId = 'cal-1'
  const eventId = 'evt-1'
  const email = 'user@example.com'

  it('processes a single RSVP request', async () => {
    mockUpdateCalendarRsvpStatus.mockResolvedValue(undefined)

    await rsvpQueue.enqueue(
      calendarId,
      eventId,
      AttendeeStatus.ACCEPTED,
      email
    )

    expect(mockUpdateCalendarRsvpStatus).toHaveBeenCalledWith(
      calendarId,
      eventId,
      AttendeeStatus.ACCEPTED,
      email,
      undefined
    )
  })

  it('supersedes an older queued request with a newer one', async () => {
    // Make first call slow so the second enqueue happens while first is pending
    mockUpdateCalendarRsvpStatus.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 50))
    )

    const first = rsvpQueue
      .enqueue(calendarId, eventId, AttendeeStatus.ACCEPTED, email)
      .catch(e => e)

    const second = rsvpQueue.enqueue(
      calendarId,
      eventId,
      AttendeeStatus.DECLINED,
      email
    )

    const firstResult = await first
    expect(firstResult).toBeInstanceOf(Error)
    // The first request gets either Superseded (if still in queue) or Aborted (if currently processing)
    expect(['Superseded', 'Aborted']).toContain(firstResult.message)

    await second
  })

  it('rejects with Aborted when abort signal fires', async () => {
    mockUpdateCalendarRsvpStatus.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    )

    const controller = new AbortController()

    const promise = rsvpQueue
      .enqueue(
        calendarId,
        eventId,
        AttendeeStatus.ACCEPTED,
        email,
        controller.signal
      )
      .catch(e => e)

    controller.abort()

    const result = await promise
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('Aborted')
  })

  it('rejects when the API call fails', async () => {
    const apiError = new Error('API failure')
    mockUpdateCalendarRsvpStatus.mockRejectedValue(apiError)

    await expect(
      rsvpQueue.enqueue(calendarId, eventId, AttendeeStatus.ACCEPTED, email)
    ).rejects.toThrow('API failure')
  })

  it('getPendingCount returns 0 when idle', () => {
    expect(rsvpQueue.getPendingCount()).toBe(0)
  })
})
