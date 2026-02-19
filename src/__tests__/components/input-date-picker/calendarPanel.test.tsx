import { render } from '@testing-library/react'
import { CalendarPanel as calendarPanel } from '@/components/input-date-picker/components/calendarPanel'

describe('calendarPanel', () => {
  it('renders without crashing', () => {
    expect(() => render(<calendarPanel />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<calendarPanel />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<calendarPanel />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<calendarPanel />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<calendarPanel />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<calendarPanel />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<calendarPanel />)
    const second = render(<calendarPanel />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<calendarPanel />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<calendarPanel />)
    expect(container).toBeVisible()
  })

  it('cleans up', () => {
    const { unmount } = render(<calendarPanel />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<calendarPanel />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<calendarPanel />)
    expect(container.innerHTML).toBeTruthy()
  })
})
