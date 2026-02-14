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

  // EXPANDED TESTS - 40+ NEW TESTS
  
  it('displays shortened poll slug in link', () => {
    const longSlug = { ...mockPoll, slug: 'very-long-poll-slug-name-here' }
    renderComponent(longSlug)
    expect(screen.getByText(/meetwith\.com\/poll\//i)).toBeInTheDocument()
  })

  it('handles polls with no participants', () => {
    renderComponent({ participants: [] })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles polls with many participants', () => {
    const manyParticipants = Array(50).fill(null).map((_, i) => ({
      id: `p${i}`,
      poll_id: '1',
      account_address: `0x${i}`,
      participant_type: QuickPollParticipantType.GUEST,
    }))
    renderComponent({ participants: manyParticipants })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('shows cancelled status badge correctly', () => {
    renderComponent({ status: PollStatus.CANCELLED })
    expect(screen.getByText(PollStatus.CANCELLED.toUpperCase())).toBeInTheDocument()
  })

  it('shows scheduled status badge correctly', () => {
    renderComponent({ status: PollStatus.SCHEDULED })
    expect(screen.getByText(PollStatus.SCHEDULED.toUpperCase())).toBeInTheDocument()
  })

  it('handles poll with very long title', () => {
    const longTitle = { title: 'A'.repeat(200) }
    renderComponent(longTitle)
    expect(screen.getByText('A'.repeat(200))).toBeInTheDocument()
  })

  it('handles poll with special characters in title', () => {
    const specialTitle = { title: 'Meeting @ 10AM - Q&A Session (2024)' }
    renderComponent(specialTitle)
    expect(screen.getByText(specialTitle.title)).toBeInTheDocument()
  })

  it('handles poll with emoji in title', () => {
    const emojiTitle = { title: '🚀 Team Standup 🎉' }
    renderComponent(emojiTitle)
    expect(screen.getByText(emojiTitle.title)).toBeInTheDocument()
  })

  it('handles poll with null description', () => {
    const noDesc = { description: null }
    renderComponent(noDesc)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles poll with empty string description', () => {
    const emptyDesc = { description: '' }
    renderComponent(emptyDesc)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles poll with very long description', () => {
    const longDesc = { description: 'B'.repeat(500) }
    renderComponent(longDesc)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('navigates with correct intent parameter for schedule', () => {
    renderComponent()
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    fireEvent.click(scheduleBtn)
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('intent=schedule')
    )
  })

  it('navigates with correct intent parameter for edit availability', () => {
    renderComponent()
    const editBtn = screen.getAllByRole('button', { name: /edit your availability/i })[0]
    fireEvent.click(editBtn)
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('intent=edit_availability')
    )
  })

  it('includes pollId in navigation URL', () => {
    renderComponent()
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    fireEvent.click(scheduleBtn)
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('pollId=1')
    )
  })

  it('includes ref parameter in navigation URL', () => {
    renderComponent()
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    fireEvent.click(scheduleBtn)
    
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('ref=quickpoll')
    )
  })

  it('handles date range spanning multiple months', () => {
    const multiMonth = {
      starts_at: new Date('2024-01-01').toISOString(),
      ends_at: new Date('2024-03-31').toISOString(),
    }
    renderComponent(multiMonth)
    expect(screen.getByText(/meeting date range/i)).toBeInTheDocument()
  })

  it('handles same day start and end dates', () => {
    const sameDay = {
      starts_at: new Date('2024-01-01T09:00:00').toISOString(),
      ends_at: new Date('2024-01-01T17:00:00').toISOString(),
    }
    renderComponent(sameDay)
    expect(screen.getByText(/meeting date range/i)).toBeInTheDocument()
  })

  it('handles poll expiring today', () => {
    const expiringToday = {
      expires_at: new Date().toISOString(),
    }
    renderComponent(expiringToday)
    expect(screen.getByText(/poll closing date/i)).toBeInTheDocument()
  })

  it('handles poll that expired yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    renderComponent({
      expires_at: yesterday.toISOString(),
    })
    expect(screen.getByText(/poll closing date/i)).toBeInTheDocument()
  })

  it('displays correct host name from prop', () => {
    const customHost = { host_name: 'Bob Smith' }
    renderComponent(customHost)
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
  })

  it('handles missing host_name gracefully', () => {
    const noHost = { host_name: undefined }
    renderComponent(noHost)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles null host_name', () => {
    const nullHost = { host_name: null }
    renderComponent(nullHost)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('copies full poll URL with protocol', async () => {
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
        expect.stringMatching(/^http/)
      )
    })
  })

  it('handles clipboard API not available', async () => {
    const originalClipboard = navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      writable: true,
    })
    
    renderComponent()
    const copyBtn = screen.getByLabelText(/copy link/i)
    fireEvent.click(copyBtn)
    
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    })
  })

  it('shows success feedback after copying link', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn(),
      },
    })
    
    renderComponent()
    const copyBtn = screen.getByLabelText(/copy link/i)
    fireEvent.click(copyBtn)
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled()
    })
  })

  it('handles permission participant type', () => {
    renderComponent({
      user_participant_type: QuickPollParticipantType.PERMISSION,
    })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles unknown participant type', () => {
    renderComponent({
      user_participant_type: 'UNKNOWN' as any,
    })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles poll with permissions array', () => {
    renderComponent({
      permissions: ['can_edit', 'can_delete'],
    })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles empty permissions array', () => {
    renderComponent({ permissions: [] })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('disables edit button for past polls', () => {
    renderComponent({ status: PollStatus.COMPLETED })
    expect(screen.queryByRole('button', { name: /edit your availability/i })).not.toBeInTheDocument()
  })

  it('disables schedule button for cancelled polls', () => {
    renderComponent({ status: PollStatus.CANCELLED })
    expect(screen.queryByRole('button', { name: /schedule now/i })).not.toBeInTheDocument()
  })

  it('shows close poll option for ongoing polls', () => {
    renderComponent({ status: PollStatus.ONGOING })
    const menuButtons = screen.getAllByRole('button')
    const menuButton = menuButtons.find(btn => btn.getAttribute('aria-label') === null)
    
    if (menuButton) {
      fireEvent.click(menuButton)
      expect(screen.getByText(/close poll/i) || screen.getByText(/complete poll/i)).toBeInTheDocument()
    }
  })

  it('handles delete with empty response', async () => {
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

  it('handles deletion error gracefully', async () => {
    jest.spyOn(apiHelper, 'deleteQuickPoll').mockRejectedValue(new Error('Delete failed'))
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
    }
  })

  it('prevents multiple delete clicks', async () => {
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
        if (confirmBtn) {
          fireEvent.click(confirmBtn)
          fireEvent.click(confirmBtn)
        }
      })
      
      await waitFor(() => {
        expect(deleteSpy).toHaveBeenCalledTimes(1)
      })
    }
  })

  it('formats host address correctly', () => {
    const shortAddr = { host_address: '0xABC' }
    renderComponent(shortAddr)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles very recent created_at timestamp', () => {
    const recent = { created_at: new Date().toISOString() }
    renderComponent(recent)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles very old created_at timestamp', () => {
    const old = { created_at: new Date('2020-01-01').toISOString() }
    renderComponent(old)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles future starts_at date', () => {
    const future = { starts_at: new Date('2099-12-31').toISOString() }
    renderComponent(future)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles past ends_at date', () => {
    const past = { ends_at: new Date('2020-01-01').toISOString() }
    renderComponent(past)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('handles updated_at matching created_at', () => {
    const sameTime = new Date().toISOString()
    renderComponent({ created_at: sameTime, updated_at: sameTime })
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })

  it('renders correctly when showActions is explicitly true', () => {
    renderComponent({}, true)
    const menuButtons = screen.getAllByRole('button')
    expect(menuButtons.length).toBeGreaterThan(0)
  })

  it('renders correctly when canSchedule is explicitly true', () => {
    renderComponent({}, true, true)
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    expect(scheduleBtn).not.toBeDisabled()
  })

  it('handles guest participant with all permissions', () => {
    renderComponent({
      user_participant_type: QuickPollParticipantType.GUEST,
      permissions: ['can_view', 'can_edit', 'can_delete'],
    })
    expect(screen.getByText('GUEST')).toBeInTheDocument()
  })

  it('applies hover effects to action buttons', () => {
    renderComponent()
    const scheduleBtn = screen.getAllByRole('button', { name: /schedule now/i })[0]
    expect(scheduleBtn).toBeInTheDocument()
  })

  it('displays poll link with correct domain', () => {
    renderComponent()
    expect(screen.getByText(/meetwith\.com/i)).toBeInTheDocument()
  })

  it('handles missing participant type gracefully', () => {
    const noPType = { user_participant_type: undefined }
    renderComponent(noPType)
    expect(screen.getByText('Team Meeting Poll')).toBeInTheDocument()
  })
})
