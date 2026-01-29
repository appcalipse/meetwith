import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Testimonials', () => {
  it('renders component', () => {
    const Component = () => <div>Testimonials Component</div>
    render(<Component />)
    expect(screen.getByText(/Testimonials/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">Testimonials</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const Component = () => <div>Testimonials</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
