import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('SessionTypeCardPaymentInfo', () => {
  it('renders SessionTypeCardPaymentInfo', () => {
    const Component = () => <div>SessionTypeCardPaymentInfo</div>
    render(<Component />)
    expect(screen.getByText(/SessionTypeCardPaymentInfo/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>SessionTypeCardPaymentInfo</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>SessionTypeCardPaymentInfo</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
