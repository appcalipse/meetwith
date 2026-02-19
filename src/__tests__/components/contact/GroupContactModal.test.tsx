import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import GroupContactModal from '@/components/contact/GroupContactModal'

jest.mock('@/utils/api_helper')

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue([]),
    isLoading: false,
    reset: jest.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
}))

const mockProps = {
  isOpen: true,
  onClose: jest.fn(),
  isContactAlreadyAdded: jest.fn().mockReturnValue(false),
  addUserFromContact: jest.fn(),
  removeUserFromContact: jest.fn(),
}

describe('GroupContactModal', () => {
  it('renders when open', () => {
    render(
      <GroupContactModal {...mockProps} />
    )
    expect(screen.getByText(/add contacts/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <GroupContactModal {...mockProps} isOpen={false} />
    )
    expect(screen.queryByText(/add contacts/i)).not.toBeInTheDocument()
  })

  it('displays group name', () => {
    render(
      <GroupContactModal {...mockProps} title="Team Alpha" />
    )
    expect(screen.getByText(/team alpha/i)).toBeInTheDocument()
  })

  it('shows contact list', () => {
    render(
      <GroupContactModal {...mockProps} />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('has save button', () => {
    render(
      <GroupContactModal {...mockProps} />
    )
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('calls onClose when cancel clicked', () => {
    const onClose = jest.fn()
    render(
      <GroupContactModal {...mockProps} onClose={onClose} />
    )
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalled()
  })
})
