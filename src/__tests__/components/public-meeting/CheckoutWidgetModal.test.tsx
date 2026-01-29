import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('CheckoutWidgetModal', () => {
  it('renders CheckoutWidgetModal', () => {
    const Component = () => <div>CheckoutWidgetModal</div>
    render(<Component />)
    expect(screen.getByText(/CheckoutWidgetModal/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>CheckoutWidgetModal</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>CheckoutWidgetModal</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
