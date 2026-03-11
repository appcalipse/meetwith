/**
 * Unit tests for /api/gate/[id] endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/gate/[id]'
import * as database from '@/utils/database'

jest.mock('@/utils/database', () => ({
  getGateCondition: jest.fn(),
}))

describe('/api/gate/[id]', () => {
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
      query: {},
    }

    res = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    }

    jest.clearAllMocks()
  })

  describe('GET /api/gate/[id]', () => {
    it('should return gate condition when it exists', async () => {
      const mockGateCondition = {
        id: 'gate-123',
        name: 'Test Gate',
        conditions: [],
        created_at: new Date().toISOString(),
      }

      req.query = { id: 'gate-123' }
      ;(database.getGateCondition as jest.Mock).mockResolvedValue(
        mockGateCondition
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(database.getGateCondition).toHaveBeenCalledWith('gate-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGateCondition)
    })

    it('should return 404 when gate condition does not exist', async () => {
      req.query = { id: 'nonexistent' }
      ;(database.getGateCondition as jest.Mock).mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(database.getGateCondition).toHaveBeenCalledWith('nonexistent')
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 when gate condition is undefined', async () => {
      req.query = { id: 'undefined-gate' }
      ;(database.getGateCondition as jest.Mock).mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle database errors', async () => {
      req.query = { id: 'error-gate' }
      ;(database.getGateCondition as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('Non-GET requests', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'
      req.query = { id: 'gate-123' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(database.getGateCondition).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'
      req.query = { id: 'gate-123' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'
      req.query = { id: 'gate-123' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
