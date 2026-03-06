/**
 * Unit tests for /api/server/webhook/billing-reminders endpoint
 * Testing billing reminder webhook functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getBillingPeriodsByExpiryWindow: jest.fn(),
  getStripeSubscriptionByAccount: jest.fn(),
  getBillingEmailAccountInfo: jest.fn(),
  getBillingPlanById: jest.fn(),
  updateSubscriptionPeriodStatus: jest.fn(),
}))

jest.mock('@/utils/email_helper', () => ({
  sendCryptoExpiryReminderEmail: jest.fn(),
  sendSubscriptionExpiredEmail: jest.fn(),
  sendSubscriptionRenewalDueEmail: jest.fn(),
}))

jest.mock('@/utils/email_utils', () => ({
  getDisplayNameForEmail: jest.fn(name => name),
}))

jest.mock('@/utils/workers/email.queue', () => ({
  EmailQueue: jest.fn().mockImplementation(() => ({
    add: jest.fn((fn) => fn()),
  })),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/webhook/billing-reminders'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'

describe('/api/server/webhook/billing-reminders', () => {
  const mockGetBillingPeriodsByExpiryWindow = database.getBillingPeriodsByExpiryWindow as jest.Mock
  const mockGetStripeSubscriptionByAccount = database.getStripeSubscriptionByAccount as jest.Mock
  const mockGetBillingEmailAccountInfo = database.getBillingEmailAccountInfo as jest.Mock
  const mockGetBillingPlanById = database.getBillingPlanById as jest.Mock
  const mockUpdateSubscriptionPeriodStatus = database.updateSubscriptionPeriodStatus as jest.Mock
  const mockSendCryptoExpiryReminderEmail = emailHelper.sendCryptoExpiryReminderEmail as jest.Mock
  const mockSendSubscriptionExpiredEmail = emailHelper.sendSubscriptionExpiredEmail as jest.Mock
  const mockSendSubscriptionRenewalDueEmail = emailHelper.sendSubscriptionRenewalDueEmail as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockPeriod = {
    id: 'period-123',
    owner_account: '0x123',
    billing_plan_id: 'plan-456',
    status: 'active',
    expiry_time: new Date(),
    registered_at: new Date(),
  }

  const mockAccountInfo = {
    email: 'user@example.com',
    displayName: 'John Doe',
  }

  const mockBillingPlan = {
    id: 'plan-456',
    name: 'Pro Plan',
    price: 10,
    billing_cycle: 'monthly',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/webhook/billing-reminders', () => {
    it('should process billing reminders successfully', async () => {
      mockGetBillingPeriodsByExpiryWindow.mockResolvedValue([])
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetBillingPeriodsByExpiryWindow).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          processed: expect.any(Object),
        })
      )
    })

    it('should send crypto expiry reminder for 0 days', async () => {
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([mockPeriod])
        .mockResolvedValue([])
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockUpdateSubscriptionPeriodStatus.mockResolvedValue(undefined)
      mockSendCryptoExpiryReminderEmail.mockResolvedValue(undefined)
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendCryptoExpiryReminderEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        0
      )
    })

    it('should send crypto expiry reminder for 3 days', async () => {
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockPeriod])
        .mockResolvedValue([])
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockSendCryptoExpiryReminderEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendCryptoExpiryReminderEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        3
      )
    })

    it('should send crypto expiry reminder for 5 days', async () => {
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockPeriod])
        .mockResolvedValue([])
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockSendCryptoExpiryReminderEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendCryptoExpiryReminderEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        5
      )
    })

    it('should send Stripe renewal due email for 4 days', async () => {
      const cancelledPeriod = { ...mockPeriod, status: 'cancelled' }
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([cancelledPeriod])
      mockGetStripeSubscriptionByAccount.mockResolvedValue({
        billing_plan_id: 'plan-456',
        account_address: '0x123',
      })
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockSendSubscriptionRenewalDueEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendSubscriptionRenewalDueEmail).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.any(Object),
        4
      )
    })

    it('should update subscription status to expired', async () => {
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([mockPeriod])
        .mockResolvedValue([])
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetBillingEmailAccountInfo.mockResolvedValue(mockAccountInfo)
      mockGetBillingPlanById.mockResolvedValue(mockBillingPlan)
      mockUpdateSubscriptionPeriodStatus.mockResolvedValue(undefined)
      mockSendCryptoExpiryReminderEmail.mockResolvedValue(undefined)
      mockSendSubscriptionExpiredEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateSubscriptionPeriodStatus).toHaveBeenCalledWith('period-123', 'expired')
      expect(mockSendSubscriptionExpiredEmail).toHaveBeenCalled()
    })

    it('should skip periods without billing_plan_id', async () => {
      const periodWithoutPlan = { ...mockPeriod, billing_plan_id: null }
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([periodWithoutPlan])
        .mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetStripeSubscriptionByAccount).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should not send Stripe renewal for active subscriptions', async () => {
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockPeriod])
      mockGetStripeSubscriptionByAccount.mockResolvedValue({
        billing_plan_id: 'plan-456',
        account_address: '0x123',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendSubscriptionRenewalDueEmail).not.toHaveBeenCalled()
    })

    it('should handle email queue errors gracefully', async () => {
      mockGetBillingPeriodsByExpiryWindow
        .mockResolvedValueOnce([mockPeriod])
        .mockResolvedValue([])
      mockGetStripeSubscriptionByAccount.mockResolvedValue(null)
      mockGetBillingEmailAccountInfo.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle top-level errors', async () => {
      const error = new Error('Database error')
      mockGetBillingPeriodsByExpiryWindow.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database error',
        success: false,
      })
    })

    it('should include timestamp in response', async () => {
      mockGetBillingPeriodsByExpiryWindow.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      const response = jsonMock.mock.calls[0][0]
      expect(response).toHaveProperty('timestamp')
      expect(typeof response.timestamp).toBe('string')
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
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
