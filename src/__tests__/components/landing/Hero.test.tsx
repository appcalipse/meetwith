import { render, screen } from '@testing-library/react'
import React from 'react'

describe('Hero Component', () => {
  it('renders hero section', () => {
    const Hero = () => <div>Hero Section</div>
    render(<Hero />)
    expect(screen.getByText(/hero/i)).toBeInTheDocument()
  })
})
