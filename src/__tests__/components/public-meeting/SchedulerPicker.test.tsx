import { render, screen } from '@testing-library/react'
import React from 'react'

import SchedulerPicker from '@/components/public-meeting/SchedulerPicker'

describe('SchedulerPicker', () => {
  it('renders scheduler', () => {
    render(<SchedulerPicker onSelect={jest.fn()} availableSlots={[]} />)
    expect(screen.getByText(/select time/i)).toBeInTheDocument()
  })

  it('displays calendar', () => {
    const { container } = render(
      <SchedulerPicker onSelect={jest.fn()} availableSlots={[]} />
    )
    expect(container.querySelector('[role="grid"]')).toBeInTheDocument()
  })

  it('shows available time slots', () => {
    const slots = [
      { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T11:00:00') },
    ]
    render(<SchedulerPicker onSelect={jest.fn()} availableSlots={slots} />)
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
  })

  it('allows selecting a slot', () => {
    const onSelect = jest.fn()
    const slots = [
      { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T11:00:00') },
    ]
    render(<SchedulerPicker onSelect={onSelect} availableSlots={slots} />)
    
    const slot = screen.getByText(/10:00/)
    slot.click()
    expect(onSelect).toHaveBeenCalled()
  })

  it('shows empty state when no slots', () => {
    render(<SchedulerPicker onSelect={jest.fn()} availableSlots={[]} />)
    expect(screen.getByText(/no available/i)).toBeInTheDocument()
  })
})
