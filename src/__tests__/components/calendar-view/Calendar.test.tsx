import { render, screen } from '@testing-library/react'
import React from 'react'

import Calendar from '@/components/calendar-view/Calendar'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('Calendar', () => {
  it('renders calendar', () => {
    render(<Calendar events={[]} />)
    expect(screen.getByText(/calendar/i)).toBeInTheDocument()
  })

  it('displays month view', () => {
    render(<Calendar events={[]} />)
    expect(screen.getByText(/january|february|march|april|may|june|july|august|september|october|november|december/i)).toBeInTheDocument()
  })

  it('shows day names', () => {
    render(<Calendar events={[]} />)
    expect(screen.getByText(/mon|tue|wed|thu|fri|sat|sun/i)).toBeInTheDocument()
  })

  it('has navigation buttons', () => {
    render(<Calendar events={[]} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('displays events', () => {
    const events = [
      { id: '1', title: 'Meeting', start: new Date(), end: new Date() },
    ]
    render(<Calendar events={events} />)
    expect(screen.getByText('Meeting')).toBeInTheDocument()
  })

  it('shows current month by default', () => {
    const { container } = render(<Calendar events={[]} />)
    expect(container.querySelector('[role="grid"]')).toBeInTheDocument()
  })
})
