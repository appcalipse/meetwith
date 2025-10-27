interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  backoffFactor?: number
  retryCondition?: (error: unknown) => boolean
}

export class RetryableError extends Error {
  constructor(message: string, public readonly originalError: unknown) {
    super(message)
    this.name = 'RetryableError'
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    backoffFactor = 2,
    retryCondition = (error: unknown) => {
      if (error instanceof Error) {
        return (
          error.message.includes('Network request failed') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('NetworkError') ||
          error.message.includes('timeout')
        )
      }

      if (error && typeof error === 'object' && 'status' in error) {
        return (error as any).status >= 500
      }

      return false
    },
  } = options

  let attempt = 0
  let lastError: unknown

  while (attempt <= maxRetries) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!retryCondition(error) || attempt === maxRetries) {
        throw error
      }

      attempt++

      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt - 1),
        maxDelay
      )
      const jitter = Math.random() * 0.1 * delay // 10% jitter
      const finalDelay = delay + jitter
      if (error instanceof Error) {
        console.warn(
          `Attempt ${attempt}/${maxRetries} failed. Retrying in ${Math.round(
            finalDelay
          )}ms...`,
          error.message
        )
      }
      await new Promise(resolve => setTimeout(resolve, finalDelay))
    }
  }

  throw lastError
}
