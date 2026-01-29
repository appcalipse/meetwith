import { render, screen } from '@testing-library/react'
import React from 'react'
import WCPage from '@/pages/wc'

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: {} })),
}))

describe('WalletConnect Page', () => {
  it('renders WC page', () => {
    render(<WCPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays WalletConnect UI', () => {
    render(<WCPage />)
    expect(screen.getByText(/wallet/i)).toBeInTheDocument()
  })

  it('shows connect button', () => {
    render(<WCPage />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has QR code display', () => {
    const { container } = render(<WCPage />)
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('renders connection options', () => {
    render(<WCPage />)
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
  })

  it('displays instructions', () => {
    render(<WCPage />)
    expect(screen.getByText(/scan/i)).toBeInTheDocument()
  })

  it('shows supported wallets', () => {
    render(<WCPage />)
    expect(screen.getByText(/metamask|wallet/i)).toBeInTheDocument()
  })

  it('has connection URI', () => {
    const { container } = render(<WCPage />)
    expect(container.querySelector('[class*="uri"]')).toBeTruthy()
  })

  it('renders without crashing', () => {
    expect(() => render(<WCPage />)).not.toThrow()
  })

  it('displays connection status', () => {
    render(<WCPage />)
    expect(screen.getByText(/connect/i)).toBeInTheDocument()
  })

  it('has proper layout', () => {
    const { container } = render(<WCPage />)
    expect(container.firstChild).toBeTruthy()
  })
})
