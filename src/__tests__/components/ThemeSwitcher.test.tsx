import { render, screen } from '@testing-library/react'
import React from 'react'

import { ThemeSwitcher } from '@/components/ThemeSwitcher'

describe('ThemeSwitcher', () => {
  it('renders theme switcher', () => {
    render(<ThemeSwitcher />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('has light mode option', () => {
    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    button.click()
    expect(screen.getByText(/light/i)).toBeInTheDocument()
  })

  it('has dark mode option', () => {
    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    button.click()
    expect(screen.getByText(/dark/i)).toBeInTheDocument()
  })

  it('toggles between themes', () => {
    render(<ThemeSwitcher />)
    const button = screen.getByRole('button')
    button.click()
    
    const darkOption = screen.getByText(/dark/i)
    darkOption.click()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('shows current theme icon', () => {
    const { container } = render(<ThemeSwitcher />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
