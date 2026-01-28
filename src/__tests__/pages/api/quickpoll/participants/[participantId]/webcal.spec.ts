/**
 * Unit tests for /api/quickpoll/participants/[participantId]/webcal endpoint
 * Testing webcal feed integration for participants
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  saveQuickPollCalendar: jest.fn(),
  uploadIcsFile: jest.fn(),
}))

jest.mock('@/pages/api/secure/calendar_integrations/webcal', () => ({
  validateWebcalFeed: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: (handler: any) => handler,
}))

jest.mock('@/utils/uploads', () => ({
  withFileUpload: (handler: any) => handler,
  SIZE_5_MB: 5242880,
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/participants/[participantId]/webcal'
import * as database from '@/utils/database'
import { validateWebcalFeed } from '@/pages/api/secure/calendar_integrations/webcal'
import { CalendarIntegrationLimitExceededError } from '@/utils/errors'

describe('/api/quickpoll/participants/[participantId]/webcal', () => {
  const mockSaveQuickPollCalendar = database.saveQuickPollCalendar as jest.Mock
  const mockUploadIcsFile = database.uploadIcsFile as jest.Mock
  const mockValidateWebcalFeed = validateWebcalFeed as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockValidationResult = {
    valid: true,
    userEmail: 'user@example.com',
    calendarName: 'My Calendar',
    eventCount: 5,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'POST',
      query: {
        participantId: 'participant-123',
      },
      body: {
        url: 'https://calendar.example.com/feed.ics',
        title: 'Test Calendar',
      },
      session: {
        account: {
          address: '0x123',
          email: 'test@example.com',
        },
      },
    } as any

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/quickpoll/participants/[participantId]/webcal', () => {
    it('should connect webcal feed successfully with URL', async () => {
      mockValidateWebcalFeed.mockResolvedValue(mockValidationResult)
      mockSaveQuickPollCalendar.mockResolvedValue({})

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockValidateWebcalFeed).toHaveBeenCalledWith(
        'https://calendar.example.com/feed.ics',
        'Test Calendar'
      )
      expect(mockSaveQuickPollCalendar).toHaveBeenCalledWith(
        'participant-123',
        'user@example.com',
        'webcal',
        { url: 'https://calendar.example.com/feed.ics' },
        expect.arrayContaining([
          expect.objectContaining({
            calendarId: 'https://calendar.example.com/feed.ics',
            name: 'Test Calendar',
            enabled: true,
            isReadOnly: true,
            sync: false,
          }),
        ])
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        calendarName: 'Test Calendar',
        connected: true,
        email: 'user@example.com',
        eventCount: 5,
      })
    })

    it('should connect webcal feed successfully with uploaded file', async () => {
      req.body = {
        title: 'Test Calendar',
        files: {
          resource: {
            filename: 'calendar.ics',
            buffer: Buffer.from('calendar data'),
            mimeType: 'text/calendar',
          },
        },
      } as any
      mockUploadIcsFile.mockResolvedValue('https://storage.example.com/uploaded.ics')
      mockValidateWebcalFeed.mockResolvedValue(mockValidationResult)
      mockSaveQuickPollCalendar.mockResolvedValue({})

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUploadIcsFile).toHaveBeenCalledWith(
        'calendar.ics',
        expect.any(Buffer),
        'text/calendar'
      )
      expect(mockValidateWebcalFeed).toHaveBeenCalledWith(
        'https://storage.example.com/uploaded.ics',
        'Test Calendar'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 401 when not authenticated', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Authentication required' })
      expect(mockValidateWebcalFeed).not.toHaveBeenCalled()
    })

    it('should return 400 when URL is missing', async () => {
      req.body = { title: 'Test Calendar' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Calendar URL is required' })
      expect(mockValidateWebcalFeed).not.toHaveBeenCalled()
    })

    it('should return 400 when validation fails', async () => {
      mockValidateWebcalFeed.mockResolvedValue({
        valid: false,
        error: 'Invalid calendar format',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Invalid calendar format' })
      expect(mockSaveQuickPollCalendar).not.toHaveBeenCalled()
    })

    it('should return 400 when userEmail is not found', async () => {
      mockValidateWebcalFeed.mockResolvedValue({
        valid: true,
        userEmail: null,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: expect.stringContaining('Could not find your email address'),
        requiresEmail: true,
      })
    })

    it('should handle CalendarIntegrationLimitExceededError', async () => {
      const error = new CalendarIntegrationLimitExceededError('Limit exceeded')
      mockValidateWebcalFeed.mockResolvedValue(mockValidationResult)
      mockSaveQuickPollCalendar.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object))
      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Limit exceeded' })
    })

    it('should handle other errors', async () => {
      const error = new Error('Database error')
      mockValidateWebcalFeed.mockResolvedValue(mockValidationResult)
      mockSaveQuickPollCalendar.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object))
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database error',
        message: 'Failed to connect webcal feed',
      })
    })
  })

  describe('PUT /api/quickpoll/participants/[participantId]/webcal', () => {
    beforeEach(() => {
      req.method = 'PUT'
    })

    it('should validate webcal feed successfully', async () => {
      mockValidateWebcalFeed.mockResolvedValue(mockValidationResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockValidateWebcalFeed).toHaveBeenCalledWith(
        'https://calendar.example.com/feed.ics',
        'Test Calendar'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        calendarName: 'My Calendar',
        emailFound: true,
        eventCount: 5,
        url: 'https://calendar.example.com/feed.ics',
        userEmail: 'user@example.com',
        valid: true,
      })
      expect(mockSaveQuickPollCalendar).not.toHaveBeenCalled()
    })

    it('should return validation error when feed is invalid', async () => {
      mockValidateWebcalFeed.mockResolvedValue({
        valid: false,
        error: 'Invalid feed format',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid feed format',
        valid: false,
      })
    })

    it('should handle validation errors', async () => {
      const error = new Error('Validation failed')
      mockValidateWebcalFeed.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error, expect.any(Object))
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        valid: false,
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockValidateWebcalFeed.mockRejectedValue('string error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid ICS feed',
        valid: false,
      })
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 405 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Method not allowed' })
      expect(mockValidateWebcalFeed).not.toHaveBeenCalled()
    })

    it('should return 405 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Method not allowed' })
    })

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Method not allowed' })
    })
  })
})
