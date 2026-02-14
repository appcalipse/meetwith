import { render, screen } from '@testing-library/react'
import React from 'react'

import ContactRequests from '@/components/contact/ContactRequests'
import { ContactRequest } from '@/types/Contacts'

const mockRequests: ContactRequest[] = [
  {
    id: '1',
    from_address: '0x1234',
    to_address: '0x5678',
    from_name: 'Alice',
    status: 'pending',
    created_at: new Date().toISOString(),
  },
]

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('ContactRequests', () => {
  it('renders contact requests', () => {
    render(<ContactRequests requests={mockRequests} refetch={jest.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows empty state with no requests', () => {
    render(<ContactRequests requests={[]} refetch={jest.fn()} />)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('displays request count', () => {
    render(<ContactRequests requests={mockRequests} refetch={jest.fn()} />)
    expect(screen.getByText(/1/)).toBeInTheDocument()
  })
})
