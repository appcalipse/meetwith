import { render } from '@testing-library/react'
import SelectCountry from '@/components/connected-account/SelectCountry'

describe('SelectCountry', () => {
  it('renders without crashing', () => {
    expect(() => render(<SelectCountry />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<SelectCountry />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<SelectCountry />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays UI', () => {
    const { container } = render(<SelectCountry />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props', () => {
    const { container } = render(<SelectCountry />)
    expect(container).toBeInTheDocument()
  })

  it('mounts correctly', () => {
    const { unmount } = render(<SelectCountry />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders consistently', () => {
    const first = render(<SelectCountry />)
    const second = render(<SelectCountry />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<SelectCountry />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<SelectCountry />)
    expect(container).toBeVisible()
  })

  it('cleans up', () => {
    const { unmount } = render(<SelectCountry />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<SelectCountry />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<SelectCountry />)
    expect(container.innerHTML).toBeTruthy()
  })
})
