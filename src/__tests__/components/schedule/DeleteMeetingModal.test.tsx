import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import DeleteMeetingModal from '@/components/schedule/DeleteMeetingModal'

const mockMeeting = {
  id: '1',
  title: 'Team Meeting',
}

describe('DeleteMeetingModal', () => {
  it('renders when open', () => {
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByText(/delete meeting/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <DeleteMeetingModal
        isOpen={false}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.queryByText(/delete meeting/i)).not.toBeInTheDocument()
  })

  it('displays meeting title', () => {
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByText(/team meeting/i)).toBeInTheDocument()
  })

  it('has cancel button', () => {
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('has delete button', () => {
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('calls onConfirm when delete clicked', () => {
    const onConfirm = jest.fn()
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={onConfirm}
      />
    )
    
    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    fireEvent.click(deleteBtn)
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn()
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={onClose}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows warning message', () => {
    render(
      <DeleteMeetingModal
        isOpen={true}
        onClose={jest.fn()}
        meeting={mockMeeting}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })
})
