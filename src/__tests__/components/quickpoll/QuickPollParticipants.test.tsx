import { render, screen } from '@testing-library/react'
import React from 'react'

import QuickPollParticipants from '@/components/quickpoll/QuickPollParticipants'

const mockParticipants = [
  {
    id: '1',
    poll_id: '1',
    address: '0x1234',
    name: 'Alice',
    email: 'alice@example.com',
    availability: [],
  },
  {
    id: '2',
    poll_id: '1',
    address: '0x5678',
    name: 'Bob',
    email: 'bob@example.com',
    availability: [],
  },
]

describe('QuickPollParticipants', () => {
  it('renders participants list', () => {
    render(<QuickPollParticipants participants={mockParticipants} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('displays participant count', () => {
    render(<QuickPollParticipants participants={mockParticipants} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('shows participant emails', () => {
    render(<QuickPollParticipants participants={mockParticipants} />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders empty state when no participants', () => {
    render(<QuickPollParticipants participants={[]} />)
    expect(screen.getByText(/no participants/i)).toBeInTheDocument()
  })

  it('displays participant avatars', () => {
    const { container } = render(
      <QuickPollParticipants participants={mockParticipants} />
    )
    const avatars = container.querySelectorAll('img')
    expect(avatars.length).toBeGreaterThan(0)
  })
})
