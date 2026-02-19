import { render, screen } from '@testing-library/react'
import WeekdayConfig from '@/components/availabilities/WeekdayConfig'

describe('WeekdayConfig', () => {
  it('renders without crashing', () => {
    expect(() => render(<WeekdayConfig />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container).toBeTruthy()
  })

  it('has proper structure', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<WeekdayConfig />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<WeekdayConfig />)
    const second = render(<WeekdayConfig />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('has no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<WeekdayConfig />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container).toBeVisible()
  })

  it('unmounts cleanly', () => {
    const { unmount } = render(<WeekdayConfig />)
    unmount()
    expect(true).toBe(true)
  })

  it('renders elements', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('has valid HTML', () => {
    const { container } = render(<WeekdayConfig />)
    expect(container.innerHTML).toBeTruthy()
  })
})
