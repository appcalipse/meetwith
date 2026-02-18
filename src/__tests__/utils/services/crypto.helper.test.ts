/**
 * Tests for crypto.helper - Crypto payment and subscription functions
 */

import { SubscriptionType } from '@/types/Billing'
import { PaymentStatus } from '@/utils/constants/meeting-types'
import {
  handleCryptoSubscriptionPayment,
  cancelCryptoSubscription,
} from '@/utils/services/crypto.helper'

// Mock dependencies
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/database', () => ({
  createSubscriptionPeriod: jest.fn(),
  createSubscriptionTransaction: jest.fn(),
  getActiveSubscriptionPeriod: jest.fn(),
  getBillingPlanById: jest.fn(),
  getStripeSubscriptionByAccount: jest.fn(),
  getSubscriptionPeriodsByAccount: jest.fn(),
  updateSubscriptionPeriodStatus: jest.fn(),
}))

jest.mock('@/utils/email_helper', () => ({
  sendSubscriptionConfirmationEmailForAccount: jest.fn(),
}))

jest.mock('@/utils/workers/email.queue', () => ({
  EmailQueue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
  })),
}))

import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'

describe('crypto.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleCryptoSubscriptionPayment', () => {
    const mockPayload = {
      type: 'transaction_confirmed',
      data: {
        transactionHash: '0x123',
      },
    } as any

    const mockSubscriptionData = {
      billing_plan_id: 'plan-123',
      subscription_type: SubscriptionType.Monthly,
      account_address: '0xabc',
      subscription_channel: 'crypto',
      handle: 'user123',
    }

    it('should be defined', () => {
      expect(handleCryptoSubscriptionPayment).toBeDefined()
    })

    it('should throw error when billing_plan_id is missing', async () => {
      const invalidData = {
        ...mockSubscriptionData,
        billing_plan_id: undefined,
      }

      await expect(
        handleCryptoSubscriptionPayment(mockPayload, invalidData as any)
      ).rejects.toThrow()

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should throw error when account_address is missing', async () => {
      const invalidData = {
        ...mockSubscriptionData,
        account_address: undefined,
      }

      await expect(
        handleCryptoSubscriptionPayment(mockPayload, invalidData as any)
      ).rejects.toThrow()

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should throw error when billing plan is not found', async () => {
      ;(database.getBillingPlanById as jest.Mock).mockResolvedValue(null)

      await expect(
        handleCryptoSubscriptionPayment(mockPayload, mockSubscriptionData)
      ).rejects.toThrow()

      expect(database.getBillingPlanById).toHaveBeenCalledWith('plan-123')
      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle successful payment with valid data', async () => {
      const mockBillingPlan = {
        id: 'plan-123',
        name: 'Pro Plan',
        price: 10,
      }

      ;(database.getBillingPlanById as jest.Mock).mockResolvedValue(
        mockBillingPlan
      )
      ;(database.createSubscriptionPeriod as jest.Mock).mockResolvedValue({
        id: 'period-123',
      })
      ;(database.createSubscriptionTransaction as jest.Mock).mockResolvedValue({
        id: 'tx-123',
      })

      // Should not throw
      await handleCryptoSubscriptionPayment(mockPayload, mockSubscriptionData)

      expect(database.getBillingPlanById).toHaveBeenCalledWith('plan-123')
    })
  })

  describe('cancelCryptoSubscription', () => {
    it('should be defined', () => {
      expect(cancelCryptoSubscription).toBeDefined()
    })

    it('should handle cancellation when active period exists', async () => {
      const mockPeriod = {
        id: 'period-123',
        account_address: '0xabc',
        status: 'active',
      }

      ;(database.getActiveSubscriptionPeriod as jest.Mock).mockResolvedValue(
        mockPeriod
      )
      ;(database.updateSubscriptionPeriodStatus as jest.Mock).mockResolvedValue(
        { id: 'period-123' }
      )

      await cancelCryptoSubscription('0xabc')

      expect(database.getActiveSubscriptionPeriod).toHaveBeenCalledWith('0xabc')
      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalled()
    })

    it('should handle cancellation when no active period exists', async () => {
      ;(database.getActiveSubscriptionPeriod as jest.Mock).mockResolvedValue(
        null
      )

      await cancelCryptoSubscription('0xabc')

      expect(database.getActiveSubscriptionPeriod).toHaveBeenCalledWith('0xabc')
      expect(database.updateSubscriptionPeriodStatus).not.toHaveBeenCalled()
    })

    it('should handle errors during cancellation', async () => {
      const error = new Error('Database error')
      ;(database.getActiveSubscriptionPeriod as jest.Mock).mockRejectedValue(
        error
      )

      await expect(cancelCryptoSubscription('0xabc')).rejects.toThrow(
        'Database error'
      )

      expect(database.getActiveSubscriptionPeriod).toHaveBeenCalledWith('0xabc')
    })
  })

  describe('module exports', () => {
    it('exports handleCryptoSubscriptionPayment', () => {
      expect(handleCryptoSubscriptionPayment).toBeDefined()
      expect(typeof handleCryptoSubscriptionPayment).toBe('function')
    })

    it('exports cancelCryptoSubscription', () => {
      expect(cancelCryptoSubscription).toBeDefined()
      expect(typeof cancelCryptoSubscription).toBe('function')
    })
  })
})
