import { render, screen } from '@testing-library/react'
import React from 'react'

import AccountPlansAndBilling from '@/components/profile/AccountPlansAndBilling'
import { Account } from '@/types/Account'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const mockAccount: Account = {
  id: '1',
  address: '0x1234',
  name: 'John Doe',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscriptions: [],
}

describe('AccountPlansAndBilling', () => {
  it('renders plans and billing section', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    expect(screen.getByText(/plans/i)).toBeInTheDocument()
  })

  it('displays available plans', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    expect(screen.getByText(/free/i)).toBeInTheDocument()
    expect(screen.getByText(/pro/i)).toBeInTheDocument()
  })

  it('shows upgrade button for free users', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    expect(screen.getByRole('button', { name: /upgrade/i })).toBeInTheDocument()
  })

  it('displays plan features', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    const features = screen.getAllByText(/feature/i)
    expect(features.length).toBeGreaterThan(0)
  })

  it('shows current plan badge', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    expect(screen.getByText(/current/i)).toBeInTheDocument()
  })

  it('displays pricing information', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    expect(screen.getByText(/\$/)).toBeInTheDocument()
  })

  it('shows billing history section', () => {
    render(<AccountPlansAndBilling currentAccount={mockAccount} />)
    expect(screen.getByText(/billing history/i)).toBeInTheDocument()
  })
})
