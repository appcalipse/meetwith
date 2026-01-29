import { render, screen } from '@testing-library/react'
import React from 'react'

import Footer from '@/components/Footer'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), pathname: '/' }),
}))

describe('Footer', () => {
  it('renders footer', () => {
    render(<Footer />)
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('displays copyright text', () => {
    render(<Footer />)
    expect(screen.getByText(/©|copyright/i)).toBeInTheDocument()
  })

  it('shows social media links', () => {
    render(<Footer />)
    expect(screen.getByText(/twitter|discord|github/i)).toBeInTheDocument()
  })

  it('has navigation links', () => {
    render(<Footer />)
    expect(screen.getByText(/about|privacy|terms/i)).toBeInTheDocument()
  })

  it('displays company name', () => {
    render(<Footer />)
    expect(screen.getByText(/meetwith/i)).toBeInTheDocument()
  })

  it('shows current year', () => {
    render(<Footer />)
    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument()
  })

  it('has contact link', () => {
    render(<Footer />)
    expect(screen.getByText(/contact/i)).toBeInTheDocument()
  })
})
