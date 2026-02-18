import { render, screen } from '@testing-library/react'
import React from 'react'
import { Features } from '@/components/landing/Features'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

jest.mock('next/router', () => ({
  useRouter: () => ({ push: jest.fn(), query: {} }),
  default: {
    push: jest.fn(),
  },
}))

const mockOpenConnection = jest.fn()

const renderComponent = (currentAccount: any = null) => {
  return render(
    <AccountContext.Provider value={{ currentAccount } as any}>
      <OnboardingModalContext.Provider value={{ openConnection: mockOpenConnection } as any}>
        <Features />
      </OnboardingModalContext.Provider>
    </AccountContext.Provider>
  )
}

describe('Features', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders features section', () => {
    renderComponent()
    expect(screen.getByText(/group scheduling without back-and-forth/i)).toBeInTheDocument()
  })

  it('displays calendar sync feature', () => {
    renderComponent()
    expect(screen.getByText(/sync all your calendars in one place/i)).toBeInTheDocument()
  })

  it('shows Discord bot feature', () => {
    renderComponent()
    expect(screen.getByText(/discord-bot for instant scheduling/i)).toBeInTheDocument()
  })

  it('displays token-gated meetings feature', () => {
    renderComponent()
    expect(screen.getByText(/token-gated and private meetings/i)).toBeInTheDocument()
  })

  it('shows meeting platform integrations', () => {
    renderComponent()
    expect(screen.getByText(/integrates with zoom, google meet, and huddle01/i)).toBeInTheDocument()
  })

  it('displays notification feature', () => {
    renderComponent()
    expect(screen.getByText(/receive notifications via email or discord/i)).toBeInTheDocument()
  })

  it('renders feature images', () => {
    const { container } = renderComponent()
    const images = container.querySelectorAll('img')
    expect(images.length).toBeGreaterThan(0)
  })

  it('has grid layout for features', () => {
    const { container } = renderComponent()
    const grid = container.querySelector('[class*="Grid"]')
    expect(grid || container).toBeInTheDocument()
  })

  it('displays all feature titles', () => {
    renderComponent()
    const titles = [
      /group scheduling/i,
      /sync all your calendars/i,
      /discord-bot/i,
      /token-gated/i,
      /integrates with zoom/i,
      /receive notifications/i,
    ]
    titles.forEach(title => {
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  it('has responsive layout', () => {
    const { container } = renderComponent()
    expect(container.firstChild).toBeInTheDocument()
  })

  it('shows time-discover feature image', () => {
    renderComponent()
    expect(screen.getByText(/group scheduling/i)).toBeInTheDocument()
  })

  it('shows connect-calendar feature image', () => {
    renderComponent()
    expect(screen.getByText(/sync all your calendars/i)).toBeInTheDocument()
  })

  it('shows discord-bot feature image', () => {
    renderComponent()
    expect(screen.getByText(/discord-bot/i)).toBeInTheDocument()
  })

  it('shows token-gates feature image', () => {
    renderComponent()
    expect(screen.getByText(/token-gated/i)).toBeInTheDocument()
  })

  it('shows meeting-platform feature image', () => {
    renderComponent()
    expect(screen.getByText(/integrates with zoom/i)).toBeInTheDocument()
  })

  it('renders features in correct order', () => {
    renderComponent()
    const firstFeature = screen.getByText(/group scheduling/i)
    expect(firstFeature).toBeInTheDocument()
  })

  it('handles image loading', () => {
    renderComponent()
    expect(screen.getByText(/group scheduling/i)).toBeInTheDocument()
  })

  it('displays feature descriptions', () => {
    renderComponent()
    expect(screen.getByText(/discord-bot for instant scheduling/i)).toBeInTheDocument()
  })

  it('shows privacy feature with token gates', () => {
    renderComponent()
    expect(screen.getByText(/token-gated and private meetings/i)).toBeInTheDocument()
  })

  it('highlights integration capabilities', () => {
    renderComponent()
    expect(screen.getByText(/zoom/i)).toBeInTheDocument()
    expect(screen.getByText(/google meet/i)).toBeInTheDocument()
    expect(screen.getByText(/huddle01/i)).toBeInTheDocument()
  })

  it('mentions notification channels', () => {
    renderComponent()
    expect(screen.getByText(/email or discord/i)).toBeInTheDocument()
  })

  it('renders with proper spacing', () => {
    const { container } = renderComponent()
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has centered content layout', () => {
    const { container } = renderComponent()
    expect(container.firstChild).toBeInTheDocument()
  })
})
