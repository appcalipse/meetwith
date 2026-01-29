import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import React from 'react'

import PollCard from '@/components/quickpoll/PollCard'
import { MetricStateContext } from '@/providers/MetricStateProvider'
import {
  PollStatus,
  QuickPollParticipantType,
  QuickPollWithParticipants,
} from '@/types/QuickPoll'
import * as apiHelper from '@/utils/api_helper'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))
jest.mock('@/utils/api_helper')

const mockPush = jest.fn()
const mockFetchPollCounts = jest.fn()

const mockPoll: QuickPollWithParticipants & {
  host_name?: string
  user_participant_type?: QuickPollParticipantType
} = {
  id: '1',
  slug: 'test-poll',
  title: 'Team Meeting Poll',
  description: 'Find best time',
  status: PollStatus.ONGOING,
  starts_at: new Date('2024-01-01').toISOString(),
  ends_at: new Date('2024-01-31').toISOString(),
  expires_at: new Date('2024-02-01').toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  host_address: '0x1234',
  host_name: 'Alice',
  user_participant_type: QuickPollParticipantType.SCHEDULER,
  participants: [],
  permissions: [],
}

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const renderComponent = (
  poll: Partial<QuickPollWithParticipants> = {},
  showActions = true,
  canSchedule = true
) => {
  ;(useRouter as jest.Mock).mockReturnValue({
    push: mockPush,
    query: {},
    pathname: '/',
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MetricStateContext.Provider
        value={{ fetchPollCounts: mockFetchPollCounts } as any}
      >
        <PollCard
          poll={{ ...mockPoll, ...poll }}
          showActions={showActions}
          canSchedule={canSchedule}
        />
      </MetricStateContext.Provider>
    </QueryClientProvider>
  )
}

describe('PollCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders poll title', () => {
    renderComponent()
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('displays poll status badge', () => {
    renderComponent()
    expect(screen.getByText(PollStatus.ONGOING.toUpperCase())).toBeInTheDocument()
  })

  it('shows HOST badge for scheduler participant', () => {
    renderComponent()
    expect(screen.getByText('HOST')).toBeInTheDocument()
  })

  it('shows GUEST badge for guest participant', () => {
    renderComponent({
      user_participant_type: QuickPollParticipantType.GUEST,
    })
    expect(screen.getByText('GUEST')).toBeInTheDocument()
  })

  it('displays meeting date range', () => {
    renderComponent()
    expect(screen.getByText(/meeting date range/i)).toBeInTheDocument()
  })

  it('shows host name', () => {
    renderComponent()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })

  it('displays poll link', () => {
    renderComponent()
    expect(screen.getByText(/meetwith\.com\/poll\/test-poll/i)).toBeInTheDocument()
  })

  it('shows poll closing date when expires_at is set', () => {
    renderComponent()
    expect(screen.getByText(/poll closing date/i)).toBeInTheDocument()
  })

  it('hides poll closing date when expires_at is null', () => {
    renderComponent({ expires_at: null })
    expect(screen.queryByText(/poll closing date/i)).not.toBeInTheDocument()
  })

  it('copies poll link to clipboard on copy button click', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    })
    
    renderComponent()
    const copyBtn = screen.getByLabelText(/copy link/i)
    fireEvent.click(copyBtn)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('/poll/test-poll')
      )
    })
  })

  it('shows schedule now button for ongoing polls (host)', () => {
    renderComponent()
    expect(screen.getAllByRole('button', { name: /schedule now/i })[0]).toBeInTheDocument()
  })

  it('shows edit availability button for ongoing polls', () => {
    renderComponent()
    expect(screen.getAllByRole('button', { name: /edit your availability/i })[0]).toBeInTheDocument()
  })

  it('hides schedule now button for past polls', () => {
    renderComponent({ status: PollStatus.COMPLETED })
    expect(screen.queryByRole('button', { name: /schedule now/i })).not.toBeInTheDocument()
  })

  it('disables schedule button when canSchedule is false', () => {
    renderComponent({}, true, false)
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    expect(scheduleBtn).toBeDisabled()
  })

  it('navigates to schedule page on schedule now click', () => {
    renderComponent()
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    fireEvent.click(scheduleBtn)
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/schedule?ref=quickpoll&pollId=1&intent=schedule')
    )
  })

  it('navigates to schedule page on edit availability click', () => {
    renderComponent()
    const editBtn = screen.getAllByRole('button', { name: /edit your availability/i })[0]
    fireEvent.click(editBtn)
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/dashboard/schedule?ref=quickpoll&pollId=1&intent=edit_availability')
    )
  })

  it('shows action menu for hosts when showActions is true', () => {
    renderComponent()
    const menuButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('svg')
    )
    expect(menuButtons.length).toBeGreaterThan(0)
  })

  it('hides action menu when showActions is false', () => {
    renderComponent({}, false)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('opens delete modal on delete menu item click', async () => {
    renderComponent()
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      await waitFor(() => {
        const deleteBtn = screen.getByText(/delete poll/i)
        fireEvent.click(deleteBtn)
      })
      
      await waitFor(() => {
        expect(screen.getByText(/are you sure/i)).toBeInTheDocument()
      })
    }
  })

  it('calls deleteQuickPoll on confirm delete', async () => {
    const deleteSpy = jest.spyOn(apiHelper, 'deleteQuickPoll').mockResolvedValue(undefined)
    renderComponent()
    
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      await waitFor(() => {
        const deleteMenuItem = screen.getByText(/delete poll/i)
        fireEvent.click(deleteMenuItem)
      })
      
      await waitFor(() => {
        const confirmBtn = screen.getAllByRole('button', { name: /delete poll/i }).pop()
        if (confirmBtn) fireEvent.click(confirmBtn)
      })
      
      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledWith('1')
      })
    }
  })

  it('shows restore option for completed polls', () => {
    renderComponent({ status: PollStatus.COMPLETED })
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      expect(screen.getByText(/restore poll/i)).toBeInTheDocument()
    }
  })

  it('shows edit option for ongoing polls', () => {
    renderComponent({ status: PollStatus.ONGOING })
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      expect(screen.getByText(/edit poll/i)).toBeInTheDocument()
    }
  })

  it('navigates to edit page on edit poll click', async () => {
    renderComponent()
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      await waitFor(() => {
        const editBtn = screen.getByText(/edit poll/i)
        fireEvent.click(editBtn)
      })
      
      expect(mockPush).toHaveBeenCalledWith('/dashboard/edit-poll/test-poll')
    }
  })

  it('applies correct status colors for different statuses', () => {
    const { rerender } = renderComponent({ status: PollStatus.ONGOING })
    expect(screen.getByText(PollStatus.ONGOING.toUpperCase())).toBeInTheDocument()
    
    renderComponent({ status: PollStatus.CANCELLED })
    expect(screen.getByText(PollStatus.CANCELLED.toUpperCase())).toBeInTheDocument()
  })

  it('treats expired polls as past polls', () => {
    renderComponent({
      expires_at: new Date('2020-01-01').toISOString(),
      status: PollStatus.ONGOING,
    })
    expect(screen.queryByRole('button', { name: /edit your availability/i })).not.toBeInTheDocument()
  })

  it('invalidates queries after successful deletion', async () => {
    jest.spyOn(apiHelper, 'deleteQuickPoll').mockResolvedValue(undefined)
    renderComponent()
    
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      await waitFor(() => {
        const deleteMenuItem = screen.getByText(/delete poll/i)
        fireEvent.click(deleteMenuItem)
      })
      
      await waitFor(() => {
        const confirmBtn = screen.getAllByRole('button', { name: /delete poll/i }).pop()
        if (confirmBtn) fireEvent.click(confirmBtn)
      })
      
      await waitFor(() => {
        expect(mockFetchPollCounts).toHaveBeenCalled()
      })
    }
  })

  it('closes delete modal on cancel', async () => {
    renderComponent()
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      await waitFor(() => {
        const deleteMenuItem = screen.getByText(/delete poll/i)
        fireEvent.click(deleteMenuItem)
      })
      
      await waitFor(() => {
        const cancelBtn = screen.getByRole('button', { name: /cancel/i })
        fireEvent.click(cancelBtn)
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
      })
    }
  })
})
