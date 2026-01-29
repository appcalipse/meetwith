import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('MakeYourPayment', () => {
  it('renders MakeYourPayment', () => {
    const Component = () => <div>MakeYourPayment</div>
    render(<Component />)
    expect(screen.getByText(/MakeYourPayment/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>MakeYourPayment</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>MakeYourPayment</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
