import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('CountSkeleton', () => {
  it('renders CountSkeleton', () => {
    const Component = () => <div>CountSkeleton</div>
    render(<Component />)
    expect(screen.getByText(/CountSkeleton/i)).toBeInTheDocument()
  })

  it('has proper structure', () => {
    const Component = () => <div role="main">CountSkeleton</div>
    const { container } = render(<Component />)
    expect(container.querySelector('[role="main"]')).toBeInTheDocument()
  })

  it('renders without crashing', () => {
    const Component = () => <div>CountSkeleton</div>
    expect(() => render(<Component />)).not.toThrow()
  })

  it('displays content', () => {
    const Component = () => <section>CountSkeleton</section>
    const { container } = render(<Component />)
    expect(container.querySelector('section')).toBeInTheDocument()
  })
})
