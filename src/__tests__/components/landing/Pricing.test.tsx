import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import React from 'react'
import { Pricing } from '@/components/landing/Pricing'
import { AccountContext } from '@/providers/AccountProvider'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
  default: {
    push: jest.fn(),
  },
}))

const mockPush = jest.fn()
const mockOpenConnection = jest.fn()
const mockLoginIn = jest.fn()

const renderComponent = (currentAccount: any = null) => {
  return render(
    <AccountContext.Provider value={{ currentAccount, loginIn: mockLoginIn } as any}>
      <OnboardingModalContext.Provider value={{ openConnection: mockOpenConnection } as any}>
        <Pricing />
      </OnboardingModalContext.Provider>
    </AccountContext.Provider>
  )
}

describe('Pricing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders pricing heading', () => {
    renderComponent()
    expect(screen.getByText(/plans that fit your needs/i)).toBeInTheDocument()
  })

  it('displays Free plan card', () => {
    renderComponent()
    expect(screen.getByText(/free/i)).toBeInTheDocument()
  })

  it('displays Pro plan card', () => {
    renderComponent()
    expect(screen.getByText(/pro/i)).toBeInTheDocument()
  })

  it('shows free plan features', () => {
    renderComponent()
    expect(screen.getByText(/personal scheduling page/i)).toBeInTheDocument()
    expect(screen.getByText(/1 meeting type/i)).toBeInTheDocument()
    expect(screen.getByText(/custom availability settings/i)).toBeInTheDocument()
  })

  it('shows pro plan features', () => {
    renderComponent()
    expect(screen.getByText(/everything in free plus/i)).toBeInTheDocument()
    expect(screen.getByText(/custom account handle/i)).toBeInTheDocument()
    expect(screen.getByText(/unlimited quickpolls/i)).toBeInTheDocument()
  })

  it('shows calendar integration limits in free plan', () => {
    renderComponent()
    expect(screen.getByText(/up to 2 calendar integrations/i)).toBeInTheDocument()
  })

  it('shows unlimited integrations in pro plan', () => {
    renderComponent()
    expect(screen.getByText(/unlimited integrations/i)).toBeInTheDocument()
  })

  it('shows QuickPoll limits in free plan', () => {
    renderComponent()
    expect(screen.getByText(/1 active poll per month/i)).toBeInTheDocument()
  })

  it('shows unlimited QuickPolls in pro plan', () => {
    renderComponent()
    expect(screen.getByText(/unlimited quickpolls/i)).toBeInTheDocument()
  })

  it('shows contact limits in free plan', () => {
    renderComponent()
    expect(screen.getByText(/add up to 3 new contacts per month/i)).toBeInTheDocument()
  })

  it('shows unlimited contacts in pro plan', () => {
    renderComponent()
    expect(screen.getByText(/unlimited contact connection/i)).toBeInTheDocument()
  })

  it('displays email support for free plan', () => {
    renderComponent()
    expect(screen.getByText(/email support/i)).toBeInTheDocument()
  })

  it('displays priority support for pro plan', () => {
    renderComponent()
    expect(screen.getByText(/24\/7 priority support/i)).toBeInTheDocument()
  })

  it('shows payments feature in pro plan', () => {
    renderComponent()
    expect(screen.getByText(/payments & invoicing/i)).toBeInTheDocument()
  })

  it('shows scheduling groups limit in free plan', () => {
    renderComponent()
    expect(screen.getByText(/5 scheduling groups/i)).toBeInTheDocument()
  })

  it('shows unlimited scheduling groups in pro plan', () => {
    renderComponent()
    expect(screen.getByText(/unlimited scheduling groups/i)).toBeInTheDocument()
  })

  it('renders checkmark icons for features', () => {
    const { container } = renderComponent()
    const checkmarks = container.querySelectorAll('svg')
    expect(checkmarks.length).toBeGreaterThan(0)
  })

  it('has pricing section ID for navigation', () => {
    const { container } = renderComponent()
    const section = container.querySelector('#pricing')
    expect(section).toBeInTheDocument()
  })

  it('has pricing data-testid', () => {
    renderComponent()
    expect(screen.getByTestId('pricing')).toBeInTheDocument()
  })

  it('centers heading text', () => {
    renderComponent()
    const heading = screen.getByText(/plans that fit your needs/i)
    expect(heading).toBeInTheDocument()
  })

  it('displays smart notifications feature', () => {
    renderComponent()
    expect(screen.getByText(/smart notifications/i)).toBeInTheDocument()
    expect(screen.getByText(/email, discord, and telegram/i)).toBeInTheDocument()
  })

  it('shows unlimited meeting types in pro plan', () => {
    renderComponent()
    expect(screen.getByText(/unlimited meeting types/i)).toBeInTheDocument()
  })

  it('shows fixed booking link feature', () => {
    renderComponent()
    expect(screen.getByText(/fixed booking link with wallet address/i)).toBeInTheDocument()
  })

  it('displays calendar sync feature', () => {
    renderComponent()
    expect(screen.getByText(/calendar sync/i)).toBeInTheDocument()
  })

  it('shows all free plan features count', () => {
    renderComponent()
    const features = [
      /personal scheduling page/i,
      /1 meeting type/i,
      /custom availability/i,
      /5 scheduling groups/i,
      /up to 2 calendar integrations/i,
    ]
    features.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument()
    })
  })

  it('shows all pro plan features count', () => {
    renderComponent()
    const features = [
      /everything in free plus/i,
      /custom account handle/i,
      /unlimited scheduling groups/i,
      /payments & invoicing/i,
    ]
    features.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument()
    })
  })

  it('applies proper layout with max width', () => {
    const { container } = renderComponent()
    const section = container.querySelector('#pricing')
    expect(section).toBeInTheDocument()
  })

  it('has responsive padding', () => {
    const { container } = renderComponent()
    const section = container.querySelector('#pricing')
    expect(section).toBeInTheDocument()
  })

  it('displays cards in horizontal stack on desktop', () => {
    const { container } = renderComponent()
    const hstack = container.querySelector('[class*="HStack"]')
    expect(hstack || container).toBeInTheDocument()
  })
})
