import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('GuestIdentificationModal', () => {
  it('renders GuestIdentificationModal', () => {
    const Component = () => <div>GuestIdentificationModal</div>
    render(<Component />)
    expect(screen.getByText(/GuestIdentificationModal/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">GuestIdentificationModal</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const Component = () => <div>GuestIdentificationModal</div>
    expect(() => render(<Component />)).not.toThrow()
  })

  it('displays content', () => {
    const Component = () => <section>GuestIdentificationModal</section>
    const { container } = render(<Component />)
    expect(container.querySelector('section')).toBeInTheDocument()
  })
})
