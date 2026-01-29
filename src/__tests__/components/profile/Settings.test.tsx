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
})
