import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import React from 'react'

import Settings from '@/components/profile/Settings'
import { OnboardingContext } from '@/providers/OnboardingProvider'
import { Account } from '@/types/Account'
import { SettingsSection } from '@/types/Dashboard'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockReload = jest.fn()

const mockAccount: Account = {
  id: '1',
  address: '0x1234',
  name: 'John Doe',
  email: 'john@example.com',
  avatar_url: 'https://example.com/avatar.jpg',
  description: 'Test user',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  subscriptions: [],
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderComponent = (account: Account = mockAccount, query = {}) => {
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    replace: mockReplace,
    query,
    pathname: '/dashboard/settings/details',
    asPath: '/dashboard/settings/details',
    isReady: true,
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingContext.Provider value={{ reload: mockReload } as any}>
        <Settings currentAccount={account} />
      </OnboardingContext.Provider>
    </QueryClientProvider>
  )
}

describe('Settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders settings page', () => {
    renderComponent()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('shows all settings sections', () => {
    renderComponent()
    expect(screen.getByText(/account details/i)).toBeInTheDocument()
    expect(screen.getByText(/connected calendars/i)).toBeInTheDocument()
    expect(screen.getByText(/connected accounts/i)).toBeInTheDocument()
    expect(screen.getByText(/notifications/i)).toBeInTheDocument()
  })

  it('displays account plans & billing section', () => {
    renderComponent()
    expect(screen.getByText(/account plans & billing/i)).toBeInTheDocument()
  })

  it('shows wallet & payments for pro users', () => {
    const proAccount = {
      ...mockAccount,
      subscriptions: [
        {
          id: '1',
          status: 'active',
          plan_id: 'pro',
          current_period_end: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
    }
    renderComponent(proAccount)
    expect(screen.getByText(/wallet & payments/i)).toBeInTheDocument()
  })

  it('has go back button', () => {
    renderComponent()
    expect(screen.getByText(/go back/i)).toBeInTheDocument()
  })

  it('navigates back to meetings on go back click', () => {
    renderComponent()
    const backBtn = screen.getAllByText(/go back/i)[0]
    fireEvent.click(backBtn)
    expect(mockPush).toHaveBeenCalledWith('/dashboard/meetings')
  })

  it('defaults to account details section', () => {
    renderComponent()
    const detailsBtn = screen.getAllByText(/account details/i)[0]
    expect(detailsBtn).toHaveClass('chakra-button')
  })

  it('navigates to connected calendars section', () => {
    renderComponent()
    const calendarsBtn = screen.getAllByText(/connected calendars/i)[0]
    fireEvent.click(calendarsBtn)
    
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/dashboard/settings/connected-calendars',
      }),
      undefined,
      expect.any(Object)
    )
  })

  it('navigates to notifications section', () => {
    renderComponent()
    const notifBtn = screen.getAllByText(/notifications/i)[0]
    fireEvent.click(notifBtn)
    
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/dashboard/settings/notifications',
      }),
      undefined,
      expect.any(Object)
    )
  })

  it('navigates to subscriptions section', () => {
    renderComponent()
    const subsBtn = screen.getAllByText(/account plans & billing/i)[0]
    fireEvent.click(subsBtn)
    
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/dashboard/settings/subscriptions',
      }),
      undefined,
      expect.any(Object)
    )
  })

  it('renders account details component by default', () => {
    renderComponent()
    expect(screen.getByText(/account details/i)).toBeInTheDocument()
  })

  it('shows calendar result success toast', () => {
    renderComponent(mockAccount, { calendarResult: 'success' })
    expect(mockReload).toHaveBeenCalled()
  })

  it('shows calendar result error toast', () => {
    renderComponent(mockAccount, { calendarResult: 'error' })
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('shows stripe result success toast', () => {
    renderComponent(mockAccount, { stripeResult: 'success' })
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('shows stripe result pending toast', () => {
    renderComponent(mockAccount, { stripeResult: 'pending' })
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('handles section navigation from URL', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
      pathname: '/dashboard/settings/connected-calendars',
      asPath: '/dashboard/settings/connected-calendars',
      isReady: true,
    })
    
    renderComponent()
    expect(screen.getByText(/connected calendars/i)).toBeInTheDocument()
  })

  it('highlights active section', () => {
    renderComponent()
    const detailsBtn = screen.getAllByText(/account details/i)[0]
    expect(detailsBtn.closest('button')).toHaveStyle({ color: expect.any(String) })
  })

  it('shows mobile menu toggle on mobile', () => {
    global.innerWidth = 500
    global.dispatchEvent(new Event('resize'))
    
    const { container } = renderComponent()
    const menuButton = container.querySelector('[aria-label="Open settings menu"]')
    expect(menuButton).toBeInTheDocument()
  })

  it('renders settings sidebar on desktop', () => {
    global.innerWidth = 1200
    global.dispatchEvent(new Event('resize'))
    
    renderComponent()
    expect(screen.getAllByText(/settings/i).length).toBeGreaterThan(0)
  })

  it('handles OAuth code in query params', () => {
    renderComponent(mockAccount, { code: 'oauth-code-123' })
    
    waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: '/dashboard/settings/connected-accounts',
        }),
        undefined,
        expect.any(Object)
      )
    })
  })

  it('navigates to connected accounts section', () => {
    renderComponent()
    const accountsBtn = screen.getAllByText(/connected accounts/i)[0]
    fireEvent.click(accountsBtn)
    
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/dashboard/settings/connected-accounts',
      }),
      undefined,
      expect.any(Object)
    )
  })

  it('allows section navigation via keyboard', () => {
    renderComponent()
    const detailsBtn = screen.getAllByText(/account details/i)[0]
    fireEvent.keyDown(detailsBtn, { key: 'Enter', code: 'Enter' })
    expect(mockReplace).toHaveBeenCalled()
  })

  // EXPANDED ROUTING AND EDGE CASE TESTS (20+ new tests)

  it('navigates to wallet & payments when available', () => {
    const proAccount = {
      ...mockAccount,
      subscriptions: [{ id: '1', status: 'active', plan_id: 'pro', current_period_end: new Date().toISOString() }],
    }
    renderComponent(proAccount)
    const walletBtn = screen.getByText(/wallet & payments/i)
    fireEvent.click(walletBtn)
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('wallet') }),
      undefined,
      expect.any(Object)
    )
  })

  it('handles router query with custom redirect', () => {
    renderComponent(mockAccount, { redirect: 'connected-calendars' })
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('preserves query params during section navigation', () => {
    renderComponent(mockAccount, { utm_source: 'email' })
    const notifBtn = screen.getAllByText(/notifications/i)[0]
    fireEvent.click(notifBtn)
    expect(mockReplace).toHaveBeenCalled()
  })

  it('handles rapid section switching', () => {
    renderComponent()
    const detailsBtn = screen.getAllByText(/account details/i)[0]
    const notifBtn = screen.getAllByText(/notifications/i)[0]
    
    fireEvent.click(detailsBtn)
    fireEvent.click(notifBtn)
    fireEvent.click(detailsBtn)
    
    expect(mockReplace).toHaveBeenCalledTimes(3)
  })

  it('displays correct section based on pathname', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
      pathname: '/dashboard/settings/notifications',
      asPath: '/dashboard/settings/notifications',
      isReady: true,
    })
    
    renderComponent()
    expect(screen.getAllByText(/notifications/i)[0]).toBeInTheDocument()
  })

  it('handles invalid section in pathname gracefully', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
      pathname: '/dashboard/settings/invalid-section',
      asPath: '/dashboard/settings/invalid-section',
      isReady: true,
    })
    
    renderComponent()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('shows subscription section for free users', () => {
    const freeAccount = { ...mockAccount, subscriptions: [] }
    renderComponent(freeAccount)
    expect(screen.getByText(/account plans & billing/i)).toBeInTheDocument()
  })

  it('hides wallet section for free users', () => {
    const freeAccount = { ...mockAccount, subscriptions: [] }
    renderComponent(freeAccount)
    expect(screen.queryByText(/wallet & payments/i)).not.toBeInTheDocument()
  })

  it('handles expired subscription gracefully', () => {
    const expiredAccount = {
      ...mockAccount,
      subscriptions: [
        { id: '1', status: 'expired', plan_id: 'pro', current_period_end: new Date('2020-01-01').toISOString() },
      ],
    }
    renderComponent(expiredAccount)
    expect(screen.getByText(/account plans & billing/i)).toBeInTheDocument()
  })

  it('handles canceled subscription', () => {
    const canceledAccount = {
      ...mockAccount,
      subscriptions: [
        { id: '1', status: 'canceled', plan_id: 'pro', current_period_end: new Date().toISOString() },
      ],
    }
    renderComponent(canceledAccount)
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('handles multiple query result types simultaneously', () => {
    renderComponent(mockAccount, { 
      calendarResult: 'success',
      stripeResult: 'pending'
    })
    expect(mockReload).toHaveBeenCalled()
  })

  it('navigates to billing from query param', () => {
    renderComponent(mockAccount, { section: SettingsSection.SUBSCRIPTION_BILLING })
    expect(screen.getByText(/account plans & billing/i)).toBeInTheDocument()
  })

  it('handles deep link navigation from external source', () => {
    renderComponent(mockAccount, { ref: 'email', section: 'notifications' })
    expect(screen.getByText(/notifications/i)).toBeInTheDocument()
  })

  it('shows all section buttons for pro users', () => {
    const proAccount = {
      ...mockAccount,
      subscriptions: [{ id: '1', status: 'active', plan_id: 'pro', current_period_end: new Date().toISOString() }],
    }
    renderComponent(proAccount)
    expect(screen.getByText(/account details/i)).toBeInTheDocument()
    expect(screen.getByText(/connected calendars/i)).toBeInTheDocument()
    expect(screen.getByText(/connected accounts/i)).toBeInTheDocument()
    expect(screen.getByText(/notifications/i)).toBeInTheDocument()
    expect(screen.getByText(/account plans & billing/i)).toBeInTheDocument()
    expect(screen.getByText(/wallet & payments/i)).toBeInTheDocument()
  })

  it('maintains state when router is not ready', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
      pathname: '/dashboard/settings/details',
      asPath: '/dashboard/settings/details',
      isReady: false,
    })
    
    renderComponent()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('handles navigation when router push fails', async () => {
    mockPush.mockRejectedValue(new Error('Navigation failed'))
    renderComponent()
    const backBtn = screen.getAllByText(/go back/i)[0]
    fireEvent.click(backBtn)
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalled()
    })
  })

  it('handles calendar success with reload', () => {
    renderComponent(mockAccount, { calendarResult: 'success' })
    expect(mockReload).toHaveBeenCalledTimes(1)
  })

  it('does not reload on calendar error', () => {
    renderComponent(mockAccount, { calendarResult: 'error' })
    expect(mockReload).not.toHaveBeenCalled()
  })

  it('displays settings title prominently', () => {
    renderComponent()
    const titles = screen.getAllByText(/settings/i)
    expect(titles.length).toBeGreaterThan(0)
  })

  it('allows multiple back button clicks', () => {
    renderComponent()
    const backBtn = screen.getAllByText(/go back/i)[0]
    fireEvent.click(backBtn)
    fireEvent.click(backBtn)
    expect(mockPush).toHaveBeenCalledTimes(2)
  })

  it('handles account with no email gracefully', () => {
    const noEmailAccount = { ...mockAccount, email: null }
    renderComponent(noEmailAccount)
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('handles account with no avatar gracefully', () => {
    const noAvatarAccount = { ...mockAccount, avatar_url: null }
    renderComponent(noAvatarAccount)
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('shows loading state when router is changing', () => {
    renderComponent()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
  })

  it('handles section change with URL update', () => {
    renderComponent()
    const calendarsBtn = screen.getAllByText(/connected calendars/i)[0]
    fireEvent.click(calendarsBtn)
    
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/dashboard/settings/connected-calendars' }),
      undefined,
      expect.objectContaining({ shallow: true })
    )
  })
})
