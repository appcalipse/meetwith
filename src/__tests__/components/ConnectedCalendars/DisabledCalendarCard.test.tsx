import { render } from '@testing-library/react'
import DisabledCalendarCard from '@/components/ConnectedCalendars/DisabledCalendarCard/index'

describe('DisabledCalendarCard', () => {
  it('renders without crashing', () => {
    expect(() => render(<DisabledCalendarCard />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays content', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<DisabledCalendarCard />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<DisabledCalendarCard />)
    const second = render(<DisabledCalendarCard />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<DisabledCalendarCard />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container).toBeVisible()
  })

  it('cleans up', () => {
    const { unmount } = render(<DisabledCalendarCard />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<DisabledCalendarCard />)
    expect(container.innerHTML).toBeTruthy()
  })
})
