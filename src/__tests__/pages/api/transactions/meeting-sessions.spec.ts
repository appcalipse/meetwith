/**
 * Unit tests for /api/transactions/meeting-sessions endpoint
 * Testing meeting sessions retrieval by transaction hash
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getMeetingSessionsByTxHash: jest.fn(),
}))

jest.mock('@/utils/generic_utils', () => ({
  extractQuery: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/transactions/meeting-sessions'
import * as database from '@/utils/database'
import { TransactionIsRequired, TransactionNotFoundError } from '@/utils/errors'
import * as genericUtils from '@/utils/generic_utils'

describe('/api/transactions/meeting-sessions', () => {
  const mockGetMeetingSessionsByTxHash = database.getMeetingSessionsByTxHash as jest.Mock
  const mockExtractQuery = genericUtils.extractQuery as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockSessions = [
    {
      id: 'session-1',
      meeting_id: 'meeting-123',
      tx_hash: '0xabc123',
      start: new Date('2024-02-01T10:00:00Z'),
      end: new Date('2024-02-01T11:00:00Z'),
    },
    {
      id: 'session-2',
      meeting_id: 'meeting-456',
      tx_hash: '0xabc123',
      start: new Date('2024-02-02T10:00:00Z'),
      end: new Date('2024-02-02T11:00:00Z'),
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'GET',
      query: { tx: '0xabc123' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/transactions/meeting-sessions', () => {
    it('should return 200 with meeting sessions for valid tx hash', async () => {
      mockExtractQuery.mockReturnValue('0xabc123')
      mockGetMeetingSessionsByTxHash.mockResolvedValue(mockSessions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExtractQuery).toHaveBeenCalledWith(req.query, 'tx')
      expect(mockGetMeetingSessionsByTxHash).toHaveBeenCalledWith('0xabc123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockSessions)
    })

    it('should return 400 when tx parameter is missing', async () => {
      mockExtractQuery.mockReturnValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('required'),
      })
    })

    it('should return 404 when transaction not found', async () => {
      mockExtractQuery.mockReturnValue('0xabc123')
      mockGetMeetingSessionsByTxHash.mockRejectedValue(
        new TransactionNotFoundError('Transaction not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Transaction not found' })
    })

    it('should handle empty sessions array', async () => {
      mockExtractQuery.mockReturnValue('0xabc123')
      mockGetMeetingSessionsByTxHash.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([])
    })

    it('should handle single session', async () => {
      mockExtractQuery.mockReturnValue('0xabc123')
      mockGetMeetingSessionsByTxHash.mockResolvedValue([mockSessions[0]])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([mockSessions[0]])
    })

    it('should handle long transaction hash', async () => {
      const longHash = '0x' + 'a'.repeat(64)
      mockExtractQuery.mockReturnValue(longHash)
      mockGetMeetingSessionsByTxHash.mockResolvedValue(mockSessions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingSessionsByTxHash).toHaveBeenCalledWith(longHash)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle short transaction hash', async () => {
      const shortHash = '0x123'
      mockExtractQuery.mockReturnValue(shortHash)
      mockGetMeetingSessionsByTxHash.mockResolvedValue(mockSessions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingSessionsByTxHash).toHaveBeenCalledWith(shortHash)
    })

    it('should handle TransactionIsRequired error', async () => {
      mockExtractQuery.mockImplementation(() => {
        throw new TransactionIsRequired()
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should handle sessions with complete data', async () => {
      const completeSessions = mockSessions.map(s => ({
        ...s,
        participants: ['0x123', '0x456'],
        status: 'scheduled',
        metadata: { key: 'value' },
      }))
      mockExtractQuery.mockReturnValue('0xabc123')
      mockGetMeetingSessionsByTxHash.mockResolvedValue(completeSessions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(completeSessions)
    })

    it('should handle sessions with minimal data', async () => {
      const minimalSessions = [{ id: 'session-1', tx_hash: '0xabc123' }]
      mockExtractQuery.mockReturnValue('0xabc123')
      mockGetMeetingSessionsByTxHash.mockResolvedValue(minimalSessions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(minimalSessions)
    })

    it('should not handle other HTTP methods', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExtractQuery).not.toHaveBeenCalled()
      expect(mockGetMeetingSessionsByTxHash).not.toHaveBeenCalled()
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should not process POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingSessionsByTxHash).not.toHaveBeenCalled()
    })

    it('should not process PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingSessionsByTxHash).not.toHaveBeenCalled()
    })

    it('should not process DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingSessionsByTxHash).not.toHaveBeenCalled()
    })
  })
})
