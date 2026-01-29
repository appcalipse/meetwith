import { render, screen } from '@testing-library/react'
import React from 'react'

import PaymentComponent from '@/components/public-meeting/PaymentComponent'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('PaymentComponent', () => {
  it('renders payment form', () => {
    render(<PaymentComponent amount={50} onSuccess={jest.fn()} />)
    expect(screen.getByText(/payment/i)).toBeInTheDocument()
  })

  it('displays payment amount', () => {
    render(<PaymentComponent amount={50} onSuccess={jest.fn()} />)
    expect(screen.getByText(/\$50/)).toBeInTheDocument()
  })

  it('shows crypto payment option', () => {
    render(<PaymentComponent amount={50} onSuccess={jest.fn()} />)
    expect(screen.getByText(/crypto/i)).toBeInTheDocument()
  })

  it('shows fiat payment option', () => {
    render(<PaymentComponent amount={50} onSuccess={jest.fn()} />)
    expect(screen.getByText(/card/i)).toBeInTheDocument()
  })

  it('has payment method selector', () => {
    render(<PaymentComponent amount={50} onSuccess={jest.fn()} />)
    const methods = screen.getAllByRole('button')
    expect(methods.length).toBeGreaterThan(0)
  })

  it('shows total amount', () => {
    render(<PaymentComponent amount={50} onSuccess={jest.fn()} />)
    expect(screen.getByText(/total/i)).toBeInTheDocument()
  })
})
