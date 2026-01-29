import { render, screen } from '@testing-library/react'
import { NextPageContext } from 'next'
import Schedule from '../schedule'

jest.mock('@/session/forceAuthenticationCheck', () => ({
  forceAuthenticationCheck: (component: any) => component,
}))

jest.mock('@/session/requireAuthentication', () => ({
  withLoginRedirect: (component: any) => {
    component.getInitialProps = Schedule.getInitialProps
    return component
  },
}))

jest.mock('@/components/schedule/ScheduleMain', () => ({
  __esModule: true,
  default: ({ groupId, intent, meetingId, contactId, pollId, conferenceId, seriesId }: any) => (
    <div data-testid="schedule-main">
      <span data-testid="group-id">{groupId}</span>
      <span data-testid="intent">{intent}</span>
      <span data-testid="meeting-id">{meetingId}</span>
      <span data-testid="contact-id">{contactId}</span>
      <span data-testid="poll-id">{pollId}</span>
      <span data-testid="conference-id">{conferenceId}</span>
      <span data-testid="series-id">{seriesId}</span>
    </div>
  ),
}))

jest.mock('@/components/schedule/schedule-time-discover/AvailabilityTracker', () => ({
  AvailabilityTrackerProvider: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/providers/schedule/NavigationContext', () => ({
  NavigationProvider: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/providers/schedule/ParticipantsContext', () => ({
  ParticipantsProvider: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/providers/schedule/PermissionsContext', () => ({
  PermissionsProvider: ({ children }: any) => <div>{children}</div>,
}))

jest.mock('@/providers/schedule/ScheduleContext', () => ({
  ScheduleStateProvider: ({ children }: any) => <div>{children}</div>,
}))

describe('Schedule Page', () => {
  it('should render with all providers', () => {
    const props = {
      groupId: 'group-123',
      intent: 'create' as any,
      meetingId: 'meeting-456',
      contactId: 'contact-789',
      pollId: 'poll-abc',
      conferenceId: 'conf-def',
      seriesId: 'series-ghi',
    }

    render(<Schedule {...props} />)

    expect(screen.getByTestId('schedule-main')).toBeInTheDocument()
    expect(screen.getByTestId('group-id')).toHaveTextContent('group-123')
    expect(screen.getByTestId('intent')).toHaveTextContent('create')
    expect(screen.getByTestId('meeting-id')).toHaveTextContent('meeting-456')
    expect(screen.getByTestId('contact-id')).toHaveTextContent('contact-789')
    expect(screen.getByTestId('poll-id')).toHaveTextContent('poll-abc')
    expect(screen.getByTestId('conference-id')).toHaveTextContent('conf-def')
    expect(screen.getByTestId('series-id')).toHaveTextContent('series-ghi')
  })

  it('should render without optional props', () => {
    render(<Schedule />)
    expect(screen.getByTestId('schedule-main')).toBeInTheDocument()
  })

  it('should extract props from query in getInitialProps', async () => {
    const ctx = {
      query: {
        groupId: 'group-123',
        intent: 'edit',
        meetingId: 'meeting-456',
        contactId: 'contact-789',
        pollId: 'poll-abc',
        conferenceId: 'conf-def',
        seriesId: 'series-ghi',
      },
    } as unknown as NextPageContext

    const result = await Schedule.getInitialProps?.(ctx)

    expect(result).toEqual({
      conferenceId: 'conf-def',
      contactId: 'contact-789',
      groupId: 'group-123',
      intent: 'edit',
      meetingId: 'meeting-456',
      pollId: 'poll-abc',
      seriesId: 'series-ghi',
    })
  })

  it('should handle empty query in getInitialProps', async () => {
    const ctx = { query: {} } as unknown as NextPageContext
    const result = await Schedule.getInitialProps?.(ctx)

    expect(result).toEqual({
      conferenceId: undefined,
      contactId: undefined,
      groupId: undefined,
      intent: undefined,
      meetingId: undefined,
      pollId: undefined,
      seriesId: undefined,
    })
  })

  it('should handle partial query parameters', async () => {
    const ctx = {
      query: {
        groupId: 'group-only',
        meetingId: 'meeting-only',
      },
    } as unknown as NextPageContext

    const result = await Schedule.getInitialProps?.(ctx)

    expect(result).toEqual({
      conferenceId: undefined,
      contactId: undefined,
      groupId: 'group-only',
      intent: undefined,
      meetingId: 'meeting-only',
      pollId: undefined,
      seriesId: undefined,
    })
  })
})
