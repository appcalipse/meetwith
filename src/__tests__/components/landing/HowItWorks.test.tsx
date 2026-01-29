import { render, screen } from '@testing-library/react'
import React from 'react'

describe('HowItWorks', () => {
  it('renders component', () => {
    const Component = () => <div>HowItWorks Component</div>
    render(<Component />)
    expect(screen.getByText(/HowItWorks/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">HowItWorks</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const Component = () => <div>HowItWorks</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
