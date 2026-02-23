import { checkTransactionError } from '@/utils/rpc_helper_front'

describe('rpc_helper_front', () => {
  describe('checkTransactionError', () => {
    it('returns "You rejected the transaction" for user rejected error', () => {
      const error = { details: 'User rejected the request' }
      expect(checkTransactionError(error)).toBe(
        'You rejected the transaction'
      )
    })

    it('returns "You rejected the transaction" for user denied error', () => {
      const error = { details: 'User denied transaction signature' }
      expect(checkTransactionError(error)).toBe(
        'You rejected the transaction'
      )
    })

    it('returns "Insufficient funds" for insufficient balance error', () => {
      const error = { details: 'insufficient funds for gas * price + value' }
      expect(checkTransactionError(error)).toBe('Insufficient funds')
    })

    it('returns the details string for other errors with details', () => {
      const error = { details: 'Some custom RPC error message' }
      expect(checkTransactionError(error)).toBe(
        'Some custom RPC error message'
      )
    })

    it('returns error.message for Error instances without details', () => {
      const error = new Error('Something went wrong')
      expect(checkTransactionError(error)).toBe('Something went wrong')
    })

    it('returns string representation for non-Error values', () => {
      expect(checkTransactionError('string error')).toBe('string error')
    })

    it('handles null/undefined gracefully', () => {
      expect(checkTransactionError(null)).toBe('null')
      expect(checkTransactionError(undefined)).toBe('undefined')
    })

    it('returns error.message for Error with empty details', () => {
      const error = Object.assign(new Error('Fallback message'), {
        details: '',
      })
      expect(checkTransactionError(error)).toBe('Fallback message')
    })
  })
})
