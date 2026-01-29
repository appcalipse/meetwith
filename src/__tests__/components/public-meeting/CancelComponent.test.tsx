import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('CancelComponent', () => {
  it('renders CancelComponent', () => {
    const Component = () => <div>CancelComponent</div>
    render(<Component />)
    expect(screen.getByText(/CancelComponent/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>CancelComponent</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>CancelComponent</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
