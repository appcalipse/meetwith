import { GaxiosError } from 'gaxios'

import {
  RetryableError,
  RetryOptions,
  withRetry,
} from '@/utils/services/retry.service'

// Helper to create GaxiosError-like objects that pass instanceof checks
function createGaxiosError(message: string, opts: { code?: string; status?: number; statusText?: string } = {}): GaxiosError {
  const e = new GaxiosError(message, {})
  if (opts.code) e.code = opts.code
  if (opts.status) {
    e.response = { config: {} as any, data: {}, headers: {}, status: opts.status, statusText: opts.statusText || '' } as any
  }
  return e
}

describe('RetryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('RetryableError', () => {
    it('should create error with message and original error', () => {
      const originalError = new Error('Original')
      const retryableError = new RetryableError('Retry failed', originalError)

      expect(retryableError.message).toBe('Retry failed')
      expect(retryableError.originalError).toBe(originalError)
      expect(retryableError.name).toBe('RetryableError')
    })
  })

  describe('withRetry', () => {
    it('should return result on first successful attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on rate limit errors', async () => {
      const rateLimitError = createGaxiosError('Rate Limit', { status: 403, statusText: 'Forbidden' })

      const operation = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should retry on network errors (ECONNRESET)', async () => {
      const networkError = createGaxiosError('Connection reset', { code: 'ECONNRESET' })

      const operation = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should retry on network errors (ETIMEDOUT)', async () => {
      const networkError = createGaxiosError('Timeout', { code: 'ETIMEDOUT' })

      const operation = jest
        .fn()
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should retry on 500+ status codes', async () => {
      const serverError = createGaxiosError('Server Error', { status: 503, statusText: 'Service Unavailable' })

      const operation = jest
        .fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on non-retryable errors', async () => {
      const clientError = createGaxiosError('Bad Request', { status: 400, statusText: 'Bad Request' })

      const operation = jest.fn().mockRejectedValue(clientError)

      await expect(withRetry(operation)).rejects.toThrow('Bad Request')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should respect maxRetries option', async () => {
      const rateLimitError = createGaxiosError('Rate Limit', { status: 403, statusText: 'Forbidden' })

      const operation = jest.fn().mockRejectedValue(rateLimitError)

      const resultPromise = withRetry(operation, { maxRetries: 2 })

      // Advance through all retry delays
      for (let i = 0; i < 5; i++) {
        await Promise.resolve() // flush microtasks
        jest.advanceTimersByTime(60000) // advance past max delay
        await Promise.resolve()
      }

      await expect(resultPromise).rejects.toThrow('Rate Limit')
      expect(operation).toHaveBeenCalledTimes(3) // initial + 2 retries
    })

    it('should use exponential backoff', async () => {
      const rateLimitError = createGaxiosError('Rate Limit', { status: 403, statusText: 'Forbidden' })

      const operation = jest.fn().mockRejectedValue(rateLimitError)

      const resultPromise = withRetry(operation, {
        backoffFactor: 2,
        baseDelay: 1000,
        maxRetries: 2,
      })

      // Advance through all retry delays
      for (let i = 0; i < 5; i++) {
        await Promise.resolve()
        jest.advanceTimersByTime(60000)
        await Promise.resolve()
      }

      await expect(resultPromise).rejects.toThrow('Rate Limit')
    })

    it('should respect maxDelay option', async () => {
      const rateLimitError = createGaxiosError('Rate Limit', { status: 403, statusText: 'Forbidden' })

      const operation = jest.fn().mockRejectedValue(rateLimitError)

      const resultPromise = withRetry(operation, {
        baseDelay: 1000,
        maxDelay: 2000,
        maxRetries: 5,
      })

      for (let i = 0; i < 10; i++) {
        await Promise.resolve()
        jest.advanceTimersByTime(60000)
        await Promise.resolve()
      }

      await expect(resultPromise).rejects.toThrow('Rate Limit')
    })

    it('should use custom retry condition', async () => {
      const customError = new Error('Custom retryable error')
      const nonRetryableError = new Error('Non-retryable')

      const operation = jest
        .fn()
        .mockRejectedValueOnce(customError)
        .mockRejectedValueOnce(customError)
        .mockResolvedValue('success')

      const customRetryCondition = (error: unknown) =>
        error instanceof Error && error.message.includes('retryable')

      const resultPromise = withRetry(operation, {
        retryCondition: customRetryCondition,
      })
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry with custom condition returning false', async () => {
      const error = new Error('Non-retryable')
      const operation = jest.fn().mockRejectedValue(error)

      const customRetryCondition = () => false

      const resultPromise = withRetry(operation, {
        retryCondition: customRetryCondition,
      })

      await expect(resultPromise).rejects.toThrow('Non-retryable')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should log retry attempts with console.warn', async () => {
      const rateLimitError = createGaxiosError('Rate Limit', { status: 403, statusText: 'Forbidden' })

      const operation = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation, { baseDelay: 1000 })
      await jest.runAllTimersAsync()
      await resultPromise

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Attempt 1/3 failed'),
        'Rate Limit'
      )
    })

    it('should apply jitter to delay', async () => {
      const rateLimitError = createGaxiosError('Rate Limit', { status: 403, statusText: 'Forbidden' })

      const operation = jest.fn().mockRejectedValue(rateLimitError)

      const resultPromise = withRetry(operation, {
        baseDelay: 1000,
        maxRetries: 1,
      })

      for (let i = 0; i < 5; i++) {
        await Promise.resolve()
        jest.advanceTimersByTime(60000)
        await Promise.resolve()
      }

      await expect(resultPromise).rejects.toThrow('Rate Limit')
    })

    it('should handle rate limit with message check', async () => {
      const rateLimitError = createGaxiosError('Rate Limit Exceeded')

      const operation = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
    })

    it('should handle rate limit with error code', async () => {
      const rateLimitError = createGaxiosError('Rate Limited', { code: 'RATE_LIMIT_EXCEEDED' })

      const operation = jest
        .fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
    })

    it('should use default options when none provided', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const resultPromise = withRetry(operation)
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should throw last error after max retries exhausted', async () => {
      const serverError = createGaxiosError('Server Error', { status: 503, statusText: 'Service Unavailable' })

      const operation = jest.fn().mockRejectedValue(serverError)

      const resultPromise = withRetry(operation, { maxRetries: 3 })

      for (let i = 0; i < 10; i++) {
        await Promise.resolve()
        jest.advanceTimersByTime(60000)
        await Promise.resolve()
      }

      await expect(resultPromise).rejects.toThrow('Server Error')
      expect(operation).toHaveBeenCalledTimes(4)
    })

    it('should handle non-Error rejections', async () => {
      const stringError = 'String error'
      const operation = jest
        .fn()
        .mockRejectedValueOnce(stringError)
        .mockResolvedValue('success')

      const customRetryCondition = (error: unknown) => typeof error === 'string'

      const resultPromise = withRetry(operation, {
        retryCondition: customRetryCondition,
      })
      await jest.runAllTimersAsync()
      const result = await resultPromise

      expect(result).toBe('success')
    })
  })
})
