import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import ContactSearchItem from '@/components/contact/ContactSearchItem'

jest.mock('@/utils/api_helper')

const mockProps = {
  index: 0,
  address: '0x1234567890123456789012345678901234567890',
  name: 'Alice',
  avatar_url: 'https://example.com/avatar.jpg',
  is_invited: false,
  handleUpdateResult: jest.fn(),
}

describe('ContactSearchItem', () => {
  it('renders contact name', () => {
    render(<ContactSearchItem {...mockProps} />)
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('displays contact address', () => {
    render(<ContactSearchItem {...mockProps} />)
    expect(screen.getByText(/0x/)).toBeInTheDocument()
  })

  it('shows avatar', () => {
    const { container } = render(
      <ContactSearchItem {...mockProps} />
    )
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<ContactSearchItem {...mockProps} handleUpdateResult={onSelect} />)
    fireEvent.click(screen.getByText('Alice'))
    expect(onSelect).toHaveBeenCalledWith(mockProps)
  })

  it('handles contact without name', () => {
    const noNameProps = { ...mockProps, name: undefined }
    render(<ContactSearchItem {...noNameProps} />)
    expect(screen.getByText(/0x/)).toBeInTheDocument()
  })
})
