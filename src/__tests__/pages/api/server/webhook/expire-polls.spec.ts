/**
 * Unit tests for /api/server/webhook/expire-polls endpoint
 * Testing poll expiration webhook functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  expireStalePolls: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/server/webhook/expire-polls'
import * as database from '@/utils/database'

describe('/api/server/webhook/expire-polls', () => {
  const mockExpireStalePolls = database.expireStalePolls as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockResult = {
    expiredCount: 5,
    timestamp: '2024-01-01T10:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/webhook/expire-polls', () => {
    it('should expire polls successfully', async () => {
      mockExpireStalePolls.mockResolvedValue(mockResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExpireStalePolls).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        expiredCount: 5,
        message: 'Successfully expired 5 poll(s)',
        success: true,
        timestamp: '2024-01-01T10:00:00Z',
      })
    })

    it('should handle zero expired polls', async () => {
      mockExpireStalePolls.mockResolvedValue({
        expiredCount: 0,
        timestamp: '2024-01-01T10:00:00Z',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        expiredCount: 0,
        message: 'Successfully expired 0 poll(s)',
        success: true,
        timestamp: '2024-01-01T10:00:00Z',
      })
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      mockExpireStalePolls.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database error',
        success: false,
      })
    })

    it('should handle non-Error exceptions', async () => {
      mockExpireStalePolls.mockRejectedValue('string error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'string error',
        success: false,
      })
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockExpireStalePolls).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
