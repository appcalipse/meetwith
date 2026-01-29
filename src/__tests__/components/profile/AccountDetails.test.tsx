import { render, screen } from '@testing-library/react'
import React from 'react'

import AccountDetails from '@/components/profile/AccountDetails'
import { Account } from '@/types/Account'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const mockAccount: Account = {
  id: '1',
  address: '0x1234',
  name: 'John Doe',
  email: 'john@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  description: 'Test user',
  domain: 'johndoe',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscriptions: [],
}

describe('AccountDetails', () => {
  it('renders account details', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    expect(screen.getByText(/account details/i)).toBeInTheDocument()
  })

  it('displays account name', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
  })

  it('shows account email', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
  })

  it('displays account domain', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    expect(screen.getByDisplayValue('johndoe')).toBeInTheDocument()
  })

  it('shows avatar preview', () => {
    const { container } = render(<AccountDetails currentAccount={mockAccount} />)
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('has save button', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('allows editing name', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    const nameInput = screen.getByDisplayValue('John Doe') as HTMLInputElement
    expect(nameInput).not.toBeDisabled()
  })

  it('allows editing email', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    const emailInput = screen.getByDisplayValue('john@example.com') as HTMLInputElement
    expect(emailInput).not.toBeDisabled()
  })

  it('allows editing description', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    const descInput = screen.getByDisplayValue('Test user') as HTMLInputElement
    expect(descInput).not.toBeDisabled()
  })

  it('displays wallet address', () => {
    render(<AccountDetails currentAccount={mockAccount} />)
    expect(screen.getByText(/0x/)).toBeInTheDocument()
  })
})
