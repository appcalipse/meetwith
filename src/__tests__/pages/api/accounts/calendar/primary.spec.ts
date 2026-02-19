/**
 * Unit tests for /api/accounts/calendar/primary endpoint
 * Testing GET requests for primary calendar email retrieval
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/sync_helper', () => ({
  getCalendarPrimaryEmail: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/accounts/calendar/primary'
import * as syncHelper from '@/utils/sync_helper'

describe('/api/accounts/calendar/primary', () => {
  const mockGetCalendarPrimaryEmail = syncHelper.getCalendarPrimaryEmail as jest.Mock

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
      method: 'GET',
      query: { targetAccount: '0x1234567890abcdef' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/accounts/calendar/primary', () => {
    it('should return 200 with email for valid account', async () => {
      const mockEmail = 'test@example.com'
      mockGetCalendarPrimaryEmail.mockResolvedValue(mockEmail)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetCalendarPrimaryEmail).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ email: mockEmail })
    })

    it('should return 404 when account not found', async () => {
      mockGetCalendarPrimaryEmail.mockRejectedValue(new Error('Not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetCalendarPrimaryEmail).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle missing targetAccount parameter', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetCalendarPrimaryEmail).toHaveBeenCalledWith(undefined)
    })

    it('should handle null targetAccount', async () => {
      req.query = { targetAccount: null }
      mockGetCalendarPrimaryEmail.mockRejectedValue(new Error('Invalid account'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle database errors gracefully', async () => {
      mockGetCalendarPrimaryEmail.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle empty email response', async () => {
      mockGetCalendarPrimaryEmail.mockResolvedValue('')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ email: '' })
    })

    it('should handle array targetAccount parameter', async () => {
      req.query = { targetAccount: ['0x123', '0x456'] }
      mockGetCalendarPrimaryEmail.mockResolvedValue('test@example.com')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetCalendarPrimaryEmail).toHaveBeenCalledWith('0x123')
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetCalendarPrimaryEmail).not.toHaveBeenCalled()
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
