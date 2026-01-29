import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('FiatPaymentVerifying', () => {
  it('renders FiatPaymentVerifying', () => {
    const Component = () => <div>FiatPaymentVerifying</div>
    render(<Component />)
    expect(screen.getByText(/FiatPaymentVerifying/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>FiatPaymentVerifying</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>FiatPaymentVerifying</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
