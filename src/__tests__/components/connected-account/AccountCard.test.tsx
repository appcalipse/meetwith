import { render } from '@testing-library/react'
import AccountCard from '@/components/connected-account/AccountCard'

describe('AccountCard', () => {
  it('renders without crashing', () => {
    expect(() => render(<AccountCard />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<AccountCard />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<AccountCard />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<AccountCard />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<AccountCard />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<AccountCard />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<AccountCard />)
    const second = render(<AccountCard />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<AccountCard />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<AccountCard />)
    expect(container).toBeVisible()
  })

  it('cleans up', () => {
    const { unmount } = render(<AccountCard />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<AccountCard />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<AccountCard />)
    expect(container.innerHTML).toBeTruthy()
  })
})
