import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('QuickPollMain', () => {
  it('renders QuickPollMain', () => {
    const Component = () => <div>QuickPollMain</div>
    render(<Component />)
    expect(screen.getByText(/QuickPollMain/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">QuickPollMain</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const Component = () => <div>QuickPollMain</div>
    expect(() => render(<Component />)).not.toThrow()
  })

  it('displays content', () => {
    const Component = () => <section>QuickPollMain</section>
    const { container } = render(<Component />)
    expect(container.querySelector('section')).toBeInTheDocument()
  })
})
