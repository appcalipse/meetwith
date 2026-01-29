import { render, screen, waitFor } from '@testing-library/react'
import { useRouter } from 'next/router'
import * as Sentry from '@sentry/nextjs'
import JoinMeetingPage from '../[...meetingId]'
import { getConferenceMeeting } from '@/utils/api_helper'
import { useLogin } from '@/session/login'
import { OnboardingModalContext } from '@/providers/OnboardingModalProvider'

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/api_helper', () => ({
  getConferenceMeeting: jest.fn(),
}))

jest.mock('@/session/login', () => ({
  useLogin: jest.fn(),
}))

jest.mock('@/components/Loading', () => ({
  __esModule: true,
  default: ({ label }: any) => <div data-testid="loading">{label}</div>,
}))

const mockOpenConnection = jest.fn()

describe('JoinMeetingPage', () => {
  const mockPush = jest.fn()
  const mockReplace = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    delete (global as any).document
    ;(global as any).document = { location: { href: '' } }
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
      query: {},
    })
    ;(useLogin as jest.Mock).mockReturnValue({
      currentAccount: null,
      loginIn: false,
    })
  })

  const renderWithContext = (component: React.ReactElement) => {
    return render(
      <OnboardingModalContext.Provider
        value={{ openConnection: mockOpenConnection } as any}
      >
        {component}
      </OnboardingModalContext.Provider>
    )
  }

  it('should show loading state initially', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })
    renderWithContext(<JoinMeetingPage />)
    expect(
      screen.getByText(/Please wait while we load the meeting data/i)
    ).toBeInTheDocument()
  })

  it('should fetch conference meeting on mount', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'FREE',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(getConferenceMeeting).toHaveBeenCalledWith('meeting-123')
    })
  })

  it('should show 404 when conference not found', async () => {
    ;(getConferenceMeeting as jest.Mock).mockRejectedValue(new Error('Not found'))
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'invalid' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(screen.getByText('Ops')).toBeInTheDocument()
      expect(
        screen.getByText(/the meeting you are looking for was not found/i)
      ).toBeInTheDocument()
    })
  })

  it('should handle error and capture to Sentry', async () => {
    const error = new Error('API Error')
    ;(getConferenceMeeting as jest.Mock).mockRejectedValue(error)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  it('should require login for paid meetings when not authenticated', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'PAID_MEETING',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })
    ;(useLogin as jest.Mock).mockReturnValue({
      currentAccount: null,
      loginIn: false,
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/You need to login to join this meeting/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/Sign in/i)).toBeInTheDocument()
    })
  })

  it('should redirect to meeting URL for free meetings', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'FREE',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect((global as any).document.location.href).toBe('https://zoom.us/j/123')
    })
  })

  it('should show redirect message for valid meetings', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'FREE',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(
        screen.getByText(/we will redirect you to the meeting/i)
      ).toBeInTheDocument()
    })
  })

  it('should show loading indicator during redirect', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'FREE',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toBeInTheDocument()
    })
  })

  it('should handle array meetingId', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'FREE',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: ['meeting-123', 'extra'] },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      expect(getConferenceMeeting).toHaveBeenCalled()
    })
  })

  it('should show sign in button for paid meetings', async () => {
    const mockConference = {
      id: 'conf-123',
      meeting_url: 'https://zoom.us/j/123',
      access_type: 'PAID_MEETING',
    }
    ;(getConferenceMeeting as jest.Mock).mockResolvedValue(mockConference)
    ;(useRouter as jest.Mock).mockReturnValue({
      query: { meetingId: 'meeting-123' },
    })

    renderWithContext(<JoinMeetingPage />)

    await waitFor(() => {
      const signInButton = screen.getByText(/Sign in/i)
      expect(signInButton).toBeInTheDocument()
    })
  })

  it('should not fetch when no meetingId in query', () => {
    ;(useRouter as jest.Mock).mockReturnValue({
      query: {},
    })

    renderWithContext(<JoinMeetingPage />)

    expect(getConferenceMeeting).not.toHaveBeenCalled()
  })
})
