import * as Sentry from '@sentry/nextjs'
import { 
  internalFetch, 
  scheduleMeeting, 
  cancelMeeting, 
  getAccount,
  saveAccountChanges 
} from '@/utils/api_helper'
import { 
  ApiFetchError,
  TimeNotAvailableError,
  AllMeetingSlotsUsedError,
  AccountNotFoundError,
  ServiceUnavailableError,
  TransactionIsRequired,
  MeetingCreationError,
  GateConditionNotValidError
} from '@/utils/errors'
import { queryClient } from '@/utils/react_query'

// Mock dependencies
jest.mock('@sentry/nextjs')
jest.mock('@/utils/react_query', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    fetchQuery: jest.fn(),
  },
}))

describe('api_helper - internalFetch retry logic', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('retry on 5xx errors', () => {
    it('retries on 500 error up to 3 times and succeeds', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ 
          status: 500, 
          ok: false, 
          text: async () => 'Server error' 
        })
        .mockResolvedValueOnce({ 
          status: 500, 
          ok: false, 
          text: async () => 'Server error' 
        })
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ success: true }) 
        })

      const result = await internalFetch('/test', 'GET', {}, {}, {}, false, true, 3)

      expect(global.fetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: true })
    })

    it('retries on 502 Bad Gateway error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ 
          status: 502, 
          ok: false, 
          text: async () => 'Bad Gateway' 
        })
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ data: 'ok' }) 
        })

      const result = await internalFetch('/test', 'GET', {}, {}, {}, false, true, 3)

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ data: 'ok' })
    })

    it('retries on 503 Service Unavailable error', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ 
          status: 503, 
          ok: false, 
          text: async () => 'Service Unavailable' 
        })
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ status: 'available' }) 
        })

      const result = await internalFetch('/test', 'GET')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ status: 'available' })
    })

    it('throws error when max retries exhausted on 500 errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 500, 
        ok: false, 
        text: async () => 'Server error' 
      })

      await expect(
        internalFetch('/test', 'GET', {}, {}, {}, false, true, 3)
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(4) // initial + 3 retries
    })

    it('handles 504 Gateway Timeout and throws ServiceUnavailableError', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 504, 
        ok: false, 
        text: async () => 'Gateway Timeout' 
      })

      await expect(
        internalFetch('/test', 'GET', {}, {}, {}, false, true, 3)
      ).rejects.toThrow(ServiceUnavailableError)

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('retry on network errors', () => {
    it('retries on "Failed to fetch" network error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ success: true }) 
        })

      const result = await internalFetch('/test', 'GET')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('retries on "Network request failed" error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('Network request failed'))
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ data: 'success' }) 
        })

      const result = await internalFetch('/test', 'GET')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ data: 'success' })
    })

    it('retries on NetworkError', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('NetworkError when attempting to fetch resource'))
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ result: 'ok' }) 
        })

      const result = await internalFetch('/test', 'GET')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ result: 'ok' })
    })

    it('retries on timeout error', async () => {
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new TypeError('timeout'))
        .mockResolvedValueOnce({ 
          status: 200, 
          ok: true, 
          json: async () => ({ completed: true }) 
        })

      const result = await internalFetch('/test', 'GET')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ completed: true })
    })

    it('throws error when max retries exhausted on network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(
        internalFetch('/test', 'GET', {}, {}, {}, false, true, 3)
      ).rejects.toThrow(TypeError)

      expect(global.fetch).toHaveBeenCalledTimes(4) // initial + 3 retries
    })
  })

  describe('does NOT retry on 4xx errors', () => {
    it('does not retry on 400 Bad Request error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 400, 
        ok: false, 
        text: async () => 'Bad Request' 
      })

      await expect(
        internalFetch('/test', 'GET', {}, {}, {}, false, true, 3)
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1) // no retries
    })

    it('does not retry on 401 Unauthorized error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 401, 
        ok: false, 
        text: async () => 'Unauthorized' 
      })

      await expect(
        internalFetch('/test', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 404 Not Found error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 404, 
        ok: false, 
        text: async () => 'Not Found' 
      })

      await expect(
        internalFetch('/test', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 409 Conflict error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 409, 
        ok: false, 
        text: async () => 'Conflict' 
      })

      await expect(
        internalFetch('/test', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not retry on 429 Too Many Requests error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 429, 
        ok: false, 
        text: async () => 'Too Many Requests' 
      })

      await expect(
        internalFetch('/test', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('does not send 404 errors on /accounts to Sentry', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 404, 
        ok: false, 
        text: async () => 'Not Found' 
      })

      await expect(
        internalFetch('/accounts/testuser', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('sends 404 errors on non-/accounts paths to Sentry', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 404, 
        ok: false, 
        text: async () => 'Not Found' 
      })

      await expect(
        internalFetch('/meetings/123', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('retry behavior settings', () => {
    it('does not retry when withRetry is false', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 500, 
        ok: false, 
        text: async () => 'Server error' 
      })

      await expect(
        internalFetch('/test', 'GET', {}, {}, {}, false, false, 3)
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('respects custom remainingRetries parameter', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 500, 
        ok: false, 
        text: async () => 'Server error' 
      })

      await expect(
        internalFetch('/test', 'GET', {}, {}, {}, false, true, 1)
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(2) // initial + 1 retry
    })

    it('uses default remainingRetries of 3', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 500, 
        ok: false, 
        text: async () => 'Server error' 
      })

      await expect(
        internalFetch('/test', 'GET')
      ).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(4) // initial + 3 retries
    })
  })

  describe('request construction', () => {
    it('sends JSON request with correct headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 200, 
        ok: true, 
        json: async () => ({ success: true }) 
      })

      const body = { name: 'test' }
      await internalFetch('/test', 'POST', body)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(body),
        })
      )
    })

    it('sends FormData request without Content-Type header', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 200, 
        ok: true, 
        json: async () => ({ success: true }) 
      })

      const formData = new FormData()
      formData.append('file', 'test')
      
      await internalFetch('/upload', 'POST', formData, {}, {}, true)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/upload'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.not.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: formData,
        })
      )
    })

    it('includes custom headers', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 200, 
        ok: true, 
        json: async () => ({ success: true }) 
      })

      const customHeaders = { Authorization: 'Bearer token123' }
      await internalFetch('/test', 'GET', {}, {}, customHeaders)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining(customHeaders),
        })
      )
    })

    it('includes request options', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ 
        status: 200, 
        ok: true, 
        json: async () => ({ success: true }) 
      })

      const signal = new AbortController().signal
      await internalFetch('/test', 'GET', {}, { signal })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal,
        })
      )
    })
  })
})

describe('api_helper - scheduleMeeting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('successfully schedules a meeting', async () => {
    const mockSlot = {
      id: 'slot123',
      start_time: '2024-01-01T10:00:00Z',
      end_time: '2024-01-01T11:00:00Z',
    } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockSlot 
    })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    const result = await scheduleMeeting(meeting)

    expect(result).toEqual(mockSlot)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/secure/meetings'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(meeting),
      })
    )
  })

  it('throws TimeNotAvailableError on 409 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 409, 
      ok: false, 
      text: async () => 'Time not available' 
    })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    await expect(scheduleMeeting(meeting)).rejects.toThrow(TimeNotAvailableError)
  })

  it('throws AllMeetingSlotsUsedError on 402 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 402, 
      ok: false, 
      text: async () => 'All meeting slots used' 
    })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    await expect(scheduleMeeting(meeting)).rejects.toThrow(AllMeetingSlotsUsedError)
  })

  it('throws TransactionIsRequired on 400 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 400, 
      ok: false, 
      text: async () => 'Transaction required' 
    })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    await expect(scheduleMeeting(meeting)).rejects.toThrow(TransactionIsRequired)
  })

  it('throws MeetingCreationError on 412 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 412, 
      ok: false, 
      text: async () => 'Precondition failed' 
    })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    await expect(scheduleMeeting(meeting)).rejects.toThrow(MeetingCreationError)
  })

  it('throws GateConditionNotValidError on 403 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 403, 
      ok: false, 
      text: async () => 'Gate condition not valid' 
    })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    await expect(scheduleMeeting(meeting)).rejects.toThrow(GateConditionNotValidError)
  })

  it('retries on 500 error and succeeds', async () => {
    const mockSlot = {
      id: 'slot123',
      start_time: '2024-01-01T10:00:00Z',
    } as any

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ 
        status: 500, 
        ok: false, 
        text: async () => 'Server error' 
      })
      .mockResolvedValueOnce({ 
        status: 200, 
        ok: true, 
        json: async () => mockSlot 
      })

    const meeting = {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
      title: 'Test Meeting',
    } as any

    const result = await scheduleMeeting(meeting)

    expect(result).toEqual(mockSlot)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('api_helper - cancelMeeting', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('successfully cancels a meeting', async () => {
    const mockResponse = { removed: ['event1', 'event2'] } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockResponse 
    })

    const meeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      start_time: '2024-01-01T10:00:00Z',
    } as any

    const result = await cancelMeeting(meeting, 'America/New_York')

    expect(result).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/secure/meetings/meeting123'),
      expect.objectContaining({
        method: 'DELETE',
      })
    )
  })

  it('throws TimeNotAvailableError on 409 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 409, 
      ok: false, 
      text: async () => 'Conflict' 
    })

    const meeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      start_time: '2024-01-01T10:00:00Z',
    } as any

    await expect(
      cancelMeeting(meeting, 'America/New_York')
    ).rejects.toThrow(TimeNotAvailableError)
  })

  it('throws MeetingCreationError on 412 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 412, 
      ok: false, 
      text: async () => 'Precondition failed' 
    })

    const meeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      start_time: '2024-01-01T10:00:00Z',
    } as any

    await expect(
      cancelMeeting(meeting, 'America/New_York')
    ).rejects.toThrow(MeetingCreationError)
  })

  it('includes timezone in request body', async () => {
    const mockResponse = { removed: [] } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockResponse 
    })

    const meeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      start_time: '2024-01-01T10:00:00Z',
    } as any

    await cancelMeeting(meeting, 'Europe/London')

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('Europe/London'),
      })
    )
  })

  it('retries on network error and succeeds', async () => {
    const mockResponse = { removed: ['event1'] } as any

    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({ 
        status: 200, 
        ok: true, 
        json: async () => mockResponse 
      })

    const meeting = {
      id: 'meeting123',
      title: 'Test Meeting',
      start_time: '2024-01-01T10:00:00Z',
    } as any

    const result = await cancelMeeting(meeting, 'America/New_York')

    expect(result).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})

describe('api_helper - getAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  it('successfully retrieves an account', async () => {
    const mockAccount = {
      address: 'user@example.com',
      name: 'Test User',
      bio: 'Test bio',
    } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockAccount 
    })

    const result = await getAccount('user@example.com')

    expect(result).toEqual(mockAccount)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/user@example.com'),
      expect.any(Object)
    )
  })

  it('throws AccountNotFoundError on 404 status', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 404, 
      ok: false, 
      text: async () => 'Not Found' 
    })

    await expect(getAccount('nonexistent@example.com')).rejects.toThrow(
      AccountNotFoundError
    )
  })

  it('throws AccountNotFoundError when response is null', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => null 
    })

    await expect(getAccount('user@example.com')).rejects.toThrow(
      AccountNotFoundError
    )
  })

  it('retries on 500 error and succeeds', async () => {
    const mockAccount = {
      address: 'user@example.com',
      name: 'Test User',
    } as any

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ 
        status: 500, 
        ok: false, 
        text: async () => 'Server error' 
      })
      .mockResolvedValueOnce({ 
        status: 200, 
        ok: true, 
        json: async () => mockAccount 
      })

    const result = await getAccount('user@example.com')

    expect(result).toEqual(mockAccount)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('propagates other errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 401, 
      ok: false, 
      text: async () => 'Unauthorized' 
    })

    await expect(getAccount('user@example.com')).rejects.toThrow(ApiFetchError)
  })
})

describe('api_helper - saveAccountChanges', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    ;(queryClient.invalidateQueries as jest.Mock).mockResolvedValue(undefined)
  })

  it('successfully saves account changes', async () => {
    const mockAccount = {
      address: 'user@example.com',
      name: 'Updated User',
      bio: 'Updated bio',
    } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockAccount 
    })

    const result = await saveAccountChanges(mockAccount)

    expect(result).toEqual(mockAccount)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/secure/accounts'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(mockAccount),
      })
    )
  })

  it('invalidates query cache after successful save', async () => {
    const mockAccount = {
      address: 'user@example.com',
      name: 'Updated User',
    } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockAccount 
    })

    await saveAccountChanges(mockAccount)

    expect(queryClient.invalidateQueries).toHaveBeenCalled()
  })

  it('throws error on validation failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 400, 
      ok: false, 
      text: async () => 'Validation error' 
    })

    const account = {
      address: 'invalid',
      name: '',
    } as any

    await expect(saveAccountChanges(account)).rejects.toThrow(ApiFetchError)
  })

  it('retries on 503 error and succeeds', async () => {
    const mockAccount = {
      address: 'user@example.com',
      name: 'Updated User',
    } as any

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ 
        status: 503, 
        ok: false, 
        text: async () => 'Service Unavailable' 
      })
      .mockResolvedValueOnce({ 
        status: 200, 
        ok: true, 
        json: async () => mockAccount 
      })

    const result = await saveAccountChanges(mockAccount)

    expect(result).toEqual(mockAccount)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })

  it('does not retry on 400 validation errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 400, 
      ok: false, 
      text: async () => 'Bad Request' 
    })

    const account = {
      address: 'user@example.com',
      name: '',
    } as any

    await expect(saveAccountChanges(account)).rejects.toThrow(ApiFetchError)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('normalizes email address to lowercase when invalidating cache', async () => {
    const mockAccount = {
      address: 'User@Example.COM',
      name: 'Test User',
    } as any

    (global.fetch as jest.Mock).mockResolvedValue({ 
      status: 200, 
      ok: true, 
      json: async () => mockAccount 
    })

    await saveAccountChanges(mockAccount)

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringMatching(/user@example\.com/)
      ])
    )
  })
})
