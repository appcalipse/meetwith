import { QueryClient } from '@tanstack/react-query'
import { ApiFetchError } from '@/utils/errors'
import { queryClient } from '@/utils/react_query'

describe('queryClient', () => {
  it('is defined', () => {
    expect(queryClient).toBeDefined()
  })

  it('was constructed via QueryClient', () => {
    // QueryClient is mocked, so verify the constructor was called
    expect(QueryClient).toHaveBeenCalled()
  })

  describe('QueryClient constructor config', () => {
    // Extract the config passed to the mocked QueryClient constructor
    const config = (QueryClient as unknown as jest.Mock).mock.calls[0]?.[0]

    it('was called with defaultOptions', () => {
      expect(config).toBeDefined()
      expect(config.defaultOptions).toBeDefined()
    })

    describe('mutation retry', () => {
      const retryFn = config?.defaultOptions?.mutations?.retry as (
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
      const retryFn = config?.defaultOptions?.queries?.retry as (
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
      const retryDelayFn = config?.defaultOptions?.queries?.retryDelay as (
        attemptIndex: number
      ) => number

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

    describe('query config', () => {
      it('has staleTime of 120000 (2 minutes)', () => {
        expect(config?.defaultOptions?.queries?.staleTime).toBe(120000)
      })

      it('has networkMode online', () => {
        expect(config?.defaultOptions?.queries?.networkMode).toBe('online')
      })

      it('has refetchOnReconnect enabled', () => {
        expect(config?.defaultOptions?.queries?.refetchOnReconnect).toBe(true)
      })

      it('has refetchOnWindowFocus disabled', () => {
        expect(config?.defaultOptions?.queries?.refetchOnWindowFocus).toBe(false)
      })
    })
  })
})
