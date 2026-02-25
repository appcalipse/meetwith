/**
 * Unit tests for /api/server/webhook/calendar/sync endpoint
 * Testing calendar webhook sync functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  handleWebhookEvent: jest.fn(),
}))

jest.mock('@/utils/constants', () => ({
  isProduction: false,
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/webhook/calendar/sync'
import * as database from '@/utils/database'

describe('/api/server/webhook/calendar/sync', () => {
  const mockHandleWebhookEvent = database.handleWebhookEvent as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockEvent = 'OK'

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      headers: {
        'x-goog-channel-id': 'channel-123',
        'x-goog-resource-id': 'resource-456',
        'x-goog-resource-state': 'sync',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/webhook/calendar/sync', () => {
    it('should handle webhook event successfully', async () => {
      mockHandleWebhookEvent.mockResolvedValue(mockEvent)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleWebhookEvent).toHaveBeenCalledWith(
        'channel-123',
        'resource-456',
        'sync'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockEvent)
    })

    it('should return 400 when channel ID is missing', async () => {
      req.headers = {
        'x-goog-resource-id': 'resource-456',
        'x-goog-resource-state': 'sync',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required headers',
      })
      expect(mockHandleWebhookEvent).not.toHaveBeenCalled()
    })

    it('should return 400 when resource ID is missing', async () => {
      req.headers = {
        'x-goog-channel-id': 'channel-123',
        'x-goog-resource-state': 'sync',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required headers',
      })
    })

    it('should return 400 when resource state is missing', async () => {
      req.headers = {
        'x-goog-channel-id': 'channel-123',
        'x-goog-resource-id': 'resource-456',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Missing required headers',
      })
    })

    it('should handle exists resource state', async () => {
      req.headers = {
        'x-goog-channel-id': 'channel-123',
        'x-goog-resource-id': 'resource-456',
        'x-goog-resource-state': 'exists',
      }
      mockHandleWebhookEvent.mockResolvedValue(mockEvent)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleWebhookEvent).toHaveBeenCalledWith(
        'channel-123',
        'resource-456',
        'exists'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle errors', async () => {
      const error = new Error('Database error')
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockHandleWebhookEvent.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockHandleWebhookEvent).not.toHaveBeenCalled()
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
