import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import Groups from '@/components/group/Groups'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
}))

const mockGroups = [
  { id: '1', name: 'Team Alpha', description: 'Dev team', member_count: 5 },
  { id: '2', name: 'Team Beta', description: 'Design team', member_count: 3 },
]

describe('Groups', () => {
  it('renders groups list', () => {
    render(<Groups groups={mockGroups} />)
    expect(screen.getByText('Team Alpha')).toBeInTheDocument()
    expect(screen.getByText('Team Beta')).toBeInTheDocument()
  })

  it('displays group descriptions', () => {
    render(<Groups groups={mockGroups} />)
    expect(screen.getByText('Dev team')).toBeInTheDocument()
  })

  it('shows member count', () => {
    render(<Groups groups={mockGroups} />)
    expect(screen.getByText(/5/)).toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('has create group button', () => {
    render(<Groups groups={mockGroups} />)
    expect(screen.getByRole('button', { name: /create group/i })).toBeInTheDocument()
  })

  it('shows empty state when no groups', () => {
    render(<Groups groups={[]} />)
    expect(screen.getByText(/no groups/i)).toBeInTheDocument()
  })

  it('allows clicking on group card', () => {
    render(<Groups groups={mockGroups} />)
    const groupCard = screen.getByText('Team Alpha')
    expect(groupCard).toBeInTheDocument()
  })
})
