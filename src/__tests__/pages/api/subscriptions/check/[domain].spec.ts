/**
 * Unit tests for /api/subscriptions/check/[domain] endpoint
 * Testing domain subscription verification
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@/utils/database', () => ({
  getSubscription: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/subscriptions/check/[domain]'
import * as database from '@/utils/database'

describe('/api/subscriptions/check/[domain]', () => {
  const mockGetSubscription = database.getSubscription as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockSubscription = {
    id: 'sub-123',
    domain: 'example.meetwith.io',
    plan_id: 'plan-premium',
    account_address: '0x123',
    expires_at: new Date('2025-01-01'),
    active: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: { domain: 'example.meetwith.io' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/subscriptions/check/[domain]', () => {
    it('should return 200 with subscription data for valid domain', async () => {
      mockGetSubscription.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('example.meetwith.io')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockSubscription)
    })

    it('should return 404 when subscription not found', async () => {
      mockGetSubscription.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('example.meetwith.io')
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 when subscription is undefined', async () => {
      mockGetSubscription.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle subdomain queries', async () => {
      req.query = { domain: 'user.example.meetwith.io' }
      mockGetSubscription.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('user.example.meetwith.io')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle custom domain queries', async () => {
      req.query = { domain: 'custom-domain.com' }
      mockGetSubscription.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('custom-domain.com')
    })

    it('should handle missing domain parameter', async () => {
      req.query = {}
      mockGetSubscription.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith(undefined)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle null domain parameter', async () => {
      req.query = { domain: null as any }
      mockGetSubscription.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle array domain parameter', async () => {
      req.query = { domain: ['domain1.com', 'domain2.com'] }
      mockGetSubscription.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('domain1.com')
    })

    it('should handle expired subscription', async () => {
      const expiredSub = {
        ...mockSubscription,
        expires_at: new Date('2020-01-01'),
        active: false,
      }
      mockGetSubscription.mockResolvedValue(expiredSub)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(expiredSub)
    })

    it('should handle subscription with minimal data', async () => {
      const minimalSub = { id: 'sub-123', domain: 'example.com' }
      mockGetSubscription.mockResolvedValue(minimalSub)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(minimalSub)
    })

    it('should handle subscription with complete data', async () => {
      const completeSub = {
        ...mockSubscription,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-15'),
        metadata: { key: 'value' },
      }
      mockGetSubscription.mockResolvedValue(completeSub)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(completeSub)
    })

    it('should handle database errors', async () => {
      mockGetSubscription.mockRejectedValue(new Error('Database error'))

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow(
        'Database error'
      )
    })

    it('should handle domain with special characters', async () => {
      req.query = { domain: 'test-domain_123.co.uk' }
      mockGetSubscription.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('test-domain_123.co.uk')
    })

    it('should handle uppercase domain', async () => {
      req.query = { domain: 'EXAMPLE.COM' }
      mockGetSubscription.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSubscription).toHaveBeenCalledWith('EXAMPLE.COM')
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetSubscription).not.toHaveBeenCalled()
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
