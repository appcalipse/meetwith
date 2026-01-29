import { render, screen } from '@testing-library/react'
import React from 'react'

import UpcomingEvent from '@/components/calendar-view/UpcomingEvent'

const mockEvent = {
  id: '1',
  title: 'Team Standup',
  start: new Date('2024-01-15T10:00:00'),
  end: new Date('2024-01-15T10:30:00'),
  attendees: ['alice@example.com', 'bob@example.com'],
}

describe('UpcomingEvent', () => {
  it('renders event title', () => {
    render(<UpcomingEvent event={mockEvent} />)
    expect(screen.getByText('Team Standup')).toBeInTheDocument()
  })

  it('displays event time', () => {
    render(<UpcomingEvent event={mockEvent} />)
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
  })

  it('shows attendees count', () => {
    render(<UpcomingEvent event={mockEvent} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('has join button', () => {
    render(<UpcomingEvent event={mockEvent} />)
    expect(screen.getByRole('button', { name: /join/i })).toBeInTheDocument()
  })

  it('displays event date', () => {
    render(<UpcomingEvent event={mockEvent} />)
    expect(screen.getByText(/jan|january/i)).toBeInTheDocument()
  })

  it('shows duration', () => {
    render(<UpcomingEvent event={mockEvent} />)
    expect(screen.getByText(/30/)).toBeInTheDocument()
  })
})
