import { render, screen } from '@testing-library/react'
import React from 'react'
import Custom404 from '@/pages/404'

const mockPush = jest.fn()
jest.mock('next/router', () => ({
  __esModule: true,
  default: {
    push: jest.fn(),
  },
  useRouter: jest.fn(() => ({ push: mockPush, pathname: '/404' })),
}))

describe('404 Page', () => {
  it('renders 404 page without crashing', () => {
    expect(() => render(<Custom404 />)).not.toThrow()
  })

  it('displays not found message', () => {
    render(<Custom404 />)
    expect(screen.getByText(/does not seem to exist/i)).toBeInTheDocument()
  })

  it('shows go home button', () => {
    render(<Custom404 />)
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument()
  })

  it('renders 404 image', () => {
    render(<Custom404 />)
    expect(screen.getByAltText('404')).toBeInTheDocument()
  })

  it('has proper heading', () => {
    render(<Custom404 />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('displays Ops heading', () => {
    render(<Custom404 />)
    const heading = screen.getByRole('heading')
    expect(heading.textContent).toBe('Ops')
  })

  it('renders with correct layout', () => {
    const { container } = render(<Custom404 />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows helpful message', () => {
    render(<Custom404 />)
    expect(screen.getByText(/page.*does not seem to exist/i)).toBeInTheDocument()
  })

  it('button has correct text', () => {
    render(<Custom404 />)
    expect(screen.getByText('Go to Home')).toBeInTheDocument()
  })

  it('has container element', () => {
    const { container } = render(<Custom404 />)
    expect(container.querySelector('[class*="chakra"]')).toBeTruthy()
  })

  it('image has correct src', () => {
    render(<Custom404 />)
    const img = screen.getByAltText('404')
    expect(img).toHaveAttribute('src', '/assets/404.svg')
  })
})
