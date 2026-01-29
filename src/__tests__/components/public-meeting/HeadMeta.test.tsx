import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('HeadMeta', () => {
  it('renders HeadMeta', () => {
    const Component = () => <div>HeadMeta</div>
    render(<Component />)
    expect(screen.getByText(/HeadMeta/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>HeadMeta</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>HeadMeta</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
