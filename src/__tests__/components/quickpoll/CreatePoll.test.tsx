import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import CreatePoll from '@/components/quickpoll/CreatePoll'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('CreatePoll', () => {
  it('renders create poll form', () => {
    render(<CreatePoll />)
    expect(screen.getByText(/create poll/i)).toBeInTheDocument()
  })

  it('has poll title input', () => {
    render(<CreatePoll />)
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument()
  })

  it('has poll description textarea', () => {
    render(<CreatePoll />)
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
  })

  it('has date range picker', () => {
    render(<CreatePoll />)
    expect(screen.getByText(/date range/i)).toBeInTheDocument()
  })

  it('has create button', () => {
    render(<CreatePoll />)
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('allows typing poll title', () => {
    render(<CreatePoll />)
    const input = screen.getByLabelText(/title/i) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'My Poll' } })
    expect(input.value).toBe('My Poll')
  })

  it('allows typing poll description', () => {
    render(<CreatePoll />)
    const textarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Poll desc' } })
    expect(textarea.value).toBe('Poll desc')
  })

  it('disables submit button when form is invalid', () => {
    render(<CreatePoll />)
    const submitBtn = screen.getByRole('button', { name: /create/i })
    expect(submitBtn).toBeDisabled()
  })
})
