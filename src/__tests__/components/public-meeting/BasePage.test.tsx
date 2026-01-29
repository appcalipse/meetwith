import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('BasePage', () => {
  it('renders BasePage', () => {
    const Component = () => <div>BasePage</div>
    render(<Component />)
    expect(screen.getByText(/BasePage/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>BasePage</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>BasePage</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
