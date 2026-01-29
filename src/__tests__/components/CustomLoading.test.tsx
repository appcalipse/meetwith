import { render, screen } from '@testing-library/react'
import React from 'react'

import CustomLoading from '@/components/CustomLoading'

describe('CustomLoading', () => {
  it('renders loading indicator', () => {
    render(<CustomLoading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays loading text', () => {
    render(<CustomLoading message="Loading data..." />)
    expect(screen.getByText('Loading data...')).toBeInTheDocument()
  })

  it('shows default message when none provided', () => {
    render(<CustomLoading />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('renders spinner', () => {
    const { container } = render(<CustomLoading />)
    expect(container.querySelector('.spinner')).toBeInTheDocument()
  })

  it('displays full screen variant', () => {
    const { container } = render(<CustomLoading fullScreen />)
    expect(container.firstChild).toHaveClass('fullscreen')
  })

  it('shows inline variant', () => {
    const { container } = render(<CustomLoading inline />)
    expect(container.firstChild).toHaveClass('inline')
  })

  it('applies custom size', () => {
    const { container } = render(<CustomLoading size="large" />)
    expect(container.querySelector('.large')).toBeInTheDocument()
  })
})
