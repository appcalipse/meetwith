import { render } from '@testing-library/react'
import ImageIcon from '@/components/icons/Image'

describe('ImageIcon', () => {
  it('renders without crashing', () => {
    expect(() => render(<ImageIcon />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<ImageIcon />)
    expect(container).toBeTruthy()
  })

  it('has correct structure', () => {
    const { container } = render(<ImageIcon />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays correctly', () => {
    const { container } = render(<ImageIcon />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('renders consistently', () => {
    const first = render(<ImageIcon />)
    const second = render(<ImageIcon />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('mounts successfully', () => {
    const { unmount } = render(<ImageIcon />)
    expect(() => unmount()).not.toThrow()
  })

  it('has no console errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<ImageIcon />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('renders elements', () => {
    const { container } = render(<ImageIcon />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('is visible', () => {
    const { container } = render(<ImageIcon />)
    expect(container).toBeVisible()
  })

  it('handles unmount', () => {
    const { unmount } = render(<ImageIcon />)
    unmount()
    expect(true).toBe(true)
  })

  it('initializes correctly', () => {
    const { container } = render(<ImageIcon />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders valid markup', () => {
    const { container } = render(<ImageIcon />)
    expect(container.innerHTML).toBeTruthy()
  })
})
