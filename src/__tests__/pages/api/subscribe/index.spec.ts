/**
 * Unit tests for /api/subscribe/index endpoint
 * Testing email subscription management
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  saveEmailToDB: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/subscribe/index'
import * as database from '@/utils/database'

describe('/api/subscribe/index', () => {
  const mockSaveEmailToDB = database.saveEmailToDB as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        email: 'test@example.com',
        plan: 'premium',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/subscribe/index', () => {
    it('should save email and return success', async () => {
      mockSaveEmailToDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).toHaveBeenCalledWith('test@example.com', 'premium')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should handle save failure', async () => {
      mockSaveEmailToDB.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: false })
    })

    it('should handle missing plan parameter', async () => {
      req.body = { email: 'test@example.com' }
      mockSaveEmailToDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).toHaveBeenCalledWith('test@example.com', undefined)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 404 for missing email', async () => {
      req.body = { plan: 'premium' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for null email', async () => {
      req.body = { email: null, plan: 'premium' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for empty email string', async () => {
      req.body = { email: '', plan: 'premium' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle database errors', async () => {
      mockSaveEmailToDB.mockRejectedValue(new Error('Database error'))

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow(
        'Database error'
      )
    })

    it('should handle different plan types', async () => {
      const plans = ['basic', 'premium', 'enterprise']
      
      for (const plan of plans) {
        jest.clearAllMocks()
        req.body = { email: 'test@example.com', plan }
        mockSaveEmailToDB.mockResolvedValue(true)

        await handler(req as NextApiRequest, res as NextApiResponse)

        expect(mockSaveEmailToDB).toHaveBeenCalledWith('test@example.com', plan)
      }
    })

    it('should handle email with special characters', async () => {
      req.body = { email: 'test+filter@example.co.uk', plan: 'premium' }
      mockSaveEmailToDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).toHaveBeenCalledWith('test+filter@example.co.uk', 'premium')
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should handle empty request body', async () => {
      req.body = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle null request body', async () => {
      req.body = null

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSaveEmailToDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockSaveEmailToDB).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
