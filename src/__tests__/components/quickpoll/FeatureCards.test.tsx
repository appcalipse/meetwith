import { render, screen } from '@testing-library/react'
import React from 'react'

import FeatureCards from '@/components/quickpoll/FeatureCards'

describe('FeatureCards', () => {
  it('renders feature cards', () => {
    render(<FeatureCards />)
    expect(screen.getByText(/features/i)).toBeInTheDocument()
  })

  it('displays multiple feature cards', () => {
    const { container } = render(<FeatureCards />)
    const cards = container.querySelectorAll('[role="article"]')
    expect(cards.length).toBeGreaterThan(0)
  })

  it('shows feature icons', () => {
    const { container } = render(<FeatureCards />)
    const icons = container.querySelectorAll('svg')
    expect(icons.length).toBeGreaterThan(0)
  })

  it('displays feature titles', () => {
    render(<FeatureCards />)
    expect(screen.getByText(/easy scheduling/i)).toBeInTheDocument()
  })

  it('shows feature descriptions', () => {
    render(<FeatureCards />)
    const descriptions = screen.getAllByText(/\w+/)
    expect(descriptions.length).toBeGreaterThan(0)
  })
})
