import { render, screen } from '@testing-library/react'
import React from 'react'
import Custom404 from '@/pages/404'

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), pathname: '/404' })),
}))

describe('404 Page', () => {
  it('renders 404 page', () => {
    render(<Custom404 />)
    expect(screen.getByText(/404/i)).toBeInTheDocument()
  })

  it('displays not found message', () => {
    render(<Custom404 />)
    expect(screen.getByText(/not found/i)).toBeInTheDocument()
  })

  it('shows go home button', () => {
    render(<Custom404 />)
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument()
  })

  it('renders error icon', () => {
    const { container } = render(<Custom404 />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has proper heading', () => {
    render(<Custom404 />)
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('displays error code prominently', () => {
    render(<Custom404 />)
    const heading = screen.getByRole('heading')
    expect(heading.textContent).toContain('404')
  })

  it('renders with correct layout', () => {
    const { container } = render(<Custom404 />)
    expect(container.firstChild).toBeTruthy()
  })

  it('has centered content', () => {
    const { container } = render(<Custom404 />)
    expect(container.querySelector('[class*="center"]')).toBeTruthy()
  })

  it('shows helpful message', () => {
    render(<Custom404 />)
    expect(screen.getByText(/page.*does not exist/i)).toBeInTheDocument()
  })

  it('has accessible error message', () => {
    render(<Custom404 />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('renders metadata', () => {
    render(<Custom404 />)
    expect(document.title).toBeTruthy()
  })
})
