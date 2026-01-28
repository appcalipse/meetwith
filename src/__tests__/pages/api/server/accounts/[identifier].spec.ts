/**
 * Unit tests for /api/server/accounts/[identifier] endpoint
 * Testing GET requests for server-side account lookup
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getAccountFromDB: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/accounts/[identifier]'
import * as database from '@/utils/database'

describe('/api/server/accounts/[identifier]', () => {
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockAccount = {
    address: '0x1234567890abcdef',
    username: 'testuser',
    email: 'test@example.com',
    avatar_url: 'https://example.com/avatar.png',
    created_at: new Date('2024-01-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: { identifier: '0x1234567890abcdef' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/server/accounts/[identifier]', () => {
    it('should return 200 with account data for valid identifier', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef', true)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockAccount)
    })

    it('should return 404 when account not found', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef', true)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle username identifier', async () => {
      req.query = { identifier: 'testuser' }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('testuser', true)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle email identifier', async () => {
      req.query = { identifier: 'test@example.com' }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('test@example.com', true)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing identifier parameter', async () => {
      req.query = {}
      mockGetAccountFromDB.mockRejectedValue(new Error('Invalid identifier'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith(undefined, true)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle database connection errors', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Database connection failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle null account response', async () => {
      mockGetAccountFromDB.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(null)
    })

    it('should handle account with partial data', async () => {
      const partialAccount = { address: '0x123', username: 'test' }
      mockGetAccountFromDB.mockResolvedValue(partialAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(partialAccount)
    })

    it('should handle array identifier parameter', async () => {
      req.query = { identifier: ['0x123', '0x456'] }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x123', true)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetAccountFromDB).not.toHaveBeenCalled()
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
