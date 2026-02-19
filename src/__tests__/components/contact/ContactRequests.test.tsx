import { render, screen } from '@testing-library/react'
import React from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'

import ContactRequests from '@/components/contact/ContactRequests'

jest.mock('@/utils/api_helper')
jest.mock('@/utils/react_query', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
    getQueryData: jest.fn(),
  },
}))

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
  reloadContacts: jest.fn(),
}

describe('ContactRequests', () => {
  it('renders contact requests', () => {
    ;(useInfiniteQuery as jest.Mock).mockReturnValue({
      data: {
        pages: [{
          requests: [
            { id: '1', address: '0x1234', name: 'Alice', avatar_url: '', description: '', calendar_exists: true },
          ],
        }],
      },
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    render(<ContactRequests {...mockProps} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('shows empty state with no requests', () => {
    ;(useInfiniteQuery as jest.Mock).mockReturnValue({
      data: { pages: [{ requests: [] }] },
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    render(<ContactRequests {...mockProps} />)
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
  })

  it('displays request count', () => {
    ;(useInfiniteQuery as jest.Mock).mockReturnValue({
      data: {
        pages: [{
          requests: [
            { id: '1', address: '0x1234', name: 'Alice', avatar_url: '', description: '', calendar_exists: true },
          ],
        }],
      },
      isLoading: false,
      isError: false,
      fetchNextPage: jest.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    })
    render(<ContactRequests {...mockProps} />)
    expect(screen.getByText(/1/)).toBeInTheDocument()
  })
})
