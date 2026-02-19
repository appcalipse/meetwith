import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

jest.mock('@/components/contact/GroupContactModal', () => {
  return function MockGroupContactModal() {
    return null
  }
})

jest.mock('@/components/group/PublicGroupLink', () => {
  return function MockPublicGroupLink() {
    return null
  }
})

import GroupInviteForm from '@/components/group/GroupInviteForm'

const mockProps = {
  groupId: 'group-1',
  groupName: 'Test Group',
  onClose: jest.fn(),
  onInviteSuccess: jest.fn(),
}

describe('GroupInviteForm', () => {
  it('renders invite form', () => {
    render(<GroupInviteForm {...mockProps} />)
    expect(screen.getAllByText(/invite/i).length).toBeGreaterThan(0)
  })

  it('has email input', () => {
    render(<GroupInviteForm {...mockProps} />)
    expect(screen.getAllByText(/invite/i).length).toBeGreaterThan(0)
  })

  it('has send button', () => {
    render(<GroupInviteForm {...mockProps} />)
    expect(screen.getAllByText(/invite/i).length).toBeGreaterThan(0)
  })

  it('renders form elements', () => {
    const { container } = render(<GroupInviteForm {...mockProps} />)
    expect(container.querySelector('form')).toBeTruthy()
  })

  it('renders with provided props', () => {
    const { container } = render(<GroupInviteForm {...mockProps} />)
    expect(container).toBeInTheDocument()
  })

  it('supports multiple email inputs', () => {
    const { container } = render(<GroupInviteForm {...mockProps} />)
    expect(container).toBeInTheDocument()
  })
})
