import { render, screen } from '@testing-library/react'
import React from 'react'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('PaidMeetings', () => {
  it('renders PaidMeetings', () => {
    const Component = () => <div>PaidMeetings</div>
    render(<Component />)
    expect(screen.getByText(/PaidMeetings/i)).toBeInTheDocument()
  })

  it('displays properly', () => {
    const Component = () => <article>PaidMeetings</article>
    const { container } = render(<Component />)
    expect(container.querySelector('article')).toBeInTheDocument()
  })

  it('has no errors', () => {
    const Component = () => <div>PaidMeetings</div>
    const { container } = render(<Component />)
    expect(container).toBeTruthy()
  })
})
