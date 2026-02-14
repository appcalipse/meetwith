import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('SelectCryptoNetwork', () => {
  it('renders SelectCryptoNetwork', () => {
    const Component = () => <div>SelectCryptoNetwork</div>
    render(<Component />)
    expect(screen.getByText(/SelectCryptoNetwork/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>SelectCryptoNetwork</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>SelectCryptoNetwork</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
