import { render, screen } from '@testing-library/react'
import React from 'react'

import QuickPoll from '@/components/quickpoll/QuickPoll'
import { QuickPollWithParticipants, PollStatus } from '@/types/QuickPoll'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const mockPoll: QuickPollWithParticipants = {
  id: '1',
  slug: 'test-poll',
  title: 'Test Poll',
  description: 'Test',
  status: PollStatus.ONGOING,
  starts_at: new Date().toISOString(),
  ends_at: new Date().toISOString(),
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  host_address: '0x1234',
  participants: [],
}

describe('QuickPoll', () => {
  it('renders poll title', () => {
    render(<QuickPoll poll={mockPoll} />)
    expect(screen.getByText('Test Poll')).toBeInTheDocument()
  })

  it('displays poll description', () => {
    render(<QuickPoll poll={mockPoll} />)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })

  it('shows poll status', () => {
    render(<QuickPoll poll={mockPoll} />)
    expect(screen.getByText(PollStatus.ONGOING)).toBeInTheDocument()
  })

  it('renders participant count', () => {
    const pollWithParticipants = {
      ...mockPoll,
      participants: [
        { id: '1', poll_id: '1', address: '0x1', availability: [] },
        { id: '2', poll_id: '1', address: '0x2', availability: [] },
      ],
    }
    render(<QuickPoll poll={pollWithParticipants} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('handles poll without participants', () => {
    render(<QuickPoll poll={mockPoll} />)
    expect(screen.getByText(/0/)).toBeInTheDocument()
  })

  it('shows date range', () => {
    render(<QuickPoll poll={mockPoll} />)
    const dateElements = screen.getAllByText(/\d{4}/)
    expect(dateElements.length).toBeGreaterThan(0)
  })
})
