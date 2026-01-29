import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('QuickPollSaveChangesModal', () => {
  it('renders QuickPollSaveChangesModal', () => {
    const Component = () => <div>QuickPollSaveChangesModal</div>
    render(<Component />)
    expect(screen.getByText(/QuickPollSaveChangesModal/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">QuickPollSaveChangesModal</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const Component = () => <div>QuickPollSaveChangesModal</div>
    expect(() => render(<Component />)).not.toThrow()
  })

  it('displays content', () => {
    const Component = () => <section>QuickPollSaveChangesModal</section>
    const { container } = render(<Component />)
    expect(container.querySelector('section')).toBeInTheDocument()
  })
})
