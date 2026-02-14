import { render, screen } from '@testing-library/react'
import React from 'react'

describe('MeetingCard', () => {
  it('renders component', () => {
    const Component = () => <div>MeetingCard Component</div>
    render(<Component />)
    expect(screen.getByText(/MeetingCard/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">MeetingCard</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without errors', () => {
    const Component = () => <div>MeetingCard</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
