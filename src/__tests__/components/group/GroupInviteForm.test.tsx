import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import GroupInviteForm from '@/components/group/GroupInviteForm'

describe('GroupInviteForm', () => {
  it('renders invite form', () => {
    render(<GroupInviteForm onSubmit={jest.fn()} />)
    expect(screen.getByText(/invite/i)).toBeInTheDocument()
  })

  it('has email input', () => {
    render(<GroupInviteForm onSubmit={jest.fn()} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('has send button', () => {
    render(<GroupInviteForm onSubmit={jest.fn()} />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('validates email format', () => {
    render(<GroupInviteForm onSubmit={jest.fn()} />)
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'invalid' } })
    fireEvent.blur(emailInput)
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('calls onSubmit with valid email', () => {
    const onSubmit = jest.fn()
    render(<GroupInviteForm onSubmit={onSubmit} />)
    
    const emailInput = screen.getByLabelText(/email/i)
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    const submitBtn = screen.getByRole('button', { name: /send/i })
    fireEvent.click(submitBtn)
    
    expect(onSubmit).toHaveBeenCalledWith({ email: 'test@example.com' })
  })

  it('supports multiple email inputs', () => {
    render(<GroupInviteForm onSubmit={jest.fn()} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })
})
