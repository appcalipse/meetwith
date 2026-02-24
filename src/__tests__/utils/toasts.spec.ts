// The jest.setup.js already mocks @chakra-ui/react.
// We just need a reference to the mock toast function.
const mockToast = jest.fn()
jest.mock('@chakra-ui/react', () => ({
  useToast: () => mockToast,
}))

import { useToastHelpers } from '@/utils/toasts'

describe('useToastHelpers', () => {
  beforeEach(() => {
    mockToast.mockClear()
  })

  // We can't use renderHook since the Chakra provider is complex.
  // Instead, test the function factory directly.
  it('should return showSuccessToast, showErrorToast, showInfoToast', () => {
    const helpers = useToastHelpers()

    expect(helpers.showSuccessToast).toBeDefined()
    expect(helpers.showErrorToast).toBeDefined()
    expect(helpers.showInfoToast).toBeDefined()
  })

  it('showSuccessToast should call toast with success status', () => {
    const helpers = useToastHelpers()
    helpers.showSuccessToast('Title', 'Desc')

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        title: 'Title',
        description: 'Desc',
        duration: 3000,
        isClosable: true,
        position: 'top',
      })
    )
  })

  it('showErrorToast should call toast with error status', () => {
    const helpers = useToastHelpers()
    helpers.showErrorToast('Error Title', 'Error Desc')

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        title: 'Error Title',
        description: 'Error Desc',
      })
    )
  })

  it('showInfoToast should call toast with info status', () => {
    const helpers = useToastHelpers()
    helpers.showInfoToast('Info Title', 'Info Desc')

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'info',
        title: 'Info Title',
        description: 'Info Desc',
      })
    )
  })

  it('should use custom duration when provided', () => {
    const helpers = useToastHelpers()
    helpers.showSuccessToast('Title', 'Desc', 5000)

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 5000,
      })
    )
  })
})
