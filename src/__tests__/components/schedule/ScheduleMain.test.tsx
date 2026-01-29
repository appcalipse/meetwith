import { render, screen } from '@testing-library/react'
import React from 'react'

import ScheduleMain from '@/components/schedule/ScheduleMain'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('ScheduleMain', () => {
  it('renders schedule page', () => {
    render(<ScheduleMain />)
    expect(screen.getByText(/schedule/i)).toBeInTheDocument()
  })

  it('has meeting type selector', () => {
    render(<ScheduleMain />)
    expect(screen.getByText(/meeting type/i)).toBeInTheDocument()
  })

  it('shows participants section', () => {
    render(<ScheduleMain />)
    expect(screen.getByText(/participants/i)).toBeInTheDocument()
  })

  it('displays time discovery options', () => {
    render(<ScheduleMain />)
    expect(screen.getByText(/find time/i)).toBeInTheDocument()
  })

  it('has schedule button', () => {
    render(<ScheduleMain />)
    expect(screen.getByRole('button', { name: /schedule/i })).toBeInTheDocument()
  })

  it('shows meeting details form', () => {
    render(<ScheduleMain />)
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  })
})
