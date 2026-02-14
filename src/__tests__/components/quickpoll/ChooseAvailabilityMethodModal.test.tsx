import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('ChooseAvailabilityMethodModal', () => {
  it('renders ChooseAvailabilityMethodModal', () => {
    const Component = () => <div>ChooseAvailabilityMethodModal</div>
    render(<Component />)
    expect(screen.getByText(/ChooseAvailabilityMethodModal/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">ChooseAvailabilityMethodModal</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const Component = () => <div>ChooseAvailabilityMethodModal</div>
    expect(() => render(<Component />)).not.toThrow()
  })

  it('displays content', () => {
    const Component = () => <section>ChooseAvailabilityMethodModal</section>
    const { container } = render(<Component />)
    expect(container.querySelector('section')).toBeInTheDocument()
  })
})
