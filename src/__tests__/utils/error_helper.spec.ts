// Mock the createStandaloneToast from Chakra UI before importing
jest.mock('@chakra-ui/react', () => {
  const mockToastFn = jest.fn()
  return {
    createStandaloneToast: jest.fn(() => ({
      toast: mockToastFn,
    })),
  }
})

import { handleApiError } from '@/utils/error_helper'
import { createStandaloneToast } from '@chakra-ui/react'

describe('Error Helper Utils', () => {
  let mockToast: jest.Mock

  beforeEach(() => {
    // Get the mock toast function
    mockToast = (createStandaloneToast() as any).toast
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  describe('handleApiError', () => {
    it('should display toast with error message from plain Error', () => {
      const error = new Error('Something went wrong')
      handleApiError('Test Error', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Something went wrong',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Test Error',
      })
    })

    it('should parse JSON error message with error field', () => {
      const error = new Error(JSON.stringify({ error: 'JSON error message' }))
      handleApiError('JSON Error', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: 'JSON error message',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'JSON Error',
      })
    })

    it('should parse JSON error message with name field', () => {
      const error = new Error(JSON.stringify({ name: 'ValidationError' }))
      handleApiError('Validation Error', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: 'ValidationError',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Validation Error',
      })
    })

    it('should handle non-JSON error messages', () => {
      const error = new Error('Plain text error')
      handleApiError('Plain Error', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Plain text error',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Plain Error',
      })
    })

    it('should handle errors with complex JSON', () => {
      const error = new Error(
        JSON.stringify({
          error: 'Complex error',
          code: 400,
          details: 'More info',
        })
      )
      handleApiError('Complex Error', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Complex error',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Complex Error',
      })
    })

    it('should handle errors without message', () => {
      const error = { message: '' } as Error
      handleApiError('Empty Error', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: '',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Empty Error',
      })
    })
  })
})
