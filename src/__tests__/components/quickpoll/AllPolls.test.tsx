import { render, screen } from '@testing-library/react'
import React from 'react'

import AllPolls from '@/components/quickpoll/AllPolls'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

describe('AllPolls', () => {
  it('renders all polls section', () => {
    render(<AllPolls />)
    expect(screen.getByText(/all polls/i)).toBeInTheDocument()
  })

  it('displays ongoing polls tab', () => {
    render(<AllPolls />)
    expect(screen.getByText(/ongoing/i)).toBeInTheDocument()
  })

  it('displays past polls tab', () => {
    render(<AllPolls />)
    expect(screen.getByText(/past/i)).toBeInTheDocument()
  })

  it('shows default tab selection', () => {
    const { container } = render(<AllPolls />)
    expect(container.querySelector('[aria-selected="true"]')).toBeInTheDocument()
  })

  it('renders tab panel', () => {
    const { container } = render(<AllPolls />)
    expect(container.querySelector('[role="tabpanel"]')).toBeInTheDocument()
  })
})
