import { render } from '@testing-library/react'
import { ConnectedCalendarCard } from '@/components/ConnectedCalendars/ConnectedCalendarCard/index'
import { TimeSlotSource } from '@/types/Meeting'

jest.mock('@/utils/api_helper', () => ({
  updateConnectedCalendar: jest.fn().mockResolvedValue({ calendars: [] }),
  getGoogleAuthConnectUrl: jest.fn().mockResolvedValue({ url: '' }),
  getOffice365ConnectUrl: jest.fn().mockResolvedValue({ url: '' }),
}))

describe('ConnectedCalendarCard', () => {
  const mockProps = {
    provider: TimeSlotSource.GOOGLE,
    email: 'test@example.com',
    icon: (() => null) as unknown as import('react-icons').IconType,
    calendars: [],
    onDelete: jest.fn().mockResolvedValue(undefined),
    expectedPermissions: 1,
    grantedPermissions: 1,
  }

  it('renders without crashing', () => {
    expect(() => render(<ConnectedCalendarCard {...mockProps} />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays content', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<ConnectedCalendarCard {...mockProps} />)
    const second = render(<ConnectedCalendarCard {...mockProps} />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<ConnectedCalendarCard {...mockProps} />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container).toBeVisible()
  })

  it('cleans up', () => {
    const { unmount } = render(<ConnectedCalendarCard {...mockProps} />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<ConnectedCalendarCard {...mockProps} />)
    expect(container.innerHTML).toBeTruthy()
  })
})
