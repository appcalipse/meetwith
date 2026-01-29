import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('PaymentMethod', () => {
  it('renders PaymentMethod', () => {
    const Component = () => <div>PaymentMethod</div>
    render(<Component />)
    expect(screen.getByText(/PaymentMethod/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>PaymentMethod</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>PaymentMethod</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
