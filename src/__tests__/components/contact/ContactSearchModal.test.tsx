import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import ContactSearchModal from '@/components/contact/ContactSearchModal'

jest.mock('@/utils/api_helper')

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

jest.mock('@tanstack/react-query', () => ({
  ...jest.requireActual('@tanstack/react-query'),
  useMutation: jest.fn(() => ({
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isLoading: false,
    reset: jest.fn(),
  })),
  QueryClientProvider: ({ children }: any) => children,
}))

describe('ContactSearchModal', () => {
  it('renders when open', () => {
    render(<ContactSearchModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByText(/search/i)).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(<ContactSearchModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByText(/search/i)).not.toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = jest.fn()
    render(<ContactSearchModal isOpen={true} onClose={onClose} />)
    const closeBtn = screen.getAllByRole('button')[0]
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalled()
  })

  it('has search input field', () => {
    render(<ContactSearchModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('allows typing in search field', () => {
    render(<ContactSearchModal isOpen={true} onClose={jest.fn()} />)
    const input = screen.getByRole('textbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'alice' } })
    expect(input.value).toBe('alice')
  })
})
