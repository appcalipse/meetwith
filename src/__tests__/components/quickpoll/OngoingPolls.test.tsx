import { render, screen } from '@testing-library/react'
import React from 'react'

import OngoingPolls from '@/components/quickpoll/OngoingPolls'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

jest.mock('@/providers/MetricStateProvider', () => ({
  MetricStateContext: {
    Provider: ({ children }: any) => children,
  },
}))

describe('OngoingPolls', () => {
  it('renders ongoing polls component', () => {
    const { container } = render(<OngoingPolls />)
    expect(container).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<OngoingPolls />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays empty state when no polls', async () => {
    render(<OngoingPolls />)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.queryByText(/no ongoing polls/i)).toBeInTheDocument()
  })
})
