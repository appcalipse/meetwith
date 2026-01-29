/**
 * Comprehensive tests for /api/meetings/[identifier] endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getMeetingByIdentifier: jest.fn(),
  getAccountFromDB: jest.fn(),
  initDB: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/meetings/[identifier]'
import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'

describe('/api/meetings/[identifier]', () => {
  const mockGetMeetingByIdentifier = database.getMeetingByIdentifier as jest.Mock
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn().mockReturnThis()
    sendMock = jest.fn().mockReturnThis()

    req = {
      method: 'GET',
      query: { identifier: 'test-meeting-123' },
    }

    res = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    }

    jest.clearAllMocks()
  })

  describe('GET method', () => {
    it('should return 200 and meeting data for valid identifier', async () => {
      const mockMeeting = {
        id: 'meeting-1',
        identifier: 'test-meeting-123',
        title: 'Test Meeting',
        description: 'Test Description',
      }
      
      mockGetMeetingByIdentifier.mockResolvedValue(mockMeeting)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingByIdentifier).toHaveBeenCalledWith('test-meeting-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockMeeting)
    })

    it('should return 404 when meeting not found', async () => {
      mockGetMeetingByIdentifier.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Meeting not found')
    })

    it('should return 400 for missing identifier', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Missing identifier')
    })

    it('should return 500 and log error on database failure', async () => {
      const error = new Error('Database error')
      mockGetMeetingByIdentifier.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('Internal server error')
    })

    it('should handle identifier as array', async () => {
      req.query = { identifier: ['test-meeting-123', 'extra'] }
      const mockMeeting = { id: 'meeting-1', identifier: 'test-meeting-123' }
      mockGetMeetingByIdentifier.mockResolvedValue(mockMeeting)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingByIdentifier).toHaveBeenCalledWith('test-meeting-123')
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('POST method', () => {
    it('should return 405 for unsupported method', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
    })
  })

  describe('PUT method', () => {
    it('should return 405 for unsupported method', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })

  describe('DELETE method', () => {
    it('should return 405 for unsupported method', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })

  describe('Edge cases', () => {
    it('should handle very long identifiers', async () => {
      const longId = 'a'.repeat(1000)
      req.query = { identifier: longId }
      mockGetMeetingByIdentifier.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingByIdentifier).toHaveBeenCalledWith(longId)
    })

    it('should handle special characters in identifier', async () => {
      req.query = { identifier: 'test-123-!@#$%' }
      mockGetMeetingByIdentifier.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingByIdentifier).toHaveBeenCalled()
    })

    it('should handle undefined query params', async () => {
      req.query = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })
})
