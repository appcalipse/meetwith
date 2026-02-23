/**
 * Unit tests for /api/secure/stripe/connect endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'

jest.mock('@/utils/database', () => ({
  getOrCreatePaymentAccount: jest.fn(),
  updatePaymentAccount: jest.fn(),
}))

const mockStripeAccounts = {
  create: jest.fn(),
}
const mockStripeAccountLinks = {
  create: jest.fn(),
}

jest.mock('@/utils/services/stripe.service', () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    accounts: mockStripeAccounts,
    accountLinks: mockStripeAccountLinks,
  })),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/stripe/connect'
import * as database from '@/utils/database'
import { PaymentProvider, PaymentAccountStatus } from '@/types/PaymentAccount'

describe('/api/secure/stripe/connect', () => {
  const mockGetOrCreatePaymentAccount = database.getOrCreatePaymentAccount as jest.Mock
  const mockUpdatePaymentAccount = database.updatePaymentAccount as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockPaymentAccount = {
    id: 'payment-1',
    account_address: '0x1234567890abcdef',
    provider: PaymentProvider.STRIPE,
    provider_account_id: null,
    status: PaymentAccountStatus.PENDING,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: {
        country_code: 'US',
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

  describe('GET /api/secure/stripe/connect', () => {
    it('should create Stripe account and return onboarding link', async () => {
      const mockStripeAccount = { id: 'acct_123' }
      const mockAccountLink = { url: 'https://connect.stripe.com/onboarding/123' }

      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockUpdatePaymentAccount.mockResolvedValue(undefined)

      mockStripeAccounts.create.mockResolvedValue(mockStripeAccount)
      mockStripeAccountLinks.create.mockResolvedValue(mockAccountLink)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetOrCreatePaymentAccount).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        PaymentProvider.STRIPE
      )
      expect(mockStripeAccounts.create).toHaveBeenCalledWith({
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        country: 'US',
        type: 'express',
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        url: 'https://connect.stripe.com/onboarding/123',
      })
    })

    it('should reuse existing Stripe account', async () => {
      const existingAccount = {
        ...mockPaymentAccount,
        provider_account_id: 'acct_existing',
        status: PaymentAccountStatus.CONNECTED,
      }
      const mockAccountLink = { url: 'https://connect.stripe.com/onboarding/456' }

      mockGetOrCreatePaymentAccount.mockResolvedValue(existingAccount)

      mockStripeAccountLinks.create.mockResolvedValue(mockAccountLink)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeAccounts.create).not.toHaveBeenCalled()
      expect(mockStripeAccountLinks.create).toHaveBeenCalledWith({
        account: 'acct_existing',
        refresh_url: expect.stringContaining('/secure/stripe/refresh'),
        return_url: expect.stringContaining('/secure/stripe/callback'),
        type: 'account_onboarding',
      })
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should update pending status for non-connected accounts', async () => {
      const pendingAccount = {
        ...mockPaymentAccount,
        status: PaymentAccountStatus.PENDING,
        provider_account_id: 'acct_123',
      }
      const mockAccountLink = { url: 'https://connect.stripe.com/onboarding/789' }

      mockGetOrCreatePaymentAccount.mockResolvedValue(pendingAccount)

      mockStripeAccountLinks.create.mockResolvedValue(mockAccountLink)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdatePaymentAccount).toHaveBeenCalledWith(
        'payment-1',
        '0x1234567890abcdef',
        { status: PaymentAccountStatus.PENDING }
      )
    })

    it('should handle missing country code', async () => {
      req.query = {}

      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)

      mockStripeAccounts.create.mockResolvedValue({ id: 'acct_123' })
      mockStripeAccountLinks.create.mockResolvedValue({ url: 'https://stripe.com' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeAccounts.create).toHaveBeenCalledWith(
        expect.objectContaining({
          country: undefined,
        })
      )
    })

    it('should handle Stripe account creation errors', async () => {
      mockGetOrCreatePaymentAccount.mockResolvedValue(mockPaymentAccount)

      mockStripeAccounts.create.mockRejectedValue(new Error('Stripe error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('An unexpected error occurred.')
    })

    it('should handle database errors', async () => {
      mockGetOrCreatePaymentAccount.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle account link creation errors', async () => {
      mockGetOrCreatePaymentAccount.mockResolvedValue({
        ...mockPaymentAccount,
        provider_account_id: 'acct_123',
      })

      mockStripeAccountLinks.create.mockRejectedValue(new Error('Link error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should use correct URLs for redirect', async () => {
      mockGetOrCreatePaymentAccount.mockResolvedValue({
        ...mockPaymentAccount,
        provider_account_id: 'acct_123',
      })

      mockStripeAccountLinks.create.mockResolvedValue({ url: 'https://stripe.com' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      const createCall = mockStripeAccountLinks.create.mock.calls[0][0]
      expect(createCall.refresh_url).toContain('/secure/stripe/refresh')
      expect(createCall.return_url).toContain('/secure/stripe/callback')
      expect(createCall.type).toBe('account_onboarding')
    })
  })

  describe('Non-GET methods', () => {
    it('should return 404 for POST', async () => {
      req.method = 'POST'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE', async () => {
      req.method = 'DELETE'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PATCH', async () => {
      req.method = 'PATCH'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PUT', async () => {
      req.method = 'PUT'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
