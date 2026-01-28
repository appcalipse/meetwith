/**
 * Unit tests for /api/quickpoll/calendar/google/callback endpoint
 */

process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

const mockGetToken = jest.fn()
const mockSetCredentials = jest.fn()
const mockGenerateAuthUrl = jest.fn()
const mockCalendarListList = jest.fn()
const mockUserinfoGet = jest.fn()

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
      })),
    },
    calendar: jest.fn(() => ({
      calendarList: {
        list: mockCalendarListList,
      },
    })),
    oauth2: jest.fn(() => ({
      userinfo: {
        get: mockUserinfoGet,
      },
    })),
  },
}))

jest.mock('@/utils/database', () => ({
  addQuickPollParticipant: jest.fn(),
  getQuickPollBySlug: jest.fn(),
  getQuickPollParticipantByIdentifier: jest.fn(),
  saveQuickPollCalendar: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/calendar/google/callback'
import * as database from '@/utils/database'
import { PollVisibility, QuickPollParticipantType } from '@/types/QuickPoll'

describe('/api/quickpoll/calendar/google/callback', () => {
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

    mockGetToken.mockResolvedValue({
      res: {
        data: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
        },
      },
    })

    mockUserinfoGet.mockResolvedValue({
      data: {
        email: 'user@example.com',
        name: 'Test User',
      },
    })

    mockCalendarListList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'calendar-1',
            summary: 'Primary Calendar',
            backgroundColor: '#0000FF',
            primary: true,
          },
          {
            id: 'calendar-2',
            summary: 'Secondary Calendar',
            backgroundColor: '#FF0000',
            primary: false,
          },
        ],
      },
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

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetToken).toHaveBeenCalledWith('test-auth-code')
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
        expect.stringContaining('calendarResult=success&provider=google')
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

    it('should return 400 when credentials are missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'There are no Google Credentials installed.',
      })

      process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
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

    it('should handle calendar list fetch failure with fallback', async () => {
      mockCalendarListList.mockRejectedValue(new Error('Calendar API error'))
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({ id: 'participant-123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveQuickPollCalendar).toHaveBeenCalledWith(
        'participant-123',
        'user@example.com',
        expect.any(String),
        expect.any(Object),
        expect.arrayContaining([
          expect.objectContaining({
            calendarId: 'user@example.com',
            name: 'user@example.com',
          }),
        ])
      )
    })

    it('should map calendars correctly with colors and primary flag', async () => {
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
            color: '#0000FF',
            enabled: true,
            name: 'Primary Calendar',
            sync: true,
          },
          {
            calendarId: 'calendar-2',
            color: '#FF0000',
            enabled: false,
            name: 'Secondary Calendar',
            sync: true,
          },
        ]
      )
    })

    it('should use guest email from state when userinfo email is not available', async () => {
      mockUserinfoGet.mockResolvedValue({
        data: {
          name: 'Test User',
        },
      })
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue({ id: 'participant-123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddQuickPollParticipant).toHaveBeenCalledWith(
        'poll-123',
        expect.objectContaining({
          guest_email: 'test@example.com',
        })
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
