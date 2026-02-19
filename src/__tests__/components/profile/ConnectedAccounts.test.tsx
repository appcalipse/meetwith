import { render, screen } from '@testing-library/react'
import React from 'react'

import ConnectedAccounts from '@/components/profile/ConnectedAccounts'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('ConnectedAccounts', () => {
  it('renders connected accounts section', () => {
    render(<ConnectedAccounts />)
    expect(screen.getByText(/connected accounts/i)).toBeInTheDocument()
  })

  it('shows available account connections', () => {
    render(<ConnectedAccounts />)
    expect(screen.getByText(/google/i)).toBeInTheDocument()
  })

  it('displays connect buttons', () => {
    render(<ConnectedAccounts />)
    const connectButtons = screen.getAllByRole('button', { name: /connect/i })
    expect(connectButtons.length).toBeGreaterThan(0)
  })

  it('shows Twitter connection option', () => {
    render(<ConnectedAccounts />)
    expect(screen.getByText(/twitter/i)).toBeInTheDocument()
  })

  it('shows Discord connection option', () => {
    render(<ConnectedAccounts />)
    expect(screen.getByText(/discord/i)).toBeInTheDocument()
  })

  it('displays connection status', () => {
    render(<ConnectedAccounts />)
    expect(screen.getByText(/not connected/i)).toBeInTheDocument()
  })

  it('shows account logos', () => {
    const { container } = render(<ConnectedAccounts />)
    const logos = container.querySelectorAll('svg')
    expect(logos.length).toBeGreaterThan(0)
  })
})
