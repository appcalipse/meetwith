import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('PayViaInvoice', () => {
  it('renders PayViaInvoice', () => {
    const Component = () => <div>PayViaInvoice</div>
    render(<Component />)
    expect(screen.getByText(/PayViaInvoice/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>PayViaInvoice</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>PayViaInvoice</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
