/**
 * Unit tests for /api/secure/calendar/event endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/services/calendar.backend.helper', () => ({
  CalendarBackendHelper: {
    updateCalendarEvent: jest.fn(),
  },
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/calendar/event'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'

describe('/api/secure/calendar/event', () => {
  const mockUpdateCalendarEvent = CalendarBackendHelper.updateCalendarEvent as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockEvent = {
    id: 'event-123',
    sourceEventId: 'source-123',
    source: 'google',
    calendarId: 'cal-123',
    accountEmail: 'test@example.com',
    title: 'Test Event',
    start: '2024-02-01T10:00:00Z',
    end: '2024-02-01T11:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'PATCH',
      body: mockEvent,
      session: {
        account: {
          address: '0x1234567890abcdef',
        },
      } as any,
    }

    res = {
      status: statusMock,
    }
  })

  describe('PATCH /api/secure/calendar/event', () => {
    it('should update calendar event successfully', async () => {
      mockUpdateCalendarEvent.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateCalendarEvent).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        expect.objectContaining({
          ...mockEvent,
          start: new Date(mockEvent.start),
          end: new Date(mockEvent.end),
        })
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 401 for unauthorized requests', async () => {
      req.session = { account: undefined } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(sendMock).toHaveBeenCalledWith('Unauthorized')
    })

    it('should return 400 when missing id', async () => {
      req.body = { ...mockEvent, id: undefined }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Invalid event data: missing id or sourceEventId')
    })

    it('should return 400 when missing sourceEventId', async () => {
      req.body = { ...mockEvent, sourceEventId: undefined }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 400 when missing source', async () => {
      req.body = { ...mockEvent, source: undefined }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Missing required fields: source or calendarId')
    })

    it('should return 400 when missing accountEmail', async () => {
      req.body = { ...mockEvent, accountEmail: undefined }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Missing required field: accountEmail')
    })

    it('should return 400 for invalid date format', async () => {
      req.body = { ...mockEvent, start: 'invalid-date' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Invalid date format for start or end')
    })

    it('should return 400 when end time is before start time', async () => {
      req.body = {
        ...mockEvent,
        start: '2024-02-01T11:00:00Z',
        end: '2024-02-01T10:00:00Z',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Event end time must be after start time')
    })

    it('should return 404 when event not found', async () => {
      mockUpdateCalendarEvent.mockRejectedValue(new Error('Event not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 403 for permission errors', async () => {
      mockUpdateCalendarEvent.mockRejectedValue(new Error('Unauthorized access'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 409 for conflict errors', async () => {
      mockUpdateCalendarEvent.mockRejectedValue(new Error('Event conflict detected'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })
  })

  describe('Non-PATCH methods', () => {
    it('should return 405 for GET', async () => {
      req.method = 'GET'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for POST', async () => {
      req.method = 'POST'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
