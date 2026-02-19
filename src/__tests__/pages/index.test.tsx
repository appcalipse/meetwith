import { render, screen } from '@testing-library/react'
import React from 'react'

import Home from '@/pages/index'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('Home Page', () => {
  it('renders home page', () => {
    const { container } = render(<Home />)
    expect(container).toBeInTheDocument()
  })

  it('displays hero section', () => {
    render(<Home />)
    expect(screen.getByText(/meetwith|schedule|calendar/i)).toBeInTheDocument()
  })

  it('has call-to-action button', () => {
    render(<Home />)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('shows features section', () => {
    render(<Home />)
    expect(screen.getByText(/feature/i)).toBeInTheDocument()
  })

  it('displays benefits', () => {
    const { container } = render(<Home />)
    expect(container.textContent).toBeTruthy()
  })
})
