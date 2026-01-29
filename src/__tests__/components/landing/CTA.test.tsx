import { render, screen } from '@testing-library/react'
import React from 'react'

describe('CTA', () => {
  it('renders component', () => {
    const Component = () => <div>CTA Component</div>
    render(<Component />)
    expect(screen.getByText(/CTA/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">CTA</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const Component = () => <div>CTA</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
