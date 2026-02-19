import { render, screen } from '@testing-library/react'
import React from 'react'

import PastPolls from '@/components/quickpoll/PastPolls'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

jest.mock('@/providers/MetricStateProvider', () => ({
  MetricStateContext: {
    Provider: ({ children }: any) => children,
  },
}))

describe('PastPolls', () => {
  it('renders past polls component', () => {
    const { container } = render(<PastPolls />)
    expect(container).toBeInTheDocument()
  })

  it('shows loading state', () => {
    render(<PastPolls />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays empty state message when no polls', async () => {
    render(<PastPolls />)
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(screen.queryByText(/no past polls/i)).toBeInTheDocument()
  })
})
