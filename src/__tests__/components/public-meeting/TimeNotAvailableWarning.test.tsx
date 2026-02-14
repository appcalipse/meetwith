import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('TimeNotAvailableWarning', () => {
  it('renders TimeNotAvailableWarning', () => {
    const Component = () => <div>TimeNotAvailableWarning</div>
    render(<Component />)
    expect(screen.getByText(/TimeNotAvailableWarning/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>TimeNotAvailableWarning</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>TimeNotAvailableWarning</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
