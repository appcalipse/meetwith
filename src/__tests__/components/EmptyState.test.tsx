import { render, screen } from '@testing-library/react'
import React from 'react'

import EmptyState from '@/components/EmptyState'

describe('EmptyState', () => {
  it('renders empty state component', () => {
    render(<EmptyState message="No data found" />)
    expect(screen.getByText('No data found')).toBeInTheDocument()
  })

  it('displays custom icon', () => {
    const { container } = render(
      <EmptyState message="Empty" icon={<div data-testid="custom-icon" />} />
    )
    expect(container.querySelector('[data-testid="custom-icon"]')).toBeInTheDocument()
  })

  it('shows action button when provided', () => {
    render(
      <EmptyState
        message="No items"
        actionLabel="Add Item"
        onAction={jest.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument()
  })

  it('calls onAction when button clicked', () => {
    const onAction = jest.fn()
    render(
      <EmptyState
        message="No items"
        actionLabel="Add"
        onAction={onAction}
      />
    )
    
    const button = screen.getByRole('button', { name: /add/i })
    button.click()
    expect(onAction).toHaveBeenCalled()
  })

  it('displays description when provided', () => {
    render(
      <EmptyState
        message="No data"
        description="Try adding some items to get started"
      />
    )
    expect(screen.getByText(/try adding/i)).toBeInTheDocument()
  })

  it('renders without action button', () => {
    render(<EmptyState message="Empty" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
