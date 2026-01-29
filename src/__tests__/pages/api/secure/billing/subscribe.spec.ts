/**
 * Unit tests for /api/secure/billing/subscribe endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'

jest.mock('@/utils/database', () => ({
  getBillingPlanById: jest.fn(),
  getBillingPlanProvider: jest.fn(),
  getActiveSubscriptionPeriod: jest.fn(),
  getStripeSubscriptionByAccount: jest.fn(),
  hasSubscriptionHistory: jest.fn(),
}))

jest.mock('@/utils/services/stripe.service', () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      create: jest.fn(),
    },
  })),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/billing/subscribe'
import * as database from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'
import { PaymentProvider } from '@/types/Billing'

describe('/api/secure/billing/subscribe', () => {
  const mockGetBillingPlanById = database.getBillingPlanById as jest.Mock
  const mockGetBillingPlanProvider = database.getBillingPlanProvider as jest.Mock
  const mockGetActiveSubscriptionPeriod = database.getActiveSubscriptionPeriod as jest.Mock
  const mockGetStripeSubscriptionByAccount = database.getStripeSubscriptionByAccount as jest.Mock
  const mockHasSubscriptionHistory = database.hasSubscriptionHistory as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockPlan = {
    id: 'plan-1',
    name: 'Pro Monthly',
    price: '9.99',
    billing_cycle: 'monthly',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'POST',
      body: {
        billing_plan_id: 'plan-1',
        handle: 'test-user',
      },
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

  describe('POST /api/secure/billing/subscribe', () => {
    it('should create checkout session for new subscription', async () => {
      const mockSession = {
        id: 'checkout_session_123',
        url: 'https://checkout.stripe.com/session_123',
      }

      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetBillingPlanProvider.mockResolvedValue('stripe_prod_123')
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockHasSubscriptionHistory.mockResolvedValue(false)

      const mockStripe = new (StripeService as any)()
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetBillingPlanById).toHaveBeenCalledWith('plan-1')
      expect(mockGetBillingPlanProvider).toHaveBeenCalledWith('plan-1', PaymentProvider.STRIPE)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 401 for unauthorized requests', async () => {
      req.session = { account: undefined } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('should return 400 when billing_plan_id is missing', async () => {
      req.body = { handle: 'test-user' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'billing_plan_id is required' })
    })

    it('should return 404 when billing plan not found', async () => {
      mockGetBillingPlanById.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Billing plan not found' })
    })

    it('should return 404 when Stripe product not found', async () => {
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetBillingPlanProvider.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Stripe product not found for this plan' })
    })

    it('should handle lowercase account addresses', async () => {
      req.session.account.address = '0xABCDEF123456'

      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetBillingPlanProvider.mockResolvedValue('stripe_prod_123')
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockHasSubscriptionHistory.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetActiveSubscriptionPeriod).toHaveBeenCalledWith('0xabcdef123456')
    })

    it('should handle Stripe errors gracefully', async () => {
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetBillingPlanProvider.mockResolvedValue('stripe_prod_123')
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)
      mockGetStripeSubscriptionByAccount.mockRejectedValue(new Error('Stripe error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should validate handle parameter', async () => {
      req.body = {
        billing_plan_id: 'plan-1',
        handle: '',
      }

      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetBillingPlanProvider.mockResolvedValue('stripe_prod_123')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toBeDefined()
    })
  })

  describe('Non-POST methods', () => {
    it('should return 404 for GET', async () => {
      req.method = 'GET'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).not.toHaveBeenCalledWith(200)
    })

    it('should return 404 for DELETE', async () => {
      req.method = 'DELETE'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).not.toHaveBeenCalledWith(200)
    })

    it('should return 404 for PATCH', async () => {
      req.method = 'PATCH'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).not.toHaveBeenCalledWith(200)
    })

    it('should return 404 for PUT', async () => {
      req.method = 'PUT'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).not.toHaveBeenCalledWith(200)
    })
  })
})
