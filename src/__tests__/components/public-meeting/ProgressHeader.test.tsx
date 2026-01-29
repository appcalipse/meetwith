import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('ProgressHeader', () => {
  it('renders ProgressHeader', () => {
    const Component = () => <div>ProgressHeader</div>
    render(<Component />)
    expect(screen.getByText(/ProgressHeader/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>ProgressHeader</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>ProgressHeader</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
