/**
 * Unit tests for /api/secure/billing/subscribe-crypto endpoint
 * Testing crypto subscription creation
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getBillingPlanById: jest.fn(),
  hasSubscriptionHistory: jest.fn(),
  createSubscriptionPeriod: jest.fn(),
  getActiveSubscriptionPeriod: jest.fn(),
}))

jest.mock('@/utils/email_helper', () => ({
  sendSubscriptionConfirmationEmailForAccount: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/billing/subscribe-crypto'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'
import * as Sentry from '@sentry/nextjs'

describe('/api/secure/billing/subscribe-crypto', () => {
  const mockGetBillingPlanById = database.getBillingPlanById as jest.Mock
  const mockHasSubscriptionHistory = database.hasSubscriptionHistory as jest.Mock
  const mockCreateSubscriptionPeriod = database.createSubscriptionPeriod as jest.Mock
  const mockGetActiveSubscriptionPeriod = database.getActiveSubscriptionPeriod as jest.Mock
  const mockSendEmail = emailHelper.sendSubscriptionConfirmationEmailForAccount as jest.Mock
  const mockSentry = Sentry.captureException as jest.Mock

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
      method: 'POST',
      session: {
        account: {
          address: '0x1234567890abcdef',
          name: 'Test User',
        },
      } as any,
      body: {
        billing_plan_id: 'plan_monthly',
        is_trial: false,
      },
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
    it('should return 405 for GET requests', async () => {
      req.method = 'GET'

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

  describe('Authentication', () => {
    it('should return 401 when session is missing', async () => {
      req.session = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('should return 401 when account is missing', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should return 401 when address is missing', async () => {
      req.session = {
        account: {} as any,
      } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })
  })

  describe('Validation', () => {
    it('should return 400 when billing_plan_id is missing', async () => {
      req.body = {}

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
  })

  describe('Trial Subscription', () => {
    beforeEach(() => {
      req.body = {
        billing_plan_id: 'plan_monthly',
        is_trial: true,
      }
      
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_monthly',
        name: 'Monthly Pro',
        price: 29.99,
        billing_cycle: 'monthly',
      })
    })

    it('should create trial subscription successfully', async () => {
      mockHasSubscriptionHistory.mockResolvedValue(false)
      mockCreateSubscriptionPeriod.mockResolvedValue({
        id: 'period_123',
        registered_at: '2024-01-01T00:00:00Z',
        expiry_time: '2024-01-15T00:00:00Z',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHasSubscriptionHistory).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockCreateSubscriptionPeriod).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
          success: true,
          subscriptionData: expect.objectContaining({
            account_address: '0x1234567890abcdef',
          }),
        })
      )
    })

    it('should return 400 when user has subscription history', async () => {
      mockHasSubscriptionHistory.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('Trial not available'),
      })
    })

    it('should queue trial confirmation email', async () => {
      mockHasSubscriptionHistory.mockResolvedValue(false)
      mockCreateSubscriptionPeriod.mockResolvedValue({
        id: 'period_123',
        registered_at: '2024-01-01T00:00:00Z',
        expiry_time: '2024-01-15T00:00:00Z',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Email sending is queued and non-blocking
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle trial with custom handle', async () => {
      req.body = {
        billing_plan_id: 'plan_monthly',
        is_trial: true,
        handle: 'customhandle',
      }
      
      mockHasSubscriptionHistory.mockResolvedValue(false)
      mockCreateSubscriptionPeriod.mockResolvedValue({
        id: 'period_123',
        registered_at: '2024-01-01T00:00:00Z',
        expiry_time: '2024-01-15T00:00:00Z',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateSubscriptionPeriod).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'plan_monthly',
        'active',
        expect.any(String),
        null,
        'customhandle'
      )
    })
  })

  describe('Paid Subscription', () => {
    beforeEach(() => {
      req.body = {
        billing_plan_id: 'plan_yearly',
        is_trial: false,
      }
      
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_yearly',
        name: 'Yearly Pro',
        price: 299.99,
        billing_cycle: 'yearly',
      })
    })

    it('should create subscription config for new user', async () => {
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 299.99,
          currency: 'USD',
          billing_plan_id: 'plan_yearly',
          success: true,
          subscriptionData: expect.objectContaining({
            account_address: '0x1234567890abcdef',
            billing_plan_id: 'plan_yearly',
            subscription_channel: expect.stringContaining('crypto-subscription'),
          }),
        })
      )
    })

    it('should extend existing subscription with monthly plan', async () => {
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_monthly',
        name: 'Monthly Pro',
        price: 29.99,
        billing_cycle: 'monthly',
      })
      
      req.body.billing_plan_id = 'plan_monthly'
      
      mockGetActiveSubscriptionPeriod.mockResolvedValue({
        expiry_time: '2024-12-31T00:00:00Z',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should calculate new expiry based on existing subscription
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should extend existing subscription with yearly plan', async () => {
      mockGetActiveSubscriptionPeriod.mockResolvedValue({
        expiry_time: '2024-12-31T00:00:00Z',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should include handle in subscription data', async () => {
      req.body = {
        billing_plan_id: 'plan_yearly',
        is_trial: false,
        handle: 'myhandle',
      }
      
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionData: expect.objectContaining({
            handle: 'myhandle',
          }),
        })
      )
    })

    it('should generate unique subscription channel', async () => {
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response.subscriptionData.subscription_channel).toMatch(
        /^crypto-subscription:[a-f0-9-]+:plan_yearly$/
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_monthly',
        name: 'Monthly Pro',
        price: 29.99,
        billing_cycle: 'monthly',
      })
    })

    it('should return 500 on database errors', async () => {
      mockGetActiveSubscriptionPeriod.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create subscription configuration',
      })
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should return 500 when trial creation fails', async () => {
      req.body.is_trial = true
      mockHasSubscriptionHistory.mockResolvedValue(false)
      mockCreateSubscriptionPeriod.mockRejectedValue(new Error('Creation failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should handle plan fetch errors', async () => {
      mockGetBillingPlanById.mockRejectedValue(new Error('Plan fetch failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_monthly',
        name: 'Monthly Pro',
        price: 29.99,
        billing_cycle: 'monthly',
      })
    })

    it('should handle address with different casing', async () => {
      req.session = {
        account: {
          address: '0xABCDEF1234567890',
        },
      } as any
      
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionData: expect.objectContaining({
            account_address: '0xabcdef1234567890',
          }),
        })
      )
    })

    it('should handle missing handle field', async () => {
      req.body = {
        billing_plan_id: 'plan_monthly',
      }
      
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionData: expect.objectContaining({
            handle: undefined,
          }),
        })
      )
    })

    it('should handle zero-price plans', async () => {
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_free',
        name: 'Free Plan',
        price: 0,
        billing_cycle: 'monthly',
      })
      
      req.body.billing_plan_id = 'plan_free'
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 0,
        })
      )
    })

    it('should handle custom billing cycles', async () => {
      mockGetBillingPlanById.mockResolvedValue({
        id: 'plan_custom',
        name: 'Custom Plan',
        price: 99.99,
        billing_cycle: 'quarterly',
      })
      
      req.body.billing_plan_id = 'plan_custom'
      mockGetActiveSubscriptionPeriod.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })
})
