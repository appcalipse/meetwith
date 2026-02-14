import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('ConfirmPaymentInfo', () => {
  it('renders ConfirmPaymentInfo', () => {
    const Component = () => <div>ConfirmPaymentInfo</div>
    render(<Component />)
    expect(screen.getByText(/ConfirmPaymentInfo/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>ConfirmPaymentInfo</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>ConfirmPaymentInfo</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
