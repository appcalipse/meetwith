import { QueryClient } from '@tanstack/react-query'
import { ApiFetchError } from '@/utils/errors'
import { queryClient } from '@/utils/react_query'

describe('queryClient', () => {
  it('is defined', () => {
    expect(queryClient).toBeDefined()
  })

  it('is an instance of QueryClient', () => {
    expect(queryClient).toBeInstanceOf(QueryClient)
  })

  describe('mutation retry', () => {
    const retryFn = queryClient.getDefaultOptions().mutations?.retry as (
      failureCount: number,
      error: Error
    ) => boolean

    it('returns false for ApiFetchError with 400 status', () => {
      expect(retryFn(0, new ApiFetchError(400, 'Bad Request'))).toBe(false)
    })

    it('returns false for ApiFetchError with 404 status', () => {
      expect(retryFn(0, new ApiFetchError(404, 'Not Found'))).toBe(false)
    })

    it('returns false for ApiFetchError with 499 status', () => {
      expect(retryFn(0, new ApiFetchError(499, 'Client Error'))).toBe(false)
    })

    it('returns true for ApiFetchError with 500 status when failureCount < 2', () => {
      expect(retryFn(1, new ApiFetchError(500, 'Server Error'))).toBe(true)
    })

    it('returns false for generic Error when failureCount >= 2', () => {
      expect(retryFn(2, new Error('generic'))).toBe(false)
    })

    it('returns true for generic Error when failureCount < 2', () => {
      expect(retryFn(1, new Error('generic'))).toBe(true)
    })
  })

  describe('query retry', () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: Error
    ) => boolean

    it('returns false for ApiFetchError with 400 status', () => {
      expect(retryFn(0, new ApiFetchError(400, 'Bad Request'))).toBe(false)
    })

    it('returns false for ApiFetchError with 404 status', () => {
      expect(retryFn(0, new ApiFetchError(404, 'Not Found'))).toBe(false)
    })

    it('returns false for ApiFetchError with 499 status', () => {
      expect(retryFn(0, new ApiFetchError(499, 'Client Error'))).toBe(false)
    })

    it('returns true for ApiFetchError with 500 status when failureCount < 3', () => {
      expect(retryFn(2, new ApiFetchError(500, 'Server Error'))).toBe(true)
    })

    it('returns false for generic Error when failureCount >= 3', () => {
      expect(retryFn(3, new Error('generic'))).toBe(false)
    })

    it('returns true for generic Error when failureCount < 3', () => {
      expect(retryFn(2, new Error('generic'))).toBe(true)
    })
  })

  describe('query retryDelay', () => {
    const retryDelayFn = queryClient.getDefaultOptions().queries
      ?.retryDelay as (attemptIndex: number) => number

    it('returns 1000 for attempt index 0', () => {
      expect(retryDelayFn(0)).toBe(1000)
    })

    it('returns 2000 for attempt index 1', () => {
      expect(retryDelayFn(1)).toBe(2000)
    })

    it('returns 4000 for attempt index 2', () => {
      expect(retryDelayFn(2)).toBe(4000)
    })

    it('is capped at 30000', () => {
      expect(retryDelayFn(100)).toBe(30000)
    })
  })

  describe('query staleTime', () => {
    it('equals 120000 (2 minutes)', () => {
      expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(120000)
    })
  })
})
