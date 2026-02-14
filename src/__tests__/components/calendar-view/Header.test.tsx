import { render, screen } from '@testing-library/react'
import React from 'react'

import Header from '@/components/calendar-view/Header'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('Header', () => {
  it('renders calendar header', () => {
    render(<Header />)
    expect(screen.getByText(/calendar/i)).toBeInTheDocument()
  })

  it('displays current date', () => {
    render(<Header />)
    const currentMonth = new Date().toLocaleString('default', { month: 'long' })
    expect(screen.getByText(new RegExp(currentMonth, 'i'))).toBeInTheDocument()
  })

  it('has view toggle buttons', () => {
    render(<Header />)
    expect(screen.getByText(/month/i)).toBeInTheDocument()
    expect(screen.getByText(/week/i)).toBeInTheDocument()
  })

  it('shows navigation arrows', () => {
    const { container } = render(<Header />)
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('has create event button', () => {
    render(<Header />)
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })
})
