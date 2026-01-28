/**
 * Unit tests for /api/transactions/[id]/status endpoint
 * Testing transaction status retrieval
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/database', () => ({
  getTransactionsStatusById: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/transactions/[id]/status'
import * as database from '@/utils/database'

describe('/api/transactions/[id]/status', () => {
  const mockGetTransactionsStatusById = database.getTransactionsStatusById as jest.Mock
  const mockCaptureException = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockStatus = {
    status: 'completed',
    payment_status: 'paid',
    updated_at: new Date('2024-01-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: { id: 'tx-123' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/transactions/[id]/status', () => {
    it('should return 200 with status data', async () => {
      mockGetTransactionsStatusById.mockResolvedValue(mockStatus)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsStatusById).toHaveBeenCalledWith('tx-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockStatus)
    })

    it('should return 404 when status not found', async () => {
      mockGetTransactionsStatusById.mockRejectedValue(new Error('Status not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 when id parameter is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Id parameter required')
      expect(mockGetTransactionsStatusById).not.toHaveBeenCalled()
    })

    it('should return 404 when id is null', async () => {
      req.query = { id: null }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Id parameter required')
    })

    it('should handle pending status', async () => {
      mockGetTransactionsStatusById.mockResolvedValue({ status: 'pending' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ status: 'pending' })
    })

    it('should handle failed status', async () => {
      mockGetTransactionsStatusById.mockResolvedValue({ status: 'failed' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ status: 'failed' })
    })

    it('should handle cancelled status', async () => {
      mockGetTransactionsStatusById.mockResolvedValue({ status: 'cancelled' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ status: 'cancelled' })
    })

    it('should handle numeric ID', async () => {
      req.query = { id: '12345' }
      mockGetTransactionsStatusById.mockResolvedValue(mockStatus)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsStatusById).toHaveBeenCalledWith('12345')
    })

    it('should handle UUID ID', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      req.query = { id: uuid }
      mockGetTransactionsStatusById.mockResolvedValue(mockStatus)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsStatusById).toHaveBeenCalledWith(uuid)
    })

    it('should handle array id parameter', async () => {
      req.query = { id: ['tx-1', 'tx-2'] }
      mockGetTransactionsStatusById.mockResolvedValue(mockStatus)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsStatusById).toHaveBeenCalledWith('tx-1')
    })

    it('should handle database errors and log to Sentry', async () => {
      const dbError = new Error('Database timeout')
      mockGetTransactionsStatusById.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetTransactionsStatusById).not.toHaveBeenCalled()
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
