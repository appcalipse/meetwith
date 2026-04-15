/**
 * Unit tests for /api/secure/billing/manage endpoint
 * Testing Stripe billing portal session creation
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getStripeSubscriptionByAccount: jest.fn(),
}))

jest.mock('@/utils/services/stripe.service', () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
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
import handler from '@/pages/api/secure/billing/manage'
import * as database from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'
import * as Sentry from '@sentry/nextjs'

describe('/api/secure/billing/manage', () => {
  const mockGetStripeSubscriptionByAccount = database.getStripeSubscriptionByAccount as jest.Mock
  const mockSentry = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock
  let mockStripeCreate: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))
    
    mockStripeCreate = jest.fn()
    ;(StripeService as unknown as jest.Mock).mockImplementation(() => ({
      billingPortal: {
        sessions: {
          create: mockStripeCreate,
        },
      },
    }))
    
    req = {
      method: 'GET',
      session: {
        account: {
          address: '0x1234567890abcdef',
          name: 'Test User',
        },
      } as any,
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
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

  describe('Authentication', () => {
    it('should return 401 when session is missing', async () => {
      req.session = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('should return 401 when account is missing from session', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('should return 401 when address is missing from account', async () => {
      req.session = {
        account: {} as any,
      } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })
  })

  describe('Successful Portal Creation', () => {
    it('should create billing portal session for valid user', async () => {
      const mockSubscription = {
        id: 'sub_123',
        stripe_customer_id: 'cus_123',
        account_address: '0x1234567890abcdef',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)
      mockStripeCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test_123',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetStripeSubscriptionByAccount).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockStripeCreate).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: expect.stringContaining('/dashboard/settings/subscriptions'),
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        url: 'https://billing.stripe.com/session/test_123',
      })
    })

    it('should convert address to lowercase', async () => {
      req.session = {
        account: {
          address: '0xABCDEF1234567890',
        },
      } as any
      
      const mockSubscription = {
        stripe_customer_id: 'cus_123',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)
      mockStripeCreate.mockResolvedValue({
        url: 'https://billing.stripe.com/session/test',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetStripeSubscriptionByAccount).toHaveBeenCalledWith('0xabcdef1234567890')
    })
  })

  describe('Validation Errors', () => {
    it('should return 404 when no subscription found', async () => {
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'No active Stripe subscription found for this account',
      })
    })

    it('should return 400 when stripe_customer_id is missing', async () => {
      const mockSubscription = {
        id: 'sub_123',
        stripe_customer_id: null,
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Stripe customer ID not found for this subscription',
      })
    })

    it('should return 400 when stripe_customer_id is empty string', async () => {
      const mockSubscription = {
        id: 'sub_123',
        stripe_customer_id: '',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('Stripe Error Handling', () => {
    it('should handle Stripe API errors', async () => {
      const mockSubscription = {
        stripe_customer_id: 'cus_123',
      }
      
      const stripeError = {
        type: 'StripeInvalidRequestError',
        message: 'Invalid customer ID',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)
      mockStripeCreate.mockRejectedValue(stripeError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid customer ID',
        type: 'StripeInvalidRequestError',
      })
      expect(mockSentry).toHaveBeenCalledWith(stripeError)
    })

    it('should handle Stripe errors without message', async () => {
      const mockSubscription = {
        stripe_customer_id: 'cus_123',
      }
      
      const stripeError = {
        type: 'StripeConnectionError',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)
      mockStripeCreate.mockRejectedValue(stripeError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining("couldn't reach Stripe"),
        type: 'StripeConnectionError',
      })
    })
  })

  describe('Server Error Handling', () => {
    it('should return 500 for database errors', async () => {
      mockGetStripeSubscriptionByAccount.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create customer portal session',
      })
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should return 500 for unexpected errors', async () => {
      const mockSubscription = {
        stripe_customer_id: 'cus_123',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)
      mockStripeCreate.mockRejectedValue(new Error('Unexpected error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create customer portal session',
      })
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should handle null errors gracefully', async () => {
      const mockSubscription = {
        stripe_customer_id: 'cus_123',
      }
      
      mockGetStripeSubscriptionByAccount.mockResolvedValue(mockSubscription)
      mockStripeCreate.mockRejectedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })
})
