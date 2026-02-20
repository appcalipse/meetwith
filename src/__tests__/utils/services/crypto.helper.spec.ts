import * as Sentry from '@sentry/nextjs'
import { addMonths, addYears } from 'date-fns'
import { WebhookPayload } from 'thirdweb/dist/types/bridge'
import { formatUnits } from 'viem'

import {
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
  SubscriptionType,
} from '@/types/Billing'
import { SupportedChain } from '@/types/chains'
import {
  PaymentDirection,
  PaymentStatus,
  PaymentType,
  TokenType,
} from '@/utils/constants/meeting-types'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'
import {
  BillingPlanNotFoundError,
  MissingSubscriptionMetadataError,
} from '@/utils/errors'
import { Currency } from '@/utils/services/onramp.money'
import {
  cancelCryptoSubscription,
  handleCryptoSubscriptionPayment,
} from '@/utils/services/crypto.helper'

jest.mock('@sentry/nextjs')
jest.mock('viem')
jest.mock('@/utils/database')
jest.mock('@/utils/email_helper')
jest.mock('@/utils/workers/email.queue')
jest.mock('@/types/chains', () => ({
  ...jest.requireActual('@/types/chains'),
  getSupportedChainFromId: jest.fn(),
}))

const { getSupportedChainFromId } = require('@/types/chains')

describe('Transaction Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('handleCryptoSubscriptionPayment', () => {
    const mockBillingPlan = {
      billing_cycle: 'monthly' as const,
      id: 'plan-123',
      name: 'Pro Plan',
      price: 10,
    }

    const mockSubscriptionData = {
      account_address: '0xabcd',
      billing_plan_id: 'plan-123',
      handle: 'myhandle',
      subscription_channel: 'web',
      subscription_type: SubscriptionType.INDIVIDUAL,
    }

    const mockOnrampPayload: WebhookPayload = {
      data: {
        amount: '1000000',
        currencyAmount: '10.00',
        id: 'onramp-tx-123',
        token: {
          address: '0xtoken',
          chainId: 42161,
          decimals: 6,
        },
        transactionHash: '0xhash123',
      },
      type: 'pay.onramp-transaction',
    } as any

    const mockOnchainPayload: WebhookPayload = {
      data: {
        destinationAmount: '10000000',
        destinationToken: {
          address: '0xtoken',
          chainId: 42161,
          decimals: 6,
          priceUsd: 1.0,
        },
        developerFeeBps: 100,
        originAmount: '11000000',
        originToken: {
          decimals: 6,
          priceUsd: 1.0,
        },
        paymentId: 'payment-123',
        transactionId: 'tx-123',
        transactions: [
          {
            chainId: 42161,
            transactionHash: '0xhash123',
          },
        ],
      },
      type: 'pay.transaction',
    } as any

    beforeEach(() => {
      ;(formatUnits as jest.Mock).mockReturnValue('10.0')
      getSupportedChainFromId.mockReturnValue({
        chain: SupportedChain.ARBITRUM,
        id: 42161,
        name: 'Arbitrum',
      })
      jest
        .spyOn(database, 'getBillingPlanById')
        .mockResolvedValue(mockBillingPlan as any)
      jest.spyOn(database, 'getActiveSubscriptionPeriod').mockResolvedValue(null)
      jest.spyOn(database, 'createSubscriptionTransaction').mockResolvedValue({
        id: 'tx-123',
      } as any)
      jest.spyOn(database, 'createSubscriptionPeriod').mockResolvedValue({
        expiry_time: addMonths(new Date(), 1).toISOString(),
        id: 'period-123',
        registered_at: new Date().toISOString(),
      } as any)
    })

    it('should handle onramp transaction payment', async () => {
      const result = await handleCryptoSubscriptionPayment(
        mockOnrampPayload,
        mockSubscriptionData
      )

      expect(database.createSubscriptionTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 10.0,
          chain_id: 42161,
          currency: Currency.USD,
          direction: PaymentDirection.CREDIT,
          fiat_equivalent: '10.00',
          method: PaymentType.CRYPTO,
          provider_reference_id: 'onramp-tx-123',
          status: PaymentStatus.COMPLETED,
          token_address: '0xtoken',
          transaction_hash: '0xhash123',
        })
      )

      expect(database.createSubscriptionPeriod).toHaveBeenCalled()
      expect(result).toMatchObject({
        billing_plan_id: 'plan-123',
        subscription_type: SubscriptionType.INDIVIDUAL,
      })
    })

    it('should handle onchain transaction payment', async () => {
      const result = await handleCryptoSubscriptionPayment(
        mockOnchainPayload,
        mockSubscriptionData
      )

      expect(database.createSubscriptionTransaction).toHaveBeenCalled()
      expect(database.createSubscriptionPeriod).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should throw MissingSubscriptionMetadataError if billing_plan_id missing', async () => {
      const invalidData = {
        ...mockSubscriptionData,
        billing_plan_id: '',
      }

      await expect(
        handleCryptoSubscriptionPayment(mockOnrampPayload, invalidData)
      ).rejects.toThrow(MissingSubscriptionMetadataError)

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should throw MissingSubscriptionMetadataError if account_address missing', async () => {
      const invalidData = {
        ...mockSubscriptionData,
        account_address: '',
      }

      await expect(
        handleCryptoSubscriptionPayment(mockOnrampPayload, invalidData)
      ).rejects.toThrow(MissingSubscriptionMetadataError)
    })

    it('should throw BillingPlanNotFoundError if plan not found', async () => {
      jest.spyOn(database, 'getBillingPlanById').mockResolvedValue(null)

      await expect(
        handleCryptoSubscriptionPayment(mockOnrampPayload, mockSubscriptionData)
      ).rejects.toThrow(BillingPlanNotFoundError)

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should throw error if chain not found', async () => {
      getSupportedChainFromId.mockReturnValue(null)

      await expect(
        handleCryptoSubscriptionPayment(mockOnrampPayload, mockSubscriptionData)
      ).rejects.toThrow('Chain not found')

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should throw error if transaction hash not found in onchain payload', async () => {
      const payloadWithoutHash = {
        ...mockOnchainPayload,
        data: {
          ...mockOnchainPayload.data,
          transactions: [],
        },
      }

      await expect(
        handleCryptoSubscriptionPayment(payloadWithoutHash, mockSubscriptionData)
      ).rejects.toThrow('Transaction hash not found in payload')
    })

    it('should calculate fee breakdown for onchain transactions', async () => {
      await handleCryptoSubscriptionPayment(
        mockOnchainPayload,
        mockSubscriptionData
      )

      expect(database.createSubscriptionTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          fee_breakdown: expect.objectContaining({
            developer: expect.any(Number),
            network: expect.any(Number),
          }),
        })
      )
    })

    it('should extend existing subscription if active', async () => {
      const existingExpiry = new Date(Date.now() + 86400000 * 10)
      jest.spyOn(database, 'getActiveSubscriptionPeriod').mockResolvedValue({
        expiry_time: existingExpiry.toISOString(),
        id: 'existing-123',
      } as any)

      await handleCryptoSubscriptionPayment(
        mockOnrampPayload,
        mockSubscriptionData
      )

      expect(database.createSubscriptionPeriod).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'active',
        expect.stringContaining(String(existingExpiry.getMonth() + 2)),
        expect.any(String),
        expect.any(String)
      )
    })

    it('should handle yearly billing cycle', async () => {
      const yearlyPlan = {
        ...mockBillingPlan,
        billing_cycle: 'yearly' as const,
      }
      jest.spyOn(database, 'getBillingPlanById').mockResolvedValue(yearlyPlan as any)

      await handleCryptoSubscriptionPayment(
        mockOnrampPayload,
        mockSubscriptionData
      )

      expect(database.createSubscriptionPeriod).toHaveBeenCalled()
    })

    it('should use existing domain if no handle provided', async () => {
      const dataWithoutHandle = {
        ...mockSubscriptionData,
        handle: undefined,
      }

      jest.spyOn(database, 'getActiveSubscriptionPeriod').mockResolvedValue({
        domain: 'existingdomain',
        expiry_time: new Date().toISOString(),
        id: 'existing-123',
      } as any)

      await handleCryptoSubscriptionPayment(
        mockOnrampPayload,
        dataWithoutHandle
      )

      expect(database.createSubscriptionPeriod).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'active',
        expect.any(String),
        expect.any(String),
        'existingdomain'
      )
    })

    it('should capture exception on transaction creation failure', async () => {
      const mockError = new Error('DB error')
      jest
        .spyOn(database, 'createSubscriptionTransaction')
        .mockRejectedValue(mockError)

      await expect(
        handleCryptoSubscriptionPayment(mockOnrampPayload, mockSubscriptionData)
      ).rejects.toThrow('DB error')

      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          extra: expect.objectContaining({
            account_address: mockSubscriptionData.account_address,
            billing_plan_id: mockSubscriptionData.billing_plan_id,
          }),
        })
      )
    })

    it('should capture exception on subscription period creation failure', async () => {
      const mockError = new Error('DB error')
      jest
        .spyOn(database, 'createSubscriptionPeriod')
        .mockRejectedValue(mockError)

      await expect(
        handleCryptoSubscriptionPayment(mockOnrampPayload, mockSubscriptionData)
      ).rejects.toThrow('DB error')

      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.any(Object)
      )
    })

    it('should handle transaction with matching chainId', async () => {
      const payloadWithMultipleTransactions = {
        ...mockOnchainPayload,
        data: {
          ...mockOnchainPayload.data,
          transactions: [
            {
              chainId: 1,
              transactionHash: '0xwrong',
            },
            {
              chainId: 42161,
              transactionHash: '0xcorrect',
            },
          ],
        },
      }

      await handleCryptoSubscriptionPayment(
        payloadWithMultipleTransactions,
        mockSubscriptionData
      )

      expect(database.createSubscriptionTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transaction_hash: '0xcorrect',
        })
      )
    })
  })

  describe('cancelCryptoSubscription', () => {
    const mockAccountAddress = '0xABCD'

    beforeEach(() => {
      jest.spyOn(database, 'getSubscriptionPeriodsByAccount').mockResolvedValue([])
      jest
        .spyOn(database, 'getStripeSubscriptionByAccount')
        .mockResolvedValue(null)
    })

    it('should cancel active crypto subscriptions', async () => {
      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        status: 'active',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await cancelCryptoSubscription(mockAccountAddress)

      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledWith(
        'period-123',
        'cancelled'
      )
    })

    it('should not cancel Stripe subscriptions', async () => {
      const mockStripeSubscription = {
        account_address: '0xabcd',
        billing_plan_id: 'plan-123',
      }

      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        status: 'active',
      }

      jest
        .spyOn(database, 'getStripeSubscriptionByAccount')
        .mockResolvedValue(mockStripeSubscription as any)
      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await cancelCryptoSubscription(mockAccountAddress)

      expect(database.updateSubscriptionPeriodStatus).not.toHaveBeenCalled()
    })

    it('should skip subscriptions without billing_plan_id', async () => {
      const mockSubscriptionPeriod = {
        billing_plan_id: null,
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        status: 'active',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await cancelCryptoSubscription(mockAccountAddress)

      expect(database.updateSubscriptionPeriodStatus).not.toHaveBeenCalled()
    })

    it('should skip expired subscriptions', async () => {
      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() - 172800000).toISOString(),
        id: 'period-123',
        status: 'active',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await cancelCryptoSubscription(mockAccountAddress)

      expect(database.updateSubscriptionPeriodStatus).not.toHaveBeenCalled()
    })

    it('should skip non-active subscriptions', async () => {
      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        status: 'cancelled',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await cancelCryptoSubscription(mockAccountAddress)

      expect(database.updateSubscriptionPeriodStatus).not.toHaveBeenCalled()
    })

    it('should handle errors and capture to Sentry', async () => {
      const mockError = new Error('Database error')
      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockRejectedValue(mockError)

      await expect(
        cancelCryptoSubscription(mockAccountAddress)
      ).rejects.toThrow('Database error')

      expect(Sentry.captureException).toHaveBeenCalledWith(
        mockError,
        expect.objectContaining({
          extra: {
            account_address: mockAccountAddress,
          },
        })
      )
    })

    it('should lowercase account address', async () => {
      await cancelCryptoSubscription('0xABCD')

      expect(database.getSubscriptionPeriodsByAccount).toHaveBeenCalledWith(
        '0xabcd'
      )
      expect(database.getStripeSubscriptionByAccount).toHaveBeenCalledWith(
        '0xabcd'
      )
    })

    it('should cancel multiple active subscriptions', async () => {
      const mockSubscriptionPeriods = [
        {
          billing_plan_id: 'plan-123',
          expiry_time: new Date(Date.now() + 172800000).toISOString(),
          id: 'period-1',
          status: 'active',
        },
        {
          billing_plan_id: 'plan-456',
          expiry_time: new Date(Date.now() + 172800000).toISOString(),
          id: 'period-2',
          status: 'active',
        },
      ]

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue(mockSubscriptionPeriods as any)

      await cancelCryptoSubscription(mockAccountAddress)

      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledTimes(2)
      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledWith(
        'period-1',
        'cancelled'
      )
      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledWith(
        'period-2',
        'cancelled'
      )
    })
  })
})
