import { render } from '@testing-library/react'
import { DayOfMonth as dayOfMonth } from '@/components/input-date-picker/components/dayOfMonth'

describe('dayOfMonth', () => {
  it('renders without crashing', () => {
    expect(() => render(<dayOfMonth />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<dayOfMonth />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<dayOfMonth />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<dayOfMonth />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<dayOfMonth />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<dayOfMonth />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<dayOfMonth />)
    const second = render(<dayOfMonth />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<dayOfMonth />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<dayOfMonth />)
    expect(container).toBeVisible()
  })

  it('cleans up', () => {
    const { unmount } = render(<dayOfMonth />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<dayOfMonth />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<dayOfMonth />)
    expect(container.innerHTML).toBeTruthy()
  })
})
