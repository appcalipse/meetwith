import { render, screen } from '@testing-library/react'
import React from 'react'

import SessionTypeCard from '@/components/public-meeting/SessionTypeCard'

const mockSession = {
  id: '1',
  title: '30 Min Call',
  description: 'Quick chat',
  duration: 30,
  price: 0,
}

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('SessionTypeCard', () => {
  it('renders session title', () => {
    render(<SessionTypeCard session={mockSession} onSelect={jest.fn()} />)
    expect(screen.getByText('30 Min Call')).toBeInTheDocument()
  })

  it('displays session description', () => {
    render(<SessionTypeCard session={mockSession} onSelect={jest.fn()} />)
    expect(screen.getByText('Quick chat')).toBeInTheDocument()
  })

  it('shows session duration', () => {
    render(<SessionTypeCard session={mockSession} onSelect={jest.fn()} />)
    expect(screen.getByText(/30/)).toBeInTheDocument()
  })

  it('displays free badge for free sessions', () => {
    render(<SessionTypeCard session={mockSession} onSelect={jest.fn()} />)
    expect(screen.getByText(/free/i)).toBeInTheDocument()
  })

  it('shows price for paid sessions', () => {
    const paidSession = { ...mockSession, price: 50 }
    render(<SessionTypeCard session={paidSession} onSelect={jest.fn()} />)
    expect(screen.getByText(/\$50/)).toBeInTheDocument()
  })

  it('has select button', () => {
    render(<SessionTypeCard session={mockSession} onSelect={jest.fn()} />)
    expect(screen.getByRole('button', { name: /select/i })).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = jest.fn()
    render(<SessionTypeCard session={mockSession} onSelect={onSelect} />)
    
    const selectBtn = screen.getByRole('button', { name: /select/i })
    selectBtn.click()
    expect(onSelect).toHaveBeenCalledWith(mockSession)
  })
})
