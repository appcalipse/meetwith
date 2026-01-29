import { render, screen } from '@testing-library/react'
import React from 'react'

import CustomError from '@/components/CustomError'

describe('CustomError', () => {
  it('renders error message', () => {
    render(<CustomError message="Something went wrong" />)
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('displays error code', () => {
    render(<CustomError message="Error" code={404} />)
    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('shows default message when none provided', () => {
    render(<CustomError />)
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })

  it('has try again button', () => {
    render(<CustomError message="Error" onRetry={jest.fn()} />)
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calls onRetry when button clicked', () => {
    const onRetry = jest.fn()
    render(<CustomError message="Error" onRetry={onRetry} />)
    
    const button = screen.getByRole('button', { name: /try again/i })
    button.click()
    expect(onRetry).toHaveBeenCalled()
  })

  it('displays error icon', () => {
    const { container } = render(<CustomError message="Error" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('shows stack trace in development', () => {
    process.env.NODE_ENV = 'development'
    render(<CustomError message="Error" stack="Error at line 1" />)
    expect(screen.getByText(/error at line 1/i)).toBeInTheDocument()
  })
})
