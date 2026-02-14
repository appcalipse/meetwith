import { render, screen } from '@testing-library/react'
import React from 'react'

import WalletAndPayment from '@/components/profile/WalletAndPayment'
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

describe('WalletAndPayment', () => {
  it('renders wallet section', () => {
    render(<WalletAndPayment currentAccount={mockAccount} />)
    expect(screen.getByText(/wallet/i)).toBeInTheDocument()
  })

  it('displays connected wallet address', () => {
    render(<WalletAndPayment currentAccount={mockAccount} />)
    expect(screen.getByText(/0x/)).toBeInTheDocument()
  })

  it('shows payment methods section', () => {
    render(<WalletAndPayment currentAccount={mockAccount} />)
    expect(screen.getByText(/payment/i)).toBeInTheDocument()
  })

  it('has add payment method button', () => {
    render(<WalletAndPayment currentAccount={mockAccount} />)
    expect(screen.getByRole('button', { name: /add payment/i })).toBeInTheDocument()
  })

  it('displays Stripe connection status', () => {
    render(<WalletAndPayment currentAccount={mockAccount} />)
    expect(screen.getByText(/stripe/i)).toBeInTheDocument()
  })

  it('shows wallet balance', () => {
    render(<WalletAndPayment currentAccount={mockAccount} />)
    expect(screen.getByText(/balance/i)).toBeInTheDocument()
  })
})
