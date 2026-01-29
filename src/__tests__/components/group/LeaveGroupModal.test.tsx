import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import LeaveGroupModal from '@/components/group/LeaveGroupModal'

const mockGroup = {
  id: '1',
  name: 'Team Alpha',
}

describe('LeaveGroupModal', () => {
  it('renders when open', () => {
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByText(/leave group/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <LeaveGroupModal
        isOpen={false}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.queryByText(/leave group/i)).not.toBeInTheDocument()
  })

  it('displays group name', () => {
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByText(/team alpha/i)).toBeInTheDocument()
  })

  it('has cancel button', () => {
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('has leave button', () => {
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument()
  })

  it('calls onConfirm when leave clicked', () => {
    const onConfirm = jest.fn()
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={onConfirm}
      />
    )
    
    const leaveBtn = screen.getByRole('button', { name: /leave/i })
    fireEvent.click(leaveBtn)
    expect(onConfirm).toHaveBeenCalled()
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn()
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={onClose}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows warning message', () => {
    render(
      <LeaveGroupModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        onConfirm={jest.fn()}
      />
    )
    expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
  })
})
