/**
 * Unit tests for /api/transactions/[id]/index endpoint
 * Testing transaction retrieval by ID
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/database', () => ({
  getTransactionsById: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/transactions/[id]/index'
import * as database from '@/utils/database'

describe('/api/transactions/[id]/index', () => {
  const mockGetTransactionsById = database.getTransactionsById as jest.Mock
  const mockCaptureException = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockTransaction = {
    id: 'tx-123',
    amount: 100,
    status: 'completed',
    meeting_type_id: 'meeting-type-123',
    guest_email: 'guest@example.com',
    created_at: new Date('2024-01-01'),
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

  describe('GET /api/transactions/[id]/index', () => {
    it('should return 200 with transaction data', async () => {
      mockGetTransactionsById.mockResolvedValue(mockTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsById).toHaveBeenCalledWith('tx-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockTransaction)
    })

    it('should return 404 when transaction not found', async () => {
      mockGetTransactionsById.mockRejectedValue(new Error('Transaction not found'))

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
      expect(mockGetTransactionsById).not.toHaveBeenCalled()
    })

    it('should return 404 when id is null', async () => {
      req.query = { id: null }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Id parameter required')
    })

    it('should return 404 when id is undefined', async () => {
      req.query = { id: undefined }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Id parameter required')
    })

    it('should handle numeric ID', async () => {
      req.query = { id: '12345' }
      mockGetTransactionsById.mockResolvedValue(mockTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsById).toHaveBeenCalledWith('12345')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle UUID ID', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      req.query = { id: uuid }
      mockGetTransactionsById.mockResolvedValue(mockTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsById).toHaveBeenCalledWith(uuid)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle array id parameter', async () => {
      req.query = { id: ['tx-1', 'tx-2'] }
      mockGetTransactionsById.mockResolvedValue(mockTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTransactionsById).toHaveBeenCalledWith('tx-1')
    })

    it('should handle database errors and log to Sentry', async () => {
      const dbError = new Error('Database connection failed')
      mockGetTransactionsById.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return transaction with minimal data', async () => {
      const minimalTransaction = { id: 'tx-123', amount: 100 }
      mockGetTransactionsById.mockResolvedValue(minimalTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(minimalTransaction)
    })

    it('should return transaction with complete data', async () => {
      const completeTransaction = {
        ...mockTransaction,
        stripe_session_id: 'sess_123',
        payment_intent_id: 'pi_123',
        metadata: { key: 'value' },
      }
      mockGetTransactionsById.mockResolvedValue(completeTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(completeTransaction)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetTransactionsById).not.toHaveBeenCalled()
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
