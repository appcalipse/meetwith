import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/router'
import React from 'react'

import { Navbar } from '@/components/nav/Navbar'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

describe('Navbar', () => {
  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      pathname: '/',
      query: {},
    })
  })

  it('renders navbar', () => {
    const { container } = render(<Navbar />)
    expect(container.querySelector('nav')).toBeInTheDocument()
  })

  it('displays logo', () => {
    render(<Navbar />)
    expect(screen.getByText(/meetwith/i)).toBeInTheDocument()
  })

  it('has navigation links', () => {
    const { container } = render(<Navbar />)
    const links = container.querySelectorAll('a')
    expect(links.length).toBeGreaterThan(0)
  })
})
