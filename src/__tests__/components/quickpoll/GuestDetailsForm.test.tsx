import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import GuestDetailsForm from '@/components/quickpoll/GuestDetailsForm'

describe('GuestDetailsForm', () => {
  it('renders guest form', () => {
    render(<GuestDetailsForm onSubmit={jest.fn()} />)
    expect(screen.getByText(/guest details/i)).toBeInTheDocument()
  })

  it('has name input', () => {
    render(<GuestDetailsForm onSubmit={jest.fn()} />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
  })

  it('has email input', () => {
    render(<GuestDetailsForm onSubmit={jest.fn()} />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('has submit button', () => {
    render(<GuestDetailsForm onSubmit={jest.fn()} />)
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  })

  it('validates email format', () => {
    render(<GuestDetailsForm onSubmit={jest.fn()} />)
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    fireEvent.change(emailInput, { target: { value: 'invalid' } })
    fireEvent.blur(emailInput)
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('requires name field', () => {
    render(<GuestDetailsForm onSubmit={jest.fn()} />)
    const nameInput = screen.getByLabelText(/name/i)
    fireEvent.blur(nameInput)
    expect(screen.getByText(/required/i)).toBeInTheDocument()
  })

  it('calls onSubmit with form data', () => {
    const onSubmit = jest.fn()
    render(<GuestDetailsForm onSubmit={onSubmit} />)
    
    const nameInput = screen.getByLabelText(/name/i)
    const emailInput = screen.getByLabelText(/email/i)
    
    fireEvent.change(nameInput, { target: { value: 'John' } })
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
    
    const submitBtn = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(submitBtn)
    
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John',
      email: 'john@example.com',
    })
  })
})
