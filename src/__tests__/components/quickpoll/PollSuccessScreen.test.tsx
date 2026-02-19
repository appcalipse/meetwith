import { render, screen } from '@testing-library/react'
import React from 'react'

import PollSuccessScreen from '@/components/quickpoll/PollSuccessScreen'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const mockPoll = {
  id: '1',
  slug: 'test-poll',
  title: 'Success Poll',
}

describe('PollSuccessScreen', () => {
  it('renders success message', () => {
    render(<PollSuccessScreen poll={mockPoll} />)
    expect(screen.getByText(/success/i)).toBeInTheDocument()
  })

  it('displays poll title', () => {
    render(<PollSuccessScreen poll={mockPoll} />)
    expect(screen.getByText('Success Poll')).toBeInTheDocument()
  })

  it('shows poll link', () => {
    render(<PollSuccessScreen poll={mockPoll} />)
    expect(screen.getByText(/test-poll/)).toBeInTheDocument()
  })

  it('has copy link button', () => {
    render(<PollSuccessScreen poll={mockPoll} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('has view poll button', () => {
    render(<PollSuccessScreen poll={mockPoll} />)
    expect(screen.getByRole('button', { name: /view poll/i })).toBeInTheDocument()
  })

  it('has share button', () => {
    render(<PollSuccessScreen poll={mockPoll} />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })
})
