import { render, screen } from '@testing-library/react'
import React from 'react'

import Dashboard from '@/pages/dashboard/index'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {}, pathname: '/dashboard' }),
}))

jest.mock('@/providers/AccountProvider', () => ({
  useAccount: () => ({
    account: { id: '1', name: 'Test User' },
    loading: false,
  }),
}))

describe('Dashboard Page', () => {
  it('renders dashboard', () => {
    const { container } = render(<Dashboard />)
    expect(container).toBeInTheDocument()
  })

  it('shows welcome message', () => {
    render(<Dashboard />)
    expect(screen.getByText(/dashboard|welcome/i)).toBeInTheDocument()
  })

  it('displays navigation sections', () => {
    render(<Dashboard />)
    expect(screen.getByText(/meeting|poll|group/i)).toBeInTheDocument()
  })

  it('has quick actions', () => {
    render(<Dashboard />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})
