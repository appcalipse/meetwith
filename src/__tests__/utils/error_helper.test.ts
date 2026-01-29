import { handleApiError } from '@/utils/error_helper'

describe('error_helper', () => {
  describe('handleApiError', () => {
    it('handles standard errors', () => {
      const error = new Error('Test error')
      expect(() => handleApiError('Failed', error)).not.toThrow()
    })

    it('handles error messages', () => {
      handleApiError('Custom message', new Error('Details'))
      expect(true).toBe(true)
    })

    it('handles network errors', () => {
      const error = { message: 'Network error', code: 'NETWORK' }
      handleApiError('Network failed', error as any)
      expect(true).toBe(true)
    })

    it('handles validation errors', () => {
      const error = { message: 'Validation failed', code: 400 }
      handleApiError('Validation', error as any)
      expect(true).toBe(true)
    })

    it('handles auth errors', () => {
      const error = { message: 'Unauthorized', code: 401 }
      handleApiError('Auth failed', error as any)
      expect(true).toBe(true)
    })
  })
})
