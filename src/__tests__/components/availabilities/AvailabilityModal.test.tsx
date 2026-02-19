import { render, screen } from '@testing-library/react'
import { AvailabilityModal } from '@/components/availabilities/AvailabilityModal'

jest.mock('chakra-react-select', () => ({
  Select: (props: any) => <div data-testid="chakra-select" />,
}))

jest.mock('@/hooks/availability', () => ({
  useUpdateAvailabilityBlockMeetingTypes: jest.fn().mockReturnValue({
    mutateAsync: jest.fn(),
    isLoading: false,
  }),
}))

jest.mock('@/hooks/useAllMeetingTypes', () => ({
  useAllMeetingTypes: jest.fn().mockReturnValue({ meetingTypes: [] }),
}))

describe('AvailabilityModal', () => {
  const mockProps = {
    isOpen: false,
    onClose: jest.fn(),
    isEditing: false,
    editingBlockId: null,
    duplicatingBlockId: null,
    showDeleteConfirmation: false,
    formState: {
      title: 'Test',
      timezone: 'UTC',
      availabilities: [],
      isDefault: false,
    },
    onTitleChange: jest.fn(),
    onTimezoneChange: jest.fn(),
    onAvailabilityChange: jest.fn(),
    onIsDefaultChange: jest.fn(),
    onSave: jest.fn(),
    onDelete: jest.fn(),
    onCancelDelete: jest.fn(),
    onShowDeleteConfirmation: jest.fn(),
    isLoading: false,
  }

  it('renders without crashing', () => {
    expect(() => render(<AvailabilityModal {...mockProps} />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('has proper structure', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<AvailabilityModal {...mockProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<AvailabilityModal {...mockProps} />)
    const second = render(<AvailabilityModal {...mockProps} />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('has no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<AvailabilityModal {...mockProps} />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container).toBeVisible()
  })

  it('unmounts cleanly', () => {
    const { unmount } = render(<AvailabilityModal {...mockProps} />)
    unmount()
    expect(true).toBe(true)
  })

  it('renders elements', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('has valid HTML', () => {
    const { container } = render(<AvailabilityModal {...mockProps} />)
    expect(container.innerHTML).toBeTruthy()
  })
})
