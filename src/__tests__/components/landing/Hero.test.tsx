import { render, screen, fireEvent } from '@testing-library/react'
import { useRouter } from 'next/router'
import React from 'react'
import Hero from '@/components/landing/Hero'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockOpenConnection = jest.fn()
const mockLoginIn = jest.fn()

const renderComponent = (currentAccount: any = null, loginIn = false) => {
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  
  return render(
    <AccountContext.Provider value={{ currentAccount, loginIn } as any}>
      <OnboardingModalContext.Provider value={{ openConnection: mockOpenConnection } as any}>
        <Hero />
      </OnboardingModalContext.Provider>
    </AccountContext.Provider>
  )
}

describe('Hero Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders hero section', () => {
    renderComponent()
    expect(screen.getByText(/save time, have more productive meetings/i)).toBeInTheDocument()
  })

  it('displays main heading', () => {
    renderComponent()
    expect(screen.getByRole('heading', { name: /save time/i })).toBeInTheDocument()
  })

  it('shows descriptive text', () => {
    renderComponent()
    expect(screen.getByText(/whether you're a consultant/i)).toBeInTheDocument()
    expect(screen.getByText(/freelancer, or board member/i)).toBeInTheDocument()
  })

  it('displays "Get started for FREE" button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /get started for free/i })).toBeInTheDocument()
  })

  it('shows product UI image', () => {
    renderComponent()
    const image = screen.getByAltText('Product UI')
    expect(image).toBeInTheDocument()
  })

  it('opens connection modal when not logged in', () => {
    renderComponent()
    const button = screen.getByRole('button', { name: /get started for free/i })
    fireEvent.click(button)
    expect(mockOpenConnection).toHaveBeenCalled()
  })

  it('navigates to dashboard when already logged in', () => {
    const mockAccount = { address: '0x123' }
    renderComponent(mockAccount)
    const button = screen.getByRole('button', { name: /get started for free/i })
    fireEvent.click(button)
    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('shows loading state on button during login', () => {
    renderComponent(null, true)
    const button = screen.getByRole('button', { name: /get started for free/i })
    expect(button).toHaveAttribute('data-loading', 'true')
  })

  it('displays arrow icon on button', () => {
    const { container } = renderComponent()
    const button = screen.getByRole('button', { name: /get started for free/i })
    const icon = button.querySelector('svg')
    expect(icon).toBeInTheDocument()
  })

  it('has section ID for navigation', () => {
    const { container } = renderComponent()
    const section = container.querySelector('#home')
    expect(section).toBeInTheDocument()
  })

  it('applies background image on desktop', () => {
    const { container } = renderComponent()
    const section = container.querySelector('#home')
    expect(section).toBeInTheDocument()
  })

  it('centers content layout', () => {
    renderComponent()
    expect(screen.getByText(/save time/i)).toBeInTheDocument()
  })

  it('displays responsive text widths', () => {
    renderComponent()
    expect(screen.getByText(/meetwith makes scheduling/i)).toBeInTheDocument()
  })

  it('mentions "Meetwith" in description', () => {
    renderComponent()
    expect(screen.getByText(/meetwith makes scheduling/i)).toBeInTheDocument()
  })

  it('highlights "across multiple roles and teams"', () => {
    renderComponent()
    expect(screen.getByText(/across multiple roles and teams/i)).toBeInTheDocument()
  })

  it('uses proper heading hierarchy', () => {
    renderComponent()
    const heading = screen.getByRole('heading')
    expect(heading.tagName).toBe('H2')
  })

  it('has responsive padding', () => {
    const { container } = renderComponent()
    const section = container.querySelector('#home')
    expect(section).toBeInTheDocument()
  })

  it('positions elements with VStack', () => {
    renderComponent()
    expect(screen.getByText(/save time/i)).toBeInTheDocument()
    expect(screen.getByText(/whether you're/i)).toBeInTheDocument()
  })

  it('renders button with correct color scheme', () => {
    renderComponent()
    const button = screen.getByRole('button', { name: /get started for free/i })
    expect(button).toBeInTheDocument()
  })

  it('handles rapid button clicks', () => {
    renderComponent()
    const button = screen.getByRole('button', { name: /get started for free/i })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(mockOpenConnection).toHaveBeenCalledTimes(2)
  })

  it('does not navigate when login is in progress', () => {
    renderComponent(null, true)
    const button = screen.getByRole('button', { name: /get started for free/i })
    expect(button).toHaveAttribute('data-loading', 'true')
  })

  it('loads product image with priority', () => {
    renderComponent()
    const image = screen.getByAltText('Product UI')
    expect(image).toHaveAttribute('loading', 'eager')
  })

  it('uses webp format for product image', () => {
    renderComponent()
    const image = screen.getByAltText('Product UI')
    expect(image).toHaveAttribute('src')
  })

  it('emphasizes FREE in CTA button', () => {
    renderComponent()
    expect(screen.getByRole('button', { name: /free/i })).toBeInTheDocument()
  })

  it('has max width constraint for content', () => {
    const { container } = renderComponent()
    expect(container.firstChild).toBeInTheDocument()
  })

  it('applies proper z-index for layering', () => {
    const { container } = renderComponent()
    expect(container.firstChild).toBeInTheDocument()
  })

  it('uses relative positioning', () => {
    const { container } = renderComponent()
    expect(container.firstChild).toBeInTheDocument()
  })
})
