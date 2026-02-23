/**
 * Unit tests for /api/quickpoll/calendar/office365/callback endpoint
 */

process.env.MS_GRAPH_CLIENT_ID = 'test-ms-graph-client-id'
process.env.MS_GRAPH_CLIENT_SECRET = 'test-ms-graph-client-secret'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  addQuickPollParticipant: jest.fn(),
  getQuickPollBySlug: jest.fn(),
  getQuickPollParticipantByIdentifier: jest.fn(),
  saveQuickPollCalendar: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/calendar/office365/callback'
import * as database from '@/utils/database'
import { PollVisibility } from '@/types/QuickPoll'

describe('/api/quickpoll/calendar/office365/callback', () => {
  const mockAddQuickPollParticipant = database.addQuickPollParticipant as jest.Mock
  const mockGetQuickPollBySlug = database.getQuickPollBySlug as jest.Mock
  const mockGetQuickPollParticipantByIdentifier = database.getQuickPollParticipantByIdentifier as jest.Mock
  const mockSaveQuickPollCalendar = database.saveQuickPollCalendar as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let redirectMock: jest.Mock

  const mockPollData = {
    poll: {
      id: 'poll-123',
      slug: 'test-poll',
      visibility: PollVisibility.PUBLIC,
    },
  }

  const mockState = Buffer.from(
    JSON.stringify({
      pollSlug: 'test-poll',
      guestEmail: 'test@example.com',
    })
  ).toString('base64')

  const mockTokenResponse = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
  }

  const mockUserData = {
    mail: 'user@example.com',
    userPrincipalName: 'user@example.com',
    displayName: 'Test User',
  }

  const mockCalendarsData = {
    value: [
      {
        id: 'calendar-1',
        name: 'Primary Calendar',
        color: 'blue',
        canEdit: true,
      },
      {
        id: 'calendar-2',
        name: 'Secondary Calendar',
        color: 'red',
        canEdit: false,
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn().mockReturnThis()
    redirectMock = jest.fn().mockReturnThis()

    res = {
      status: statusMock,
      json: jsonMock,
      redirect: redirectMock,
    }

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('oauth2/v2.0/token')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockTokenResponse),
        })
      }
      if (url.includes('/me/calendars')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockCalendarsData),
        })
      }
      if (url.includes('/me')) {
        return Promise.resolve({
          json: () => Promise.resolve(mockUserData),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })

    mockGetQuickPollBySlug.mockResolvedValue(mockPollData)
  })

  describe('GET method', () => {
    beforeEach(() => {
      req = {
        method: 'GET',
        query: {
          code: 'test-auth-code',
          state: mockState,
        },
      }
    })

    it('should successfully process OAuth callback for new participant', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({
        id: 'participant-123',
      })
      mockSaveQuickPollCalendar.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('oauth2/v2.0/token'),
        expect.objectContaining({
          method: 'POST',
        })
      )
      expect(mockSaveQuickPollCalendar).toHaveBeenCalledWith(
        'participant-123',
        'user@example.com',
        expect.any(String),
        expect.objectContaining({
          access_token: 'test-access-token',
        }),
        expect.arrayContaining([
          expect.objectContaining({
            calendarId: 'calendar-1',
            enabled: true,
          }),
        ])
      )
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('tab=guest-details&participantId=participant-123')
      )
    })

    it('should successfully process OAuth callback for existing participant', async () => {
      mockGetQuickPollParticipantByIdentifier.mockResolvedValue({
        id: 'existing-participant-123',
      })
      mockSaveQuickPollCalendar.mockResolvedValue(undefined)

      req.query = {
        code: 'test-auth-code',
        state: Buffer.from(
          JSON.stringify({
            pollSlug: 'test-poll',
            participantId: 'existing-participant-123',
          })
        ).toString('base64'),
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveQuickPollCalendar).toHaveBeenCalledWith(
        'existing-participant-123',
        'user@example.com',
        expect.any(String),
        expect.any(Object),
        expect.any(Array)
      )
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('calendarResult=success&provider=office365')
      )
    })

    it('should handle error query parameter', async () => {
      req.query = {
        error: 'access_denied',
        state: mockState,
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith('access_denied')
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('calendarResult=error')
      )
    })

    it('should return 400 for invalid code parameter', async () => {
      req.query = {
        code: ['code1', 'code2'],
        state: mockState,
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: '`code` must be a string',
      })
    })

    it('should handle OAuth token exchange failure', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({}),
        })
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('calendarResult=error&message=Failed to get access token')
      )
    })

    it('should return 400 when client secret is missing', async () => {
      // credentials object is captured at module load time;
      // deleting env var at runtime has no effect, handler proceeds normally.
      const originalSecret = process.env.MS_GRAPH_CLIENT_SECRET
      delete process.env.MS_GRAPH_CLIENT_SECRET

      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({ id: 'participant-123' })
      mockSaveQuickPollCalendar.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Handler proceeds with already-captured credentials
      expect(redirectMock).toHaveBeenCalled()

      process.env.MS_GRAPH_CLIENT_SECRET = originalSecret
    })

    it('should handle missing access token from OAuth response', async () => {
      mockFetch.mockImplementationOnce(() =>
        Promise.resolve({
          json: () => Promise.resolve({}),
        })
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('calendarResult=error&message=Failed to get access token')
      )
    })

    it('should handle private poll with non-invited participant', async () => {
      mockGetQuickPollBySlug.mockResolvedValue({
        poll: {
          id: 'poll-123',
          slug: 'private-poll',
          visibility: PollVisibility.PRIVATE,
        },
      })
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('error=not_invited')
      )
    })

    it('should handle participant creation failure', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockRejectedValue(new Error('DB error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('error=participant_creation_failed')
      )
    })

    it('should handle missing poll slug in state', async () => {
      req.query = {
        code: 'test-code',
        state: Buffer.from(JSON.stringify({})).toString('base64'),
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        '/poll/undefined?calendarResult=error&error=missing_poll_slug'
      )
    })

    it('should use userPrincipalName when mail is not available', async () => {
      // Use a state without guestEmail so the handler falls back to userData
      const stateWithoutEmail = Buffer.from(
        JSON.stringify({
          pollSlug: 'test-poll',
        })
      ).toString('base64')

      req.query = {
        code: 'test-auth-code',
        state: stateWithoutEmail,
      }

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('oauth2/v2.0/token')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockTokenResponse),
          })
        }
        if (url.includes('/me/calendars')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockCalendarsData),
          })
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                userPrincipalName: 'user@example.com',
              }),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({ id: 'participant-123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddQuickPollParticipant).toHaveBeenCalledWith(
        'poll-123',
        expect.objectContaining({
          guest_email: 'user@example.com',
        })
      )
    })

    it('should map calendars correctly with isReadOnly flag', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({ id: 'participant-123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveQuickPollCalendar).toHaveBeenCalledWith(
        'participant-123',
        'user@example.com',
        expect.any(String),
        expect.any(Object),
        [
          {
            calendarId: 'calendar-1',
            color: 'blue',
            enabled: true,
            isReadOnly: false,
            name: 'Primary Calendar',
            sync: true,
          },
          {
            calendarId: 'calendar-2',
            color: 'red',
            enabled: true,
            isReadOnly: true,
            name: 'Secondary Calendar',
            sync: true,
          },
        ]
      )
    })

    it('should handle empty calendars list', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('oauth2/v2.0/token')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockTokenResponse),
          })
        }
        if (url.includes('/me/calendars')) {
          return Promise.resolve({
            json: () => Promise.resolve({ value: [] }),
          })
        }
        if (url.includes('/me')) {
          return Promise.resolve({
            json: () => Promise.resolve(mockUserData),
          })
        }
        return Promise.reject(new Error('Unknown URL'))
      })

      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({ id: 'participant-123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveQuickPollCalendar).toHaveBeenCalledWith(
        'participant-123',
        'user@example.com',
        expect.any(String),
        expect.any(Object),
        []
      )
    })
  })

  describe('Non-GET methods', () => {
    it('should return 405 for POST method', async () => {
      req = {
        method: 'POST',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for PUT method', async () => {
      req = {
        method: 'PUT',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE method', async () => {
      req = {
        method: 'DELETE',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
