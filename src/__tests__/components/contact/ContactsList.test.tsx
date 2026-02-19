import { render, screen } from '@testing-library/react'
import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import ContactsList from '@/components/contact/ContactsList'
import { Contact } from '@/types/Contacts'
import { ContactStatus } from '@/utils/constants/contact'

jest.mock('@/utils/api_helper')
jest.mock('@/utils/react_query', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  },
}))

const mockContacts: Contact[] = [
  {
    id: '1',
    address: '0x1234',
    name: 'Alice',
    description: 'Dev',
    status: ContactStatus.ACTIVE,
    calendar_exists: true,
    avatar_url: '',
  },
  {
    id: '2',
    address: '0x5678',
    name: 'Bob',
    description: 'Designer',
    status: ContactStatus.ACTIVE,
    calendar_exists: false,
    avatar_url: '',
  },
]

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {}, pathname: '/' }),
}))

const mockProps = {
  currentAccount: {
    address: '0x1234567890123456789012345678901234567890',
    displayName: 'Test',
    avatar_url: '',
    name: 'Test',
  },
  search: '',
  hasProAccess: true,
}

describe('ContactsList', () => {
  beforeEach(() => {
    ;(useInfiniteQuery as jest.Mock).mockReturnValue({
      data: {
        pages: [{ contacts: mockContacts }],
      },
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
  })

  it('renders contact list table', () => {
    const { container } = render(
      <ContactsList {...mockProps} />
    )
    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('displays table headers', () => {
    render(
      <ContactsList {...mockProps} />
    )
    expect(screen.getByText(/name/i)).toBeInTheDocument()
  })

  it('renders all contacts', () => {
    render(
      <ContactsList {...mockProps} />
    )
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows empty state when no contacts', () => {
    ;(useInfiniteQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ contacts: [] }] },
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    render(
      <ContactsList {...mockProps} />
    )
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('passes hasProAccess prop to contact items', () => {
    render(
      <ContactsList {...mockProps} hasProAccess={false} />
    )
    const scheduleButtons = screen.queryAllByRole('button', { name: /schedule/i })
    scheduleButtons.forEach(btn => {
      expect(btn).toBeDisabled()
    })
  })
})
