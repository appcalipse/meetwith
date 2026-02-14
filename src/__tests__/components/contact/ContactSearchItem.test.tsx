import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import ContactSearchItem from '@/components/contact/ContactSearchItem'

const mockContact = {
  address: '0x1234',
  name: 'Alice',
  avatar_url: 'https://example.com/avatar.jpg',
}

describe('ContactSearchItem', () => {
  it('renders contact name', () => {
    render(<ContactSearchItem contact={mockContact} onSelect={jest.fn()} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('displays contact address', () => {
    render(<ContactSearchItem contact={mockContact} onSelect={jest.fn()} />)
    expect(screen.getByText(/0x/)).toBeInTheDocument()
  })

  it('shows avatar', () => {
    const { container } = render(
      <ContactSearchItem contact={mockContact} onSelect={jest.fn()} />
    )
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<ContactSearchItem contact={mockContact} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledWith(mockContact)
  })

  it('handles contact without name', () => {
    const noNameContact = { ...mockContact, name: null }
    render(<ContactSearchItem contact={noNameContact} onSelect={jest.fn()} />)
    expect(screen.getByText(/0x/)).toBeInTheDocument()
  })
})
