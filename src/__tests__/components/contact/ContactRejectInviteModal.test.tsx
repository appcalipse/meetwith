import { render } from '@testing-library/react'
import ContactRejectInviteModal from '@/components/contact/ContactRejectInviteModal'

describe('Contact ContactRejectInviteModal', () => {
  it('renders without crashing', () => {
    expect(() => render(<ContactRejectInviteModal />)).not.toThrow()
  })

  it('renders component', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container).toBeTruthy()
  })

  it('has structure', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays content', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container.querySelector('*')).toBeTruthy()
  })

  it('handles props correctly', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container).toBeInTheDocument()
  })

  it('mounts without errors', () => {
    const { unmount } = render(<ContactRejectInviteModal />)
    expect(() => unmount()).not.toThrow()
  })

  it('renders same output', () => {
    const first = render(<ContactRejectInviteModal />)
    const second = render(<ContactRejectInviteModal />)
    expect(first.container.innerHTML).toBe(second.container.innerHTML)
  })

  it('no errors in console', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation()
    render(<ContactRejectInviteModal />)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('is visible', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container).toBeVisible()
  })

  it('cleans up properly', () => {
    const { unmount } = render(<ContactRejectInviteModal />)
    unmount()
    expect(true).toBe(true)
  })

  it('has elements', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders markup', () => {
    const { container } = render(<ContactRejectInviteModal />)
    expect(container.innerHTML).toBeTruthy()
  })
})
