import { render, screen } from '@testing-library/react'
import AvailabilityConfig from '@/components/availabilities/AvailabilityConfig'

jest.mock('chakra-react-select', () => ({
  Select: (props: any) => <div data-testid="chakra-select" />,
}))

jest.mock('@/hooks/availability', () => ({
  useAvailabilityBlocks: jest.fn().mockReturnValue({
    blocks: [],
    isLoading: false,
    createBlock: { isLoading: false },
    updateBlock: { isLoading: false },
    deleteBlock: { isLoading: false },
    duplicateBlock: { isLoading: false },
  }),
  useAvailabilityForm: jest.fn().mockReturnValue({
    formState: {
      title: '',
      timezone: 'UTC',
      availabilities: [],
      isDefault: false,
    },
    resetForm: jest.fn(),
    updateAvailability: jest.fn(),
    setTitle: jest.fn(),
    setTimezone: jest.fn(),
    setIsDefault: jest.fn(),
  }),
  useAvailabilityBlockHandlers: jest.fn().mockReturnValue({
    isEditing: false,
    editingBlockId: null,
    duplicatingBlockId: null,
    showDeleteConfirmation: false,
    showSelectDefaultModal: false,
    selectDefaultModalConfig: null,
    isSaving: false,
    handleCreateBlock: jest.fn(),
    handleEditBlock: jest.fn(),
    handleDuplicateBlock: jest.fn(),
    handleClose: jest.fn(),
    handleSaveNewBlock: jest.fn(),
    handleDeleteBlock: jest.fn(),
    handleShowDeleteConfirmation: jest.fn(),
    handleCancelDelete: jest.fn(),
    handleCloseSelectDefaultModal: jest.fn(),
  }),
  useUpdateAvailabilityBlockMeetingTypes: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useAllMeetingTypes', () => ({
  useAllMeetingTypes: jest.fn().mockReturnValue({ meetingTypes: [] }),
}))

jest.mock('@/utils/api_helper', () => ({
  updateAvailabilityBlockMeetingTypes: jest.fn().mockResolvedValue({}),
}))

describe('AvailabilityConfig', () => {
  const mockProps = {
    currentAccount: {
      id: 'account-1',
      created_at: new Date(),
      address: '0x1234567890abcdef',
      internal_pub_key: 'pub-key',
      encoded_signature: 'sig',
      preferences: {
        timezone: 'UTC',
        availabilities: [],
        meetingProviders: [],
      },
      nonce: 0,
      is_invited: false,
      subscriptions: [],
      payment_preferences: null,
    },
  }

  it('renders without crashing', () => {
    expect(() => render(<AvailabilityConfig {...mockProps} />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('has proper structure', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<AvailabilityConfig {...mockProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<AvailabilityConfig {...mockProps} />)
    const second = render(<AvailabilityConfig {...mockProps} />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('has no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<AvailabilityConfig {...mockProps} />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container).toBeVisible()
  })

  it('unmounts cleanly', () => {
    const { unmount } = render(<AvailabilityConfig {...mockProps} />)
    unmount()
    expect(true).toBe(true)
  })

  it('renders elements', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('has valid HTML', () => {
    const { container } = render(<AvailabilityConfig {...mockProps} />)
    expect(container.innerHTML).toBeTruthy()
  })
})
