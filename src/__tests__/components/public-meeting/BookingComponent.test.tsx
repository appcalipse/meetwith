import { render, screen } from '@testing-library/react'
import React from 'react'

import BookingComponent from '@/components/public-meeting/BookingComponent'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('BookingComponent', () => {
  it('renders booking form', () => {
    render(<BookingComponent />)
    expect(screen.getByText(/book/i)).toBeInTheDocument()
  })

  it('has name input', () => {
    render(<BookingComponent />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('has email input', () => {
    render(<BookingComponent />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('shows calendar picker', () => {
    render(<BookingComponent />)
    expect(screen.getByText(/select date/i)).toBeInTheDocument()
  })

  it('has time slots', () => {
    render(<BookingComponent />)
    expect(screen.getByText(/available times/i)).toBeInTheDocument()
  })

  it('has submit button', () => {
    render(<BookingComponent />)
    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
  })

  it('shows timezone selector', () => {
    render(<BookingComponent />)
    expect(screen.getByText(/timezone/i)).toBeInTheDocument()
  })
})
