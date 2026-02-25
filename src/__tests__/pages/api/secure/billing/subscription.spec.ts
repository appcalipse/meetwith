/**
 * Unit tests for /api/secure/billing/subscription endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getActiveSubscriptionPeriod: jest.fn(),
  getBillingPlanById: jest.fn(),
  getStripeSubscriptionByAccount: jest.fn(),
  getTransactionsById: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/billing/subscription'
import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'
import { PaymentProvider, SubscriptionStatus } from '@/types/Billing'
import { PaymentType } from '@/utils/constants/meeting-types'

describe('/api/secure/billing/subscription', () => {
  const mockGetActiveSubscriptionPeriod = database.getActiveSubscriptionPeriod as jest.Mock
  const mockGetBillingPlanById = database.getBillingPlanById as jest.Mock
  const mockGetStripeSubscriptionByAccount = database.getStripeSubscriptionByAccount as jest.Mock
  const mockGetTransactionsById = database.getTransactionsById as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockPeriod = {
    id: 'period-1',
    billing_plan_id: 'plan-1',
    owner_account: '0x1234567890abcdef',
    status: 'active',
    expiry_time: new Date('2030-01-01').toISOString(),
    transaction_id: 'tx-1',
    registered_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

  const mockPlan = {
    id: 'plan-1',
    name: 'Pro Plan',
    price: '9.99',
    billing_cycle: 'monthly',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  }

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

  describe('GET /api/secure/billing/subscription', () => {
    it('should return active subscription with Stripe details', async () => {
      const mockStripeSub = {
        id: 'stripe-1',
        account_address: '0x1234567890abcdef',
        billing_plan_id: 'plan-1',
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(mockPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockStripeSub)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetActiveSubscriptionPeriod).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockGetBillingPlanById).toHaveBeenCalledWith('plan-1')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        is_active: true,
        billing_plan: expect.objectContaining({
          id: 'plan-1',
          price: 9.99,
        }),
        payment_provider: PaymentProvider.STRIPE,
        stripe_subscription: expect.objectContaining({
          stripe_subscription_id: 'sub_123',
        }),
      }))
    })

    it('should return null for no active subscription', async () => {
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        billing_plan: null,
        expires_at: null,
        is_active: false,
        payment_provider: null,
        stripe_subscription: null,
        subscription: null,
      })
    })

    it('should return 401 for unauthorized requests', async () => {
      req.session = { account: undefined } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('should mark expired subscriptions as inactive', async () => {
      const expiredPeriod = {
        ...mockPeriod,
        expiry_time: new Date('2020-01-01').toISOString(),
      }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(expiredPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.is_active).toBe(false)
    })

    it('should handle crypto payment provider', async () => {
      const mockTransaction = {
        id: 'tx-1',
        method: PaymentType.CRYPTO,
      }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(mockPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetTransactionsById.mockResolvedValue(mockTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.payment_provider).toBe(PaymentProvider.CRYPTO)
    })

    it('should handle fiat payment provider', async () => {
      const mockTransaction = {
        id: 'tx-1',
        method: PaymentType.FIAT,
      }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(mockPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetTransactionsById.mockResolvedValue(mockTransaction)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.payment_provider).toBe(PaymentProvider.STRIPE)
    })

    it('should default to crypto if no transaction', async () => {
      const periodWithoutTx = { ...mockPeriod, transaction_id: null }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(periodWithoutTx)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.payment_provider).toBe(PaymentProvider.CRYPTO)
    })

    it('should handle Stripe subscription for different plan gracefully', async () => {
      const wrongPlanStripeSub = {
        id: 'stripe-1',
        account_address: '0x1234567890abcdef',
        billing_plan_id: 'different-plan',
        stripe_subscription_id: 'sub_123',
        stripe_customer_id: 'cus_123',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(mockPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(wrongPlanStripeSub)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.stripe_subscription).toBe(null)
    })

    it('should map subscription status correctly', async () => {
      const cancelledPeriod = { ...mockPeriod, status: 'cancelled' }

      mockGetActiveSubscriptionPeriod.mockResolvedValue(cancelledPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.subscription.status).toBe(SubscriptionStatus.CANCELLED)
    })

    it('should handle errors gracefully', async () => {
      const dbError = new Error('Database error')
      mockGetActiveSubscriptionPeriod.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to fetch subscription' })
    })

    it('should handle case-insensitive account address', async () => {
      req.session!.account!.address = '0xABCDEF123456'

      mockGetActiveSubscriptionPeriod.mockResolvedValue(mockPeriod)
      mockGetBillingPlanById.mockResolvedValue(mockPlan)
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetActiveSubscriptionPeriod).toHaveBeenCalledWith('0xabcdef123456')
      expect(mockGetStripeSubscriptionByAccount).toHaveBeenCalledWith('0xabcdef123456')
    })
  })

  describe('Non-GET methods', () => {
    it('should return 405 for POST', async () => {
      req.method = 'POST'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for PUT', async () => {
      req.method = 'PUT'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE', async () => {
      req.method = 'DELETE'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for PATCH', async () => {
      req.method = 'PATCH'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
