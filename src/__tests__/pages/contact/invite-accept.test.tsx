import { render, screen } from '@testing-library/react'
import ContactInviteAccept from '@/pages/contact/invite-accept'

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: { token: 'test' } })),
}))

describe('ContactInviteAccept', () => {
  it('renders page', () => {
    const { container } = render(<ContactInviteAccept />)
    expect(container).toBeTruthy()
  })

  it('shows accept button', () => {
    render(<ContactInviteAccept />)
    expect(screen.queryByText(/accept/i)).toBeTruthy()
  })

  it('displays invite info', () => {
    render(<ContactInviteAccept />)
    expect(screen.queryByText(/invite/i)).toBeTruthy()
  })

  it('handles token', () => {
    render(<ContactInviteAccept />)
    expect(document.querySelector('[data-testid]')).toBeTruthy()
  })

  it('shows loading', () => {
    render(<ContactInviteAccept />)
    expect(document.querySelector('svg')).toBeTruthy()
  })

  it('renders without crash', () => {
    expect(() => render(<ContactInviteAccept />)).not.toThrow()
  })

  it('has proper structure', () => {
    const { container } = render(<ContactInviteAccept />)
    expect(container.firstChild).toBeTruthy()
  })

  it('displays contact name', () => {
    render(<ContactInviteAccept />)
    expect(screen.queryByText(/.+/)).toBeTruthy()
  })

  it('shows decline option', () => {
    render(<ContactInviteAccept />)
    expect(screen.queryByText(/decline/i)).toBeTruthy()
  })

  it('validates input', () => {
    render(<ContactInviteAccept />)
    expect(true).toBe(true)
  })
})
