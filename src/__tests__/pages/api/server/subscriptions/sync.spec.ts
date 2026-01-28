/**
 * Unit tests for /api/server/subscriptions/sync endpoint
 * Testing subscription synchronization from blockchain
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@/utils/database', () => ({
  updateAccountSubscriptions: jest.fn(),
}))

jest.mock('@/utils/rpc_helper', () => ({
  getBlockchainSubscriptionsForAccount: jest.fn(),
  getDomainInfo: jest.fn(),
}))

jest.mock('@/utils/subscription_manager', () => ({
  convertBlockchainSubscriptionToSubscription: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/subscriptions/sync'
import * as database from '@/utils/database'
import * as rpcHelper from '@/utils/rpc_helper'
import * as subscriptionManager from '@/utils/subscription_manager'

describe('/api/server/subscriptions/sync', () => {
  const mockUpdateAccountSubscriptions = database.updateAccountSubscriptions as jest.Mock
  const mockGetBlockchainSubscriptionsForAccount = rpcHelper.getBlockchainSubscriptionsForAccount as jest.Mock
  const mockGetDomainInfo = rpcHelper.getDomainInfo as jest.Mock
  const mockConvertBlockchainSubscriptionToSubscription = subscriptionManager.convertBlockchainSubscriptionToSubscription as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let sendMock: jest.Mock

  const mockBlockchainSub = {
    plan_id: 'plan-123',
    domain: 'test.domain',
    subscriber: '0x123',
    expires_at: Date.now() + 86400000,
  }

  const mockDbSub = {
    plan_id: 'plan-123',
    domain: 'test.domain',
    account_address: '0x123',
    expires_at: new Date(mockBlockchainSub.expires_at),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))

    req = {
      method: 'GET',
      query: {},
    }

    res = {
      status: statusMock,
      send: sendMock,
    }
  })

  describe('GET /api/server/subscriptions/sync', () => {
    it('should sync subscriptions by domain', async () => {
      req.query = { domain: 'test.domain' }
      mockGetDomainInfo.mockResolvedValue([mockBlockchainSub])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])
      mockConvertBlockchainSubscriptionToSubscription.mockReturnValue(mockDbSub)
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetDomainInfo).toHaveBeenCalledWith('test.domain')
      expect(mockConvertBlockchainSubscriptionToSubscription).toHaveBeenCalledWith(mockBlockchainSub)
      expect(mockUpdateAccountSubscriptions).toHaveBeenCalledWith([mockDbSub])
      expect(sendMock).toHaveBeenCalledWith({ success: true })
    })

    it('should sync subscriptions by address', async () => {
      req.query = { address: '0x123', domain: 'test.domain' }
      mockGetDomainInfo.mockResolvedValue([])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([mockBlockchainSub])
      mockConvertBlockchainSubscriptionToSubscription.mockReturnValue(mockDbSub)
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetBlockchainSubscriptionsForAccount).toHaveBeenCalledWith('test.domain')
      expect(mockUpdateAccountSubscriptions).toHaveBeenCalledWith([mockDbSub])
    })

    it('should sync subscriptions by both domain and address', async () => {
      req.query = { domain: 'test.domain', address: '0x123' }
      const domainSub = { ...mockBlockchainSub, plan_id: 'domain-plan' }
      const addressSub = { ...mockBlockchainSub, plan_id: 'address-plan' }
      
      mockGetDomainInfo.mockResolvedValue([domainSub])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([addressSub])
      mockConvertBlockchainSubscriptionToSubscription
        .mockReturnValueOnce({ ...mockDbSub, plan_id: 'domain-plan' })
        .mockReturnValueOnce({ ...mockDbSub, plan_id: 'address-plan' })
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetDomainInfo).toHaveBeenCalledWith('test.domain')
      expect(mockGetBlockchainSubscriptionsForAccount).toHaveBeenCalled()
      expect(mockUpdateAccountSubscriptions).toHaveBeenCalledWith([
        { ...mockDbSub, plan_id: 'domain-plan' },
        { ...mockDbSub, plan_id: 'address-plan' },
      ])
    })

    it('should filter out subscriptions without plan_id', async () => {
      req.query = { domain: 'test.domain' }
      const subWithoutPlan = { ...mockBlockchainSub, plan_id: null }
      
      mockGetDomainInfo.mockResolvedValue([mockBlockchainSub, subWithoutPlan])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])
      mockConvertBlockchainSubscriptionToSubscription
        .mockReturnValueOnce(mockDbSub)
        .mockReturnValueOnce({ ...mockDbSub, plan_id: null })
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateAccountSubscriptions).toHaveBeenCalledWith([mockDbSub])
    })

    it('should handle empty blockchain subscriptions', async () => {
      req.query = { domain: 'test.domain' }
      mockGetDomainInfo.mockResolvedValue([])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateAccountSubscriptions).toHaveBeenCalledWith([])
    })

    it('should handle missing domain and address parameters', async () => {
      req.query = {}
      mockGetDomainInfo.mockResolvedValue([])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetDomainInfo).not.toHaveBeenCalled()
      expect(mockGetBlockchainSubscriptionsForAccount).not.toHaveBeenCalled()
      expect(sendMock).toHaveBeenCalledWith({ success: true })
    })

    it('should handle blockchain fetch errors gracefully', async () => {
      req.query = { domain: 'test.domain' }
      mockGetDomainInfo.mockRejectedValue(new Error('Blockchain error'))
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow(
        'Blockchain error'
      )
    })

    it('should handle database update errors', async () => {
      req.query = { domain: 'test.domain' }
      mockGetDomainInfo.mockResolvedValue([mockBlockchainSub])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])
      mockConvertBlockchainSubscriptionToSubscription.mockReturnValue(mockDbSub)
      mockUpdateAccountSubscriptions.mockRejectedValue(new Error('DB error'))

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow(
        'DB error'
      )
    })

    it('should handle multiple subscriptions from same domain', async () => {
      req.query = { domain: 'test.domain' }
      const sub1 = { ...mockBlockchainSub, plan_id: 'plan-1' }
      const sub2 = { ...mockBlockchainSub, plan_id: 'plan-2' }
      
      mockGetDomainInfo.mockResolvedValue([sub1, sub2])
      mockGetBlockchainSubscriptionsForAccount.mockResolvedValue([])
      mockConvertBlockchainSubscriptionToSubscription
        .mockReturnValueOnce({ ...mockDbSub, plan_id: 'plan-1' })
        .mockReturnValueOnce({ ...mockDbSub, plan_id: 'plan-2' })
      mockUpdateAccountSubscriptions.mockResolvedValue({ success: true })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateAccountSubscriptions).toHaveBeenCalledWith([
        { ...mockDbSub, plan_id: 'plan-1' },
        { ...mockDbSub, plan_id: 'plan-2' },
      ])
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
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
