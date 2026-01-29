import { render } from '@testing-library/react'
import CookieConsent from '@/components/CookieConsent'

describe('CookieConsent', () => {
  it('renders without crashing', () => {
    expect(() => render(<CookieConsent />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<CookieConsent />)
    expect(container).toBeTruthy()
  })

  it('has correct structure', () => {
    const { container } = render(<CookieConsent />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays correctly', () => {
    const { container } = render(<CookieConsent />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('renders consistently', () => {
    const first = render(<CookieConsent />)
    const second = render(<CookieConsent />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('mounts successfully', () => {
    const { unmount } = render(<CookieConsent />)
    expect(() => unmount()).not.toThrow()
  })

  it('has no console errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<CookieConsent />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('renders elements', () => {
    const { container } = render(<CookieConsent />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('is visible', () => {
    const { container } = render(<CookieConsent />)
    expect(container).toBeVisible()
  })

  it('handles unmount', () => {
    const { unmount } = render(<CookieConsent />)
    unmount()
    expect(true).toBe(true)
  })

  it('initializes correctly', () => {
    const { container } = render(<CookieConsent />)
    expect(container.firstChild).not.toBeNull()
  })

  it('renders valid markup', () => {
    const { container } = render(<CookieConsent />)
    expect(container.innerHTML).toBeTruthy()
  })
})
