import { render, screen } from '@testing-library/react'
import React from 'react'
import LogoutPage from '@/pages/logout'

const mockPush = jest.fn()
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: mockPush, pathname: '/logout' })),
}))

describe('Logout Page', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders logout page', () => {
    render(<LogoutPage />)
    expect(screen.getByText(/logout/i)).toBeInTheDocument()
  })

  it('displays logout message', () => {
    render(<LogoutPage />)
    expect(screen.getByText(/logging out/i)).toBeInTheDocument()
  })

  it('shows loading indicator', () => {
    render(<LogoutPage />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('redirects after logout', async () => {
    render(<LogoutPage />)
    expect(mockPush).toHaveBeenCalled()
  })

  it('clears session data', () => {
    render(<LogoutPage />)
    expect(localStorage.clear).toHaveBeenCalled()
  })

  it('removes auth tokens', () => {
    render(<LogoutPage />)
    expect(sessionStorage.clear).toHaveBeenCalled()
  })

  it('displays goodbye message', () => {
    render(<LogoutPage />)
    expect(screen.getByText(/goodbye/i)).toBeInTheDocument()
  })

  it('has centered layout', () => {
    const { container } = render(<LogoutPage />)
    expect(container.querySelector('[class*="center"]')).toBeTruthy()
  })

  it('shows spinner', () => {
    const { container } = render(<LogoutPage />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    expect(() => render(<LogoutPage />)).not.toThrow()
  })
})
