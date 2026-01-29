import { render, screen } from '@testing-library/react'
import React from 'react'

import PublicGroupLink from '@/components/group/PublicGroupLink'

const mockGroup = {
  id: '1',
  name: 'Team Alpha',
  slug: 'team-alpha',
}

describe('PublicGroupLink', () => {
  it('renders group link', () => {
    render(<PublicGroupLink group={mockGroup} />)
    expect(screen.getByText(/group link/i)).toBeInTheDocument()
  })

  it('displays group URL', () => {
    render(<PublicGroupLink group={mockGroup} />)
    expect(screen.getByText(/team-alpha/)).toBeInTheDocument()
  })

  it('has copy button', () => {
    render(<PublicGroupLink group={mockGroup} />)
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })

  it('shows share button', () => {
    render(<PublicGroupLink group={mockGroup} />)
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument()
  })

  it('displays full URL with domain', () => {
    render(<PublicGroupLink group={mockGroup} />)
    expect(screen.getByText(/meetwith\.com/i)).toBeInTheDocument()
  })
})
