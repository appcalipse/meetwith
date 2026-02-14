import { render, screen } from '@testing-library/react'
import React from 'react'

import ConnectCalendar from '@/components/profile/ConnectCalendar'
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

describe('ConnectCalendar', () => {
  it('renders calendar connection section', () => {
    render(<ConnectCalendar currentAccount={mockAccount} />)
    expect(screen.getByText(/calendar/i)).toBeInTheDocument()
  })

  it('shows Google Calendar option', () => {
    render(<ConnectCalendar currentAccount={mockAccount} />)
    expect(screen.getByText(/google calendar/i)).toBeInTheDocument()
  })

  it('shows Microsoft Calendar option', () => {
    render(<ConnectCalendar currentAccount={mockAccount} />)
    expect(screen.getByText(/microsoft/i)).toBeInTheDocument()
  })

  it('has connect calendar buttons', () => {
    render(<ConnectCalendar currentAccount={mockAccount} />)
    const connectButtons = screen.getAllByRole('button')
    expect(connectButtons.length).toBeGreaterThan(0)
  })

  it('displays calendar instructions', () => {
    render(<ConnectCalendar currentAccount={mockAccount} />)
    expect(screen.getByText(/connect your calendar/i)).toBeInTheDocument()
  })

  it('shows calendar provider logos', () => {
    const { container } = render(<ConnectCalendar currentAccount={mockAccount} />)
    const logos = container.querySelectorAll('svg, img')
    expect(logos.length).toBeGreaterThan(0)
  })
})
