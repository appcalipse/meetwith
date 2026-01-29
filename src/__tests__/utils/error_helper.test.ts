import { handleApiError } from '../error_helper'
import { isJson } from '../generic_utils'

jest.mock('@chakra-ui/react', () => ({
  createStandaloneToast: () => ({
    toast: jest.fn(),
  }),
}))

jest.mock('../generic_utils', () => ({
  isJson: jest.fn(),
}))

describe('error_helper', () => {
  let mockToast: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    const { createStandaloneToast } = require('@chakra-ui/react')
    mockToast = createStandaloneToast().toast
  })

  describe('handleApiError', () => {
    it('should display error toast with plain message', () => {
      const error = new Error('Simple error message')
      ;(isJson as jest.Mock).mockReturnValue(false)

      handleApiError('Error Title', error)

      expect(mockToast).toHaveBeenCalledWith({
        description: 'Simple error message',
        duration: 5000,
        isClosable: true,
        position: 'top',
        status: 'error',
        title: 'Error Title',
      })
    })

    it('should parse and display JSON error message', () => {
      const jsonError = JSON.stringify({ error: 'JSON error message' })
      const error = new Error(jsonError)
      ;(isJson as jest.Mock).mockReturnValue(true)

      handleApiError('API Error', error)

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'JSON error message',
          title: 'API Error',
        })
      )
    })

    it('should handle JSON with name property', () => {
      const jsonError = JSON.stringify({ name: 'ValidationError' })
      const error = new Error(jsonError)
      ;(isJson as jest.Mock).mockReturnValue(true)

      handleApiError('Validation Failed', error)

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'ValidationError',
        })
      )
    })

    it('should use error property over name property', () => {
      const jsonError = JSON.stringify({ error: 'Error message', name: 'Name message' })
      const error = new Error(jsonError)
      ;(isJson as jest.Mock).mockReturnValue(true)

      handleApiError('Test', error)

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Error message',
        })
      )
    })

    it('should handle non-Error objects', () => {
      const error = { message: 'Object error' }
      ;(isJson as jest.Mock).mockReturnValue(false)

      handleApiError('Object Error', error)

      expect(mockToast).toHaveBeenCalled()
    })

    it('should set correct toast options', () => {
      const error = new Error('Test')
      ;(isJson as jest.Mock).mockReturnValue(false)

      handleApiError('Title', error)

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          duration: 5000,
          isClosable: true,
          position: 'top',
          status: 'error',
        })
      )
    })
  })
})
