import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import NotificationConfig from '@/components/notifications/NotificationConfig'
import { Account } from '@/types/Account'

const mockAccount: Account = {
  id: '1',
  address: '0x1234',
  name: 'John',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscriptions: [],
}

describe('NotificationConfig', () => {
  it('renders notification settings', () => {
    render(<NotificationConfig currentAccount={mockAccount} />)
    expect(screen.getByText(/notifications/i)).toBeInTheDocument()
  })

  it('has email notification toggle', () => {
    render(<NotificationConfig currentAccount={mockAccount} />)
    expect(screen.getByText(/email/i)).toBeInTheDocument()
  })

  it('has push notification toggle', () => {
    render(<NotificationConfig currentAccount={mockAccount} />)
    expect(screen.getByText(/push/i)).toBeInTheDocument()
  })

  it('shows notification preferences', () => {
    render(<NotificationConfig currentAccount={mockAccount} />)
    expect(screen.getByText(/meeting reminders/i)).toBeInTheDocument()
  })

  it('has save button', () => {
    render(<NotificationConfig currentAccount={mockAccount} />)
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('allows toggling notification settings', () => {
    const { container } = render(<NotificationConfig currentAccount={mockAccount} />)
    const toggles = container.querySelectorAll('input[type="checkbox"]')
    expect(toggles.length).toBeGreaterThan(0)
  })

  it('shows notification frequency options', () => {
    render(<NotificationConfig currentAccount={mockAccount} />)
    expect(screen.getByText(/immediately|daily|weekly/i)).toBeInTheDocument()
  })
})
