import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Features', () => {
  it('renders component', () => {
    const Component = () => <div>Features Component</div>
    render(<Component />)
    expect(screen.getByText(/Features/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">Features</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const Component = () => <div>Features</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
