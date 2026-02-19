/**
 * Unit tests for /api/secure/stripe/callback endpoint
 * Testing Stripe onboarding callback and account status updates
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getOrCreatePaymentAccount: jest.fn(),
  updatePaymentAccount: jest.fn(),
}))

jest.mock('@/utils/services/stripe.service', () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    accounts: {
      retrieve: jest.fn(),
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
import handler from '@/pages/api/secure/stripe/callback'
import * as database from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'
import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import * as Sentry from '@sentry/nextjs'

describe('/api/secure/stripe/callback', () => {
  const mockGetOrCreatePaymentAccount = database.getOrCreatePaymentAccount as jest.Mock
  const mockUpdatePaymentAccount = database.updatePaymentAccount as jest.Mock
  const mockSentry = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let redirectMock: jest.Mock
  let sendMock: jest.Mock
  let mockStripeRetrieve: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    sendMock = jest.fn()
    redirectMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))
    
    mockStripeRetrieve = jest.fn()
    ;(StripeService as jest.Mock).mockImplementation(() => ({
      accounts: {
        retrieve: mockStripeRetrieve,
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
      redirect: redirectMock,
    }
  })

  describe('Method Validation', () => {
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

  describe('Successful Callback Handling', () => {
    it('should redirect to success when account is fully submitted', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      const mockStripeAccount = {
        id: 'acct_123',
        details_submitted: true,
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(mockStripeAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetOrCreatePaymentAccount).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        PaymentProvider.STRIPE
      )
      expect(mockStripeRetrieve).toHaveBeenCalledWith('acct_123')
      expect(mockUpdatePaymentAccount).toHaveBeenCalledWith(
        'pay_123',
        '0x1234567890abcdef',
        { status: PaymentAccountStatus.CONNECTED }
      )
      expect(redirectMock).toHaveBeenCalledWith(
        '/dashboard/settings/connected-accounts?stripeResult=success'
      )
    })

    it('should redirect to pending when account is not fully submitted', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      const mockStripeAccount = {
        id: 'acct_123',
        details_submitted: false,
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(mockStripeAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdatePaymentAccount).toHaveBeenCalledWith(
        'pay_123',
        '0x1234567890abcdef',
        { status: PaymentAccountStatus.PENDING }
      )
      expect(redirectMock).toHaveBeenCalledWith(
        '/dashboard/settings/connected-accounts?stripeResult=pending'
      )
    })

    it('should return 500 when stripe account is null', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Error Handling', () => {
    it('should redirect to error when provider_account_id is missing', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: null,
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        '/dashboard/settings/connected-accounts?stripeResult=error'
      )
      expect(mockStripeRetrieve).not.toHaveBeenCalled()
    })

    it('should redirect to error when provider_account_id is empty string', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: '',
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        '/dashboard/settings/connected-accounts?stripeResult=error'
      )
    })

    it('should return 500 when payment account creation fails', async () => {
      mockGetOrCreatePaymentAccount.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('An unexpected error occurred.')
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should return 500 when Stripe retrieve fails', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockRejectedValue(new Error('Stripe API error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should return 500 when update fails', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      const mockStripeAccount = {
        id: 'acct_123',
        details_submitted: true,
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(mockStripeAccount)
      mockUpdatePaymentAccount.mockRejectedValue(new Error('Update failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing session account', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should fail when trying to access account.address
      expect(mockSentry).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle account with undefined address', async () => {
      req.session = {
        account: {} as any,
      } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSentry).toHaveBeenCalled()
    })

    it('should handle stripe account with partial details', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      const mockStripeAccount = {
        id: 'acct_123',
        details_submitted: false,
        charges_enabled: false,
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(mockStripeAccount)
      mockUpdatePaymentAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('pending')
      )
    })

    it('should handle different account address casing', async () => {
      req.session = {
        account: {
          address: '0xABCDEF1234567890',
        },
      } as any
      
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      const mockStripeAccount = {
        id: 'acct_123',
        details_submitted: true,
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(mockStripeAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetOrCreatePaymentAccount).toHaveBeenCalledWith(
        '0xABCDEF1234567890',
        PaymentProvider.STRIPE
      )
    })

    it('should handle Stripe account with extra fields', async () => {
      const mockPaymentAccount = {
        id: 'pay_123',
        provider_account_id: 'acct_123',
      }
      
      const mockStripeAccount = {
        id: 'acct_123',
        details_submitted: true,
        business_profile: {},
        capabilities: {},
        settings: {},
      }
      
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockStripeRetrieve.mockResolvedValue(mockStripeAccount)
      mockUpdatePaymentAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(redirectMock).toHaveBeenCalledWith(
        expect.stringContaining('success')
      )
    })
  })
})
