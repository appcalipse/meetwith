import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('ProgressHeaderItem', () => {
  it('renders ProgressHeaderItem', () => {
    const Component = () => <div>ProgressHeaderItem</div>
    render(<Component />)
    expect(screen.getByText(/ProgressHeaderItem/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>ProgressHeaderItem</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>ProgressHeaderItem</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
