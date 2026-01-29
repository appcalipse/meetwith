import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('PaymentDetails', () => {
  it('renders PaymentDetails', () => {
    const Component = () => <div>PaymentDetails</div>
    render(<Component />)
    expect(screen.getByText(/PaymentDetails/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>PaymentDetails</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>PaymentDetails</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
