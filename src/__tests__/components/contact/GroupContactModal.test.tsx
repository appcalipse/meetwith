import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import GroupContactModal from '@/components/contact/GroupContactModal'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

const mockGroup = {
  id: '1',
  name: 'Team Alpha',
  description: 'Our team',
}

describe('GroupContactModal', () => {
  it('renders when open', () => {
    render(
      <GroupContactModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        contacts={[]}
      />
    )
    expect(screen.getByText(/add contacts/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <GroupContactModal
        isOpen={false}
        onClose={jest.fn()}
        group={mockGroup}
        contacts={[]}
      />
    )
    expect(screen.queryByText(/add contacts/i)).not.toBeInTheDocument()
  })

  it('displays group name', () => {
    render(
      <GroupContactModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        contacts={[]}
      />
    )
    expect(screen.getByText(/team alpha/i)).toBeInTheDocument()
  })

  it('shows contact list', () => {
    const contacts = [
      { id: '1', name: 'Alice', address: '0x1234' },
      { id: '2', name: 'Bob', address: '0x5678' },
    ]
    render(
      <GroupContactModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        contacts={contacts}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('has save button', () => {
    render(
      <GroupContactModal
        isOpen={true}
        onClose={jest.fn()}
        group={mockGroup}
        contacts={[]}
      />
    )
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn()
    render(
      <GroupContactModal
        isOpen={true}
        onClose={onClose}
        group={mockGroup}
        contacts={[]}
      />
    )
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
