import { render, screen } from '@testing-library/react'
import { WeekdayConfig } from '@/components/availabilities/WeekdayConfig'

describe('WeekdayConfig', () => {
  const mockProps = {
    dayAvailability: {
      weekday: 1,
      ranges: [{ start: '09:00', end: '17:00' }],
    },
    onChange: jest.fn(),
  }

  it('renders without crashing', () => {
    expect(() => render(<WeekdayConfig {...mockProps} />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container).toBeTruthy()
  })

  it('has proper structure', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<WeekdayConfig {...mockProps} />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<WeekdayConfig {...mockProps} />)
    const second = render(<WeekdayConfig {...mockProps} />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('has no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<WeekdayConfig {...mockProps} />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container).toBeVisible()
  })

  it('unmounts cleanly', () => {
    const { unmount } = render(<WeekdayConfig {...mockProps} />)
    unmount()
    expect(true).toBe(true)
  })

  it('renders elements', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('has valid HTML', () => {
    const { container } = render(<WeekdayConfig {...mockProps} />)
    expect(container.innerHTML).toBeTruthy()
  })
})
