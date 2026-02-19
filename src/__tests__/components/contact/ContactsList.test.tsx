import { render, screen } from '@testing-library/react'
import React from 'react'

import ContactsList from '@/components/contact/ContactsList'
import { Contact } from '@/types/Contacts'
import { ContactStatus } from '@/utils/constants/contact'

const mockContacts: Contact[] = [
  {
    id: '1',
    address: '0x1234',
    name: 'Alice',
    description: 'Dev',
    status: ContactStatus.ACTIVE,
    calendar_exists: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    address: '0x5678',
    name: 'Bob',
    description: 'Designer',
    status: ContactStatus.ACTIVE,
    calendar_exists: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {}, pathname: '/' }),
}))

describe('ContactsList', () => {
  it('renders contact list table', () => {
    const { container } = render(
      <ContactsList
        contacts={mockContacts}
        sync={jest.fn()}
        refetch={jest.fn()}
      />
    )
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('displays table headers', () => {
    render(
      <ContactsList
        contacts={mockContacts}
        sync={jest.fn()}
        refetch={jest.fn()}
      />
    )
    expect(screen.getByText(/name/i)).toBeInTheDocument()
  })

  it('renders all contacts', () => {
    render(
      <ContactsList
        contacts={mockContacts}
        sync={jest.fn()}
        refetch={jest.fn()}
      />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows empty state when no contacts', () => {
    render(
      <ContactsList
        contacts={[]}
        sync={jest.fn()}
        refetch={jest.fn()}
      />
    )
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('passes hasProAccess prop to contact items', () => {
    render(
      <ContactsList
        contacts={mockContacts}
        sync={jest.fn()}
        refetch={jest.fn()}
        hasProAccess={false}
      />
    )
    const scheduleButtons = screen.queryAllByRole('button', { name: /schedule/i })
    scheduleButtons.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })
})
