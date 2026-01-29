/**
 * Unit tests for /api/secure/billing/plans endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getBillingPlans: jest.fn(),
  getBillingPlanProviders: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/billing/plans'
import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'
import { PaymentProvider, BillingCycle } from '@/types/Billing'

describe('/api/secure/billing/plans', () => {
  const mockGetBillingPlans = database.getBillingPlans as jest.Mock
  const mockGetBillingPlanProviders = database.getBillingPlanProviders as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockPlans = [
    {
      id: 'plan-1',
      name: 'Monthly Pro',
      price: '9.99',
      billing_cycle: 'monthly',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 'plan-2',
      name: 'Yearly Pro',
      price: '99.99',
      billing_cycle: 'yearly',
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
  ]

  const mockProviders = [
    { billing_plan_id: 'plan-1', provider_product_id: 'stripe_prod_1' },
    { billing_plan_id: 'plan-2', provider_product_id: 'stripe_prod_2' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'GET',
      session: {
        account: {
          address: '0x1234567890abcdef',
        },
      } as any,
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/secure/billing/plans', () => {
    it('should return all billing plans with provider info', async () => {
      mockGetBillingPlans.mockResolvedValue(mockPlans)
      mockGetBillingPlanProviders.mockResolvedValue(mockProviders)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetBillingPlans).toHaveBeenCalled()
      expect(mockGetBillingPlanProviders).toHaveBeenCalledWith(PaymentProvider.STRIPE)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        plans: [
          {
            id: 'plan-1',
            name: 'Monthly Pro',
            price: 9.99,
            billing_cycle: 'monthly',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            provider_product_id: 'stripe_prod_1',
          },
          {
            id: 'plan-2',
            name: 'Yearly Pro',
            price: 99.99,
            billing_cycle: 'yearly',
            created_at: '2024-01-01',
            updated_at: '2024-01-01',
            provider_product_id: 'stripe_prod_2',
          },
        ],
      })
    })

    it('should handle plans without provider mapping', async () => {
      mockGetBillingPlans.mockResolvedValue(mockPlans)
      mockGetBillingPlanProviders.mockResolvedValue([mockProviders[0]])

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.plans[0].provider_product_id).toBe('stripe_prod_1')
      expect(response.plans[1].provider_product_id).toBeUndefined()
    })

    it('should handle empty plans list', async () => {
      mockGetBillingPlans.mockResolvedValue([])
      mockGetBillingPlanProviders.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ plans: [] })
    })

    it('should return 401 for unauthorized requests', async () => {
      req.session = { account: undefined } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockGetBillingPlans.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch billing plans' })
    })

    it('should handle provider fetch errors', async () => {
      mockGetBillingPlans.mockResolvedValue(mockPlans)
      mockGetBillingPlanProviders.mockRejectedValue(new Error('Provider error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should convert price string to number', async () => {
      mockGetBillingPlans.mockResolvedValue([
        { ...mockPlans[0], price: '123.45' },
      ])
      mockGetBillingPlanProviders.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.plans[0].price).toBe(123.45)
      expect(typeof response.plans[0].price).toBe('number')
    })
  })

  describe('Non-GET methods', () => {
    it('should return 405 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
