import { render, screen } from '@testing-library/react'
import React from 'react'
import BannerPage from '@/pages/banner'

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), query: {} })),
}))

describe('Banner Page', () => {
  it('renders banner page', () => {
    render(<BannerPage />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('displays banner image', () => {
    render(<BannerPage />)
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('shows banner content', () => {
    const { container } = render(<BannerPage />)
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('has proper layout structure', () => {
    const { container } = render(<BannerPage />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing', () => {
    expect(() => render(<BannerPage />)).not.toThrow()
  })

  it('has correct dimensions', () => {
    render(<BannerPage />)
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('width')
  })

  it('displays user banner', () => {
    render(<BannerPage />)
    expect(screen.getByRole('img')).toHaveAttribute('alt')
  })

  it('loads banner asset', () => {
    render(<BannerPage />)
    const img = screen.getByRole('img')
    expect(img.getAttribute('src')).toBeTruthy()
  })

  it('has responsive layout', () => {
    const { container } = render(<BannerPage />)
    expect(container.querySelector('[class*="responsive"]')).toBeTruthy()
  })

  it('renders banner container', () => {
    const { container } = render(<BannerPage />)
    expect(container.querySelector('div')).toBeInTheDocument()
  })
})
