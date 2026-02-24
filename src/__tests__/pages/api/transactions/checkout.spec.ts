/**
 * Unit tests for /api/transactions/checkout endpoint
 * Testing payment checkout flow with Stripe
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  createCheckOutTransaction: jest.fn(),
  getAccountAvatarUrl: jest.fn(),
  getActivePaymentAccount: jest.fn(),
  getMeetingTypeFromDBLean: jest.fn(),
}))

jest.mock('@/utils/services/stripe.service', () => ({
  StripeService: jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  })),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/transactions/checkout'
import { PaymentAccountStatus } from '@/types/PaymentAccount'
import * as database from '@/utils/database'
import { StripeService } from '@/utils/services/stripe.service'

describe('/api/transactions/checkout', () => {
  const mockGetMeetingTypeFromDBLean = database.getMeetingTypeFromDBLean as jest.Mock
  const mockGetActivePaymentAccount = database.getActivePaymentAccount as jest.Mock
  const mockCreateCheckOutTransaction = database.createCheckOutTransaction as jest.Mock
  const mockGetAccountAvatarUrl = database.getAccountAvatarUrl as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock
  let mockStripeCreate: jest.Mock

  const mockCheckoutRequest = {
    meeting_type_id: 'meeting-type-123',
    guest_address: '0x456',
    guest_email: 'guest@example.com',
    guest_name: 'Guest User',
    redirectUrl: 'https://example.com/callback',
    amount: 100,
  }

  const mockMeetingType = {
    id: 'meeting-type-123',
    title: 'Consultation',
    description: 'One-on-one consultation',
    account_owner_address: '0x123',
    plan: {
      price_per_slot: 100,
      no_of_slot: 1,
    },
  }

  const mockPaymentAccount = {
    provider_account_id: 'stripe_account_123',
    status: PaymentAccountStatus.CONNECTED,
  }

  const mockTransaction = {
    id: 'tx-123',
    amount: 100,
    status: 'pending',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: { ...mockCheckoutRequest },
    }

    res = {
      status: statusMock,
    }

    mockStripeCreate = jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/session123' })
    ;(StripeService as unknown as jest.Mock).mockImplementation(() => ({
      checkout: {
        sessions: {
          create: mockStripeCreate,
        },
      },
    }))
  })

  describe('POST /api/transactions/checkout', () => {
    it('should create checkout session successfully', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue('https://example.com/avatar.png')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingTypeFromDBLean).toHaveBeenCalledWith('meeting-type-123')
      expect(mockGetActivePaymentAccount).toHaveBeenCalledWith('0x123')
      expect(mockCreateCheckOutTransaction).toHaveBeenCalledWith(mockCheckoutRequest)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ url: 'https://checkout.stripe.com/session123' })
    })

    it('should return 404 when meeting type not found', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Meeting type not found' })
      expect(mockGetActivePaymentAccount).not.toHaveBeenCalled()
    })

    it('should return 400 when payment account not connected', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue({
        provider_account_id: null,
        status: PaymentAccountStatus.PENDING,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Payment account is not properly connected',
      })
    })

    it('should return 400 when payment account has no provider_account_id', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue({
        provider_account_id: '',
        status: PaymentAccountStatus.CONNECTED,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Payment account is not properly connected',
      })
    })

    it('should return 500 when transaction creation fails', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Could not create transaction' })
    })

    it('should create stripe session with correct metadata', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue('https://example.com/avatar.png')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            environment: 'test',
            guest_address: '0x456',
            guest_email: 'guest@example.com',
            guest_name: 'Guest User',
            meeting_type_id: 'meeting-type-123',
            transaction_id: 'tx-123',
          }),
        }),
        { stripeAccount: 'stripe_account_123' }
      )
    })

    it('should calculate platform fee correctly', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_intent_data: expect.objectContaining({
            application_fee_amount: 50, // 0.5% of 10000 cents
          }),
        }),
        expect.any(Object)
      )
    })

    it('should handle missing avatar gracefully', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                product_data: expect.objectContaining({
                  images: [],
                }),
              }),
            }),
          ],
        }),
        expect.any(Object)
      )
    })

    it('should handle stripe errors', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue(null)
      mockStripeCreate.mockRejectedValue(new Error('Stripe error'))
      console.error = jest.fn()

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error sending transaction invoice' })
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle multiple slots correctly', async () => {
      const multiSlotMeeting = {
        ...mockMeetingType,
        plan: { price_per_slot: 50, no_of_slot: 5 },
      }
      mockGetMeetingTypeFromDBLean.mockResolvedValue(multiSlotMeeting)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          line_items: [
            expect.objectContaining({
              price_data: expect.objectContaining({
                unit_amount: 5000,
              }),
              quantity: 5,
            }),
          ],
        }),
        expect.any(Object)
      )
    })

    it('should include success and cancel URLs with transaction ID', async () => {
      mockGetMeetingTypeFromDBLean.mockResolvedValue(mockMeetingType)
      mockGetActivePaymentAccount.mockResolvedValue(mockPaymentAccount)
      mockCreateCheckOutTransaction.mockResolvedValue(mockTransaction)
      mockGetAccountAvatarUrl.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockStripeCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          success_url: expect.stringContaining('transaction_id=tx-123&checkoutState=success'),
          cancel_url: expect.stringContaining('checkoutState=cancelled'),
        }),
        expect.any(Object)
      )
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

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
  })
})
