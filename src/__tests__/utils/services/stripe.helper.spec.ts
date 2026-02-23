import { PaymentAccountStatus, PaymentProvider } from '@meta/PaymentAccount'
import { ICheckoutMetadata } from '@meta/Transactions'
import * as Sentry from '@sentry/nextjs'
import {
  PaymentDirection,
  PaymentStatus,
  PaymentType,
} from '@utils/constants/meeting-types'
import { addMonths, addYears } from 'date-fns'
import { NextApiRequest } from 'next'
import Stripe from 'stripe'

import {
  BillingEmailPlan,
  PaymentProvider as BillingPaymentProvider,
} from '@/types/Billing'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'
import { StripeService } from '@/utils/services/stripe.service'
import {
  getRawBody,
  handleAccountUpdate,
  handleChargeSucceeded,
  handleChargeFailed,
  handleFeeCollected,
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
  handleSubscriptionCreated,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@/utils/services/stripe.helper'

process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@sentry/nextjs')
jest.mock('@/utils/database')
jest.mock('@/utils/email_helper')
jest.mock('@/utils/services/stripe.service')
jest.mock('@/utils/workers/email.queue')

describe('Stripe Helper Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getRawBody', () => {
    it('should read request body as Buffer', async () => {
      const mockReq = {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler(Buffer.from('test data'))
          }
          if (event === 'end') {
            handler()
          }
        }),
      } as unknown as NextApiRequest

      const result = await getRawBody(mockReq)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.toString()).toBe('test data')
    })

    it('should handle string chunks', async () => {
      const mockReq = {
        on: jest.fn((event, handler) => {
          if (event === 'data') {
            handler('string chunk')
          }
          if (event === 'end') {
            handler()
          }
        }),
      } as unknown as NextApiRequest

      const result = await getRawBody(mockReq)

      expect(result.toString()).toBe('string chunk')
    })

    it('should reject on error', async () => {
      const mockError = new Error('Read error')
      const mockReq = {
        on: jest.fn((event, handler) => {
          if (event === 'error') {
            handler(mockError)
          }
        }),
      } as unknown as NextApiRequest

      await expect(getRawBody(mockReq)).rejects.toThrow('Read error')
    })
  })

  describe('handleAccountUpdate', () => {
    const mockAccountId = 'acct_test123'
    const mockProvider = {
      id: 'provider-id',
      owner_account_address: '0xtest',
    }

    beforeEach(() => {
      jest
        .spyOn(database, 'getPaymentAccountByProviderId')
        .mockResolvedValue(mockProvider as any)
    })

    it('should update status to CONNECTED when details_submitted is true', async () => {
      const mockEvent = {
        data: {
          object: { id: mockAccountId },
        },
      } as Stripe.AccountUpdatedEvent

      const mockAccount = { details_submitted: true }
      jest.mocked(StripeService).mockImplementationOnce(() => ({
        accounts: { retrieve: jest.fn().mockResolvedValue(mockAccount) },
      }) as any)

      await handleAccountUpdate(mockEvent)

      expect(database.updatePaymentAccount).toHaveBeenCalledWith(
        mockProvider.id,
        mockProvider.owner_account_address,
        { status: PaymentAccountStatus.CONNECTED }
      )
    })

    it('should update status to PENDING when account exists but details not submitted', async () => {
      const mockEvent = {
        data: {
          object: { id: mockAccountId },
        },
      } as Stripe.AccountUpdatedEvent

      const mockAccount = { details_submitted: false }
      jest.mocked(StripeService).mockImplementationOnce(() => ({
        accounts: { retrieve: jest.fn().mockResolvedValue(mockAccount) },
      }) as any)

      await handleAccountUpdate(mockEvent)

      expect(database.updatePaymentAccount).toHaveBeenCalledWith(
        mockProvider.id,
        mockProvider.owner_account_address,
        { status: PaymentAccountStatus.PENDING }
      )
    })

    it('should return null if provider not found', async () => {
      jest
        .spyOn(database, 'getPaymentAccountByProviderId')
        .mockResolvedValue(null)

      const mockEvent = {
        data: {
          object: { id: mockAccountId },
        },
      } as Stripe.AccountUpdatedEvent

      const result = await handleAccountUpdate(mockEvent)

      expect(result).toBeNull()
      expect(database.updatePaymentAccount).not.toHaveBeenCalled()
    })
  })

  describe('handleChargeSucceeded', () => {
    const mockMetadata: ICheckoutMetadata = {
      account_address: '0xtest',
      booking_id: 'booking-123',
      environment: process.env.NEXT_PUBLIC_ENV_CONFIG || 'test',
      meeting_type_id: 'meeting-123',
      transaction_id: 'tx-123',
    }

    it('should confirm fiat transaction with correct data', async () => {
      const mockEvent = {
        account: 'acct_test',
        data: {
          object: {
            amount: 5000,
            application_fee_amount: 500,
            currency: 'usd',
            id: 'ch_test123',
            metadata: mockMetadata,
            payment_method_details: { type: 'card' },
            receipt_url: 'https://receipt.url',
          },
        },
      } as Stripe.ChargeSucceededEvent

      await handleChargeSucceeded(mockEvent)

      expect(database.confirmFiatTransaction).toHaveBeenCalledWith(
        'ch_test123',
        mockMetadata,
        5,
        {
          amount_received: 50,
          currency: 'usd',
          destination: 'acct_test',
          payment_method: 'card',
          provider: PaymentProvider.STRIPE,
          receipt_url: 'https://receipt.url',
        }
      )
    })

    it('should skip if environment does not match', async () => {
      const wrongEnvMetadata = {
        ...mockMetadata,
        environment: 'wrong-env',
      }

      const mockEvent = {
        data: {
          object: {
            amount: 5000,
            id: 'ch_test123',
            metadata: wrongEnvMetadata,
          },
        },
      } as Stripe.ChargeSucceededEvent

      await handleChargeSucceeded(mockEvent)

      expect(database.confirmFiatTransaction).not.toHaveBeenCalled()
    })

    it('should handle missing application_fee_amount', async () => {
      const mockEvent = {
        account: 'acct_test',
        data: {
          object: {
            amount: 5000,
            application_fee_amount: null,
            currency: 'usd',
            id: 'ch_test123',
            metadata: mockMetadata,
            receipt_url: 'https://receipt.url',
          },
        },
      } as any

      await handleChargeSucceeded(mockEvent)

      expect(database.confirmFiatTransaction).toHaveBeenCalledWith(
        'ch_test123',
        mockMetadata,
        0,
        expect.any(Object)
      )
    })
  })

  describe('handleChargeFailed', () => {
    it('should update transaction status to FAILED', async () => {
      const mockMetadata: ICheckoutMetadata = {
        account_address: '0xtest',
        booking_id: 'booking-123',
        environment: 'test',
        meeting_type_id: 'meeting-123',
        transaction_id: 'tx-123',
      }

      const mockEvent = {
        data: {
          object: {
            metadata: mockMetadata,
          },
        },
      } as Stripe.ChargeFailedEvent

      await handleChargeFailed(mockEvent)

      expect(database.handleUpdateTransactionStatus).toHaveBeenCalledWith(
        'tx-123',
        PaymentStatus.FAILED
      )
    })
  })

  describe('handleFeeCollected', () => {
    it('should retrieve charge and confirm transaction', async () => {
      const mockMetadata: ICheckoutMetadata = {
        account_address: '0xtest',
        booking_id: 'booking-123',
        environment: 'test',
        meeting_type_id: 'meeting-123',
        transaction_id: 'tx-123',
      }

      const mockEvent = {
        data: {
          object: {
            account: 'acct_test',
            charge: 'ch_test123',
          },
        },
      } as Stripe.ApplicationFeeCreatedEvent

      const mockCharge = {
        amount: 5000,
        application_fee_amount: 500,
        currency: 'usd',
        id: 'ch_test123',
        metadata: mockMetadata,
        payment_method_details: { type: 'card' },
        receipt_url: 'https://receipt.url',
      }

      const mockChargesRetrieve = jest.fn().mockResolvedValue(mockCharge)
      jest.mocked(StripeService).mockImplementationOnce(() => ({
        charges: { retrieve: mockChargesRetrieve },
      }) as any)

      await handleFeeCollected(mockEvent)

      expect(database.confirmFiatTransaction).toHaveBeenCalledWith(
        'ch_test123',
        mockMetadata,
        5,
        expect.objectContaining({
          amount_received: 50,
          currency: 'usd',
          destination: 'acct_test',
          payment_method: 'card',
          provider: PaymentProvider.STRIPE,
        })
      )
    })

    it('should handle charge object instead of string', async () => {
      const mockMetadata: ICheckoutMetadata = {
        account_address: '0xtest',
        booking_id: 'booking-123',
        environment: 'test',
        meeting_type_id: 'meeting-123',
        transaction_id: 'tx-123',
      }

      const mockEvent = {
        data: {
          object: {
            account: { id: 'acct_test' } as any,
            charge: { id: 'ch_test123' } as any,
          },
        },
      } as Stripe.ApplicationFeeCreatedEvent

      const mockCharge = {
        amount: 5000,
        application_fee_amount: 500,
        currency: 'usd',
        id: 'ch_test123',
        metadata: mockMetadata,
        payment_method_details: { type: 'card' },
        receipt_url: 'https://receipt.url',
      }

      const mockChargesRetrieve = jest.fn().mockResolvedValue(mockCharge)
      jest.mocked(StripeService).mockImplementationOnce(() => ({
        charges: { retrieve: mockChargesRetrieve },
      }) as any)

      await handleFeeCollected(mockEvent)

      expect(mockChargesRetrieve).toHaveBeenCalledWith(
        'ch_test123',
        { stripeAccount: 'acct_test' }
      )
    })
  })

  describe('handleSubscriptionCreated', () => {
    it('should create stripe subscription with metadata', async () => {
      const mockEvent = {
        data: {
          object: {
            customer: 'cus_test123',
            id: 'sub_test123',
            metadata: {
              account_address: '0xABCD',
              billing_plan_id: 'plan-123',
            },
          },
        },
      } as Stripe.CustomerSubscriptionCreatedEvent

      await handleSubscriptionCreated(mockEvent)

      expect(database.createStripeSubscription).toHaveBeenCalledWith(
        '0xabcd',
        'sub_test123',
        'cus_test123',
        'plan-123'
      )
    })

    it('should skip if account_address is missing', async () => {
      const mockEvent = {
        data: {
          object: {
            customer: 'cus_test123',
            id: 'sub_test123',
            metadata: {
              billing_plan_id: 'plan-123',
            },
          },
        },
      } as Stripe.CustomerSubscriptionCreatedEvent

      await handleSubscriptionCreated(mockEvent)

      expect(database.createStripeSubscription).not.toHaveBeenCalled()
    })

    it('should skip if billing_plan_id is missing', async () => {
      const mockEvent = {
        data: {
          object: {
            customer: 'cus_test123',
            id: 'sub_test123',
            metadata: {
              account_address: '0xABCD',
            },
          },
        },
      } as Stripe.CustomerSubscriptionCreatedEvent

      await handleSubscriptionCreated(mockEvent)

      expect(database.createStripeSubscription).not.toHaveBeenCalled()
    })

    it('should handle customer object instead of string', async () => {
      const mockEvent = {
        data: {
          object: {
            customer: { id: 'cus_test123' } as any,
            id: 'sub_test123',
            metadata: {
              account_address: '0xABCD',
              billing_plan_id: 'plan-123',
            },
          },
        },
      } as Stripe.CustomerSubscriptionCreatedEvent

      await handleSubscriptionCreated(mockEvent)

      expect(database.createStripeSubscription).toHaveBeenCalledWith(
        '0xabcd',
        'sub_test123',
        'cus_test123',
        'plan-123'
      )
    })

    it('should capture exception if createStripeSubscription fails', async () => {
      const mockError = new Error('Database error')
      jest
        .spyOn(database, 'createStripeSubscription')
        .mockRejectedValue(mockError)

      const mockEvent = {
        data: {
          object: {
            customer: 'cus_test123',
            id: 'sub_test123',
            metadata: {
              account_address: '0xABCD',
              billing_plan_id: 'plan-123',
            },
          },
        },
      } as Stripe.CustomerSubscriptionCreatedEvent

      await handleSubscriptionCreated(mockEvent)

      expect(Sentry.captureException).toHaveBeenCalledWith(mockError)
    })
  })

  describe('handleSubscriptionUpdated', () => {
    const mockStripeSubscription = {
      account_address: '0xtest',
      billing_plan_id: 'plan-123',
      id: 'sub_test123',
    }

    beforeEach(() => {
      jest
        .spyOn(database, 'getStripeSubscriptionById')
        .mockResolvedValue(mockStripeSubscription as any)
      jest.spyOn(database, 'getSubscriptionPeriodsByAccount').mockResolvedValue(
        []
      )
    })

    it('should cancel subscription when cancel_at is set', async () => {
      const mockEvent = {
        data: {
          object: {
            cancel_at: Math.floor(Date.now() / 1000) + 86400,
            id: 'sub_test123',
          },
          previous_attributes: {},
        },
      } as Stripe.CustomerSubscriptionUpdatedEvent

      StripeService.prototype.subscriptions = {
        retrieve: jest.fn().mockResolvedValue({
          cancel_at: Math.floor(Date.now() / 1000) + 86400,
        }),
      } as any

      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        registered_at: new Date().toISOString(),
        status: 'active',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)
      jest.spyOn(database, 'getBillingPlanById').mockResolvedValue({
        billing_cycle: 'monthly',
        id: 'plan-123',
        name: 'Pro Plan',
        price: 10,
      } as any)

      await handleSubscriptionUpdated(mockEvent)

      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledWith(
        'period-123',
        'cancelled'
      )
    })

    it('should reactivate subscription when cancel_at is removed', async () => {
      const mockEvent = {
        data: {
          object: {
            cancel_at: null,
            id: 'sub_test123',
          },
          previous_attributes: {
            cancel_at: Math.floor(Date.now() / 1000) + 86400,
          },
        },
      } as any

      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        status: 'cancelled',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await handleSubscriptionUpdated(mockEvent)

      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledWith(
        'period-123',
        'active'
      )
    })

    it('should return early if subscription not found', async () => {
      jest
        .spyOn(database, 'getStripeSubscriptionById')
        .mockResolvedValue(null)

      const mockEvent = {
        data: {
          object: {
            id: 'sub_test123',
          },
        },
      } as Stripe.CustomerSubscriptionUpdatedEvent

      await handleSubscriptionUpdated(mockEvent)

      expect(database.updateSubscriptionPeriodStatus).not.toHaveBeenCalled()
    })

    it('should handle plan changes', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'sub_test123',
            items: {
              data: [
                {
                  price: {
                    product: 'prod_new123',
                  },
                },
              ],
            },
          },
          previous_attributes: {},
        },
      } as any

      jest
        .spyOn(database, 'getBillingPlanIdFromStripeProduct')
        .mockResolvedValue('plan-456')

      StripeService.prototype.subscriptions = {
        retrieve: jest.fn().mockResolvedValue({
          cancel_at: null,
          items: {
            data: [{ current_period_end: Math.floor(Date.now() / 1000) + 86400 }],
          },
        }),
      } as any

      jest.spyOn(database, 'getBillingPlanById').mockResolvedValue({
        billing_cycle: 'monthly',
        id: 'plan-456',
        name: 'Enterprise Plan',
        price: 50,
      } as any)

      await handleSubscriptionUpdated(mockEvent)

      expect(database.updateStripeSubscription).toHaveBeenCalledWith(
        'sub_test123',
        { billing_plan_id: 'plan-456' }
      )
    })
  })

  describe('handleSubscriptionDeleted', () => {
    it('should cancel all active subscription periods', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'sub_test123',
          },
        },
      } as Stripe.CustomerSubscriptionDeletedEvent

      const mockStripeSubscription = {
        account_address: '0xtest',
      }

      jest
        .spyOn(database, 'getStripeSubscriptionById')
        .mockResolvedValue(mockStripeSubscription as any)

      const mockSubscriptionPeriod = {
        billing_plan_id: 'plan-123',
        expiry_time: new Date(Date.now() + 172800000).toISOString(),
        id: 'period-123',
        status: 'active',
      }

      jest
        .spyOn(database, 'getSubscriptionPeriodsByAccount')
        .mockResolvedValue([mockSubscriptionPeriod] as any)

      await handleSubscriptionDeleted(mockEvent)

      expect(database.updateSubscriptionPeriodStatus).toHaveBeenCalledWith(
        'period-123',
        'expired'
      )
    })

    it('should skip if stripe subscription not found', async () => {
      jest
        .spyOn(database, 'getStripeSubscriptionById')
        .mockResolvedValue(null)

      const mockEvent = {
        data: {
          object: {
            id: 'sub_test123',
          },
        },
      } as Stripe.CustomerSubscriptionDeletedEvent

      await handleSubscriptionDeleted(mockEvent)

      expect(database.getSubscriptionPeriodsByAccount).not.toHaveBeenCalled()
    })
  })

  describe('handleInvoicePaymentSucceeded', () => {
    const mockBillingPlan = {
      billing_cycle: 'monthly' as const,
      id: 'plan-123',
      name: 'Pro Plan',
      price: 10,
    }

    beforeEach(() => {
      jest
        .spyOn(database, 'getBillingPlanById')
        .mockResolvedValue(mockBillingPlan as any)
      jest
        .spyOn(database, 'getStripeSubscriptionById')
        .mockResolvedValue({
          account_address: '0xtest',
          billing_plan_id: 'plan-123',
          stripe_customer_id: 'cus_test',
          stripe_subscription_id: 'sub_test',
        } as any)
    })

    it('should create subscription period for new subscription', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 2592000
      const mockEvent = {
        data: {
          object: {
            amount_paid: 1000,
            billing_reason: 'subscription_create',
            currency: 'usd',
            id: 'inv_test',
            lines: {
              data: [
                {
                  period: {
                    end: futureTimestamp,
                  },
                },
              ],
            },
            period_end: futureTimestamp,
            subscription: 'sub_test',
          },
        },
      } as any

      jest
        .spyOn(database, 'findExistingSubscriptionPeriod')
        .mockResolvedValue(null)
      jest.spyOn(database, 'createSubscriptionTransaction').mockResolvedValue({
        id: 'tx-123',
      } as any)
      jest.spyOn(database, 'createSubscriptionPeriod').mockResolvedValue({
        expiry_time: new Date(futureTimestamp * 1000).toISOString(),
        id: 'period-123',
        registered_at: new Date().toISOString(),
      } as any)

      await handleInvoicePaymentSucceeded(mockEvent)

      expect(database.createSubscriptionTransaction).toHaveBeenCalled()
      expect(database.createSubscriptionPeriod).toHaveBeenCalled()
    })

    it('should skip if subscription not found', async () => {
      const mockEvent = {
        data: {
          object: {
            subscription: 'sub_test',
          },
        },
      } as any

      jest
        .spyOn(database, 'getStripeSubscriptionById')
        .mockResolvedValue(null)

      await handleInvoicePaymentSucceeded(mockEvent)

      expect(database.createSubscriptionTransaction).not.toHaveBeenCalled()
    })
  })

  describe('handleInvoicePaymentFailed', () => {
    it('should capture exception when invoice payment fails', async () => {
      const mockEvent = {
        data: {
          object: {
            subscription: 'sub_test123',
          },
        },
      } as any

      jest.spyOn(database, 'getStripeSubscriptionById').mockResolvedValue({
        account_address: '0xtest',
        billing_plan_id: 'plan-123',
      } as any)

      await handleInvoicePaymentFailed(mockEvent)

      expect(Sentry.captureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Stripe invoice payment failed',
        })
      )
    })

    it('should return early if subscription ID not found', async () => {
      const mockEvent = {
        data: {
          object: {},
        },
      } as any

      await handleInvoicePaymentFailed(mockEvent)

      expect(database.getStripeSubscriptionById).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling - handleAccountUpdate', () => {
    it('should handle Stripe API errors when retrieving account', async () => {
      const mockProvider = {
        id: 'provider-id',
        owner_account_address: '0xtest',
      }

      jest.spyOn(database, 'getPaymentAccountByProviderId').mockResolvedValue(mockProvider as any)
      jest.mocked(StripeService).mockImplementationOnce(() => ({
        accounts: { retrieve: jest.fn().mockRejectedValue(new Error('Stripe API unavailable')) },
      }) as any)

      const mockEvent = {
        data: { object: { id: 'acct_error' } },
      } as any

      await expect(handleAccountUpdate(mockEvent)).rejects.toThrow('Stripe API unavailable')
      expect(database.updatePaymentAccount).not.toHaveBeenCalled()
    })

    it('should handle null provider scenario', async () => {
      jest.spyOn(database, 'getPaymentAccountByProviderId').mockResolvedValue(null)

      const mockEvent = {
        data: { object: { id: 'acct_null' } },
      } as any

      const result = await handleAccountUpdate(mockEvent)
      expect(result).toBeNull()
      expect(database.updatePaymentAccount).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling - handleChargeSucceeded', () => {
    it('should handle database transaction confirmation failures', async () => {
      const mockEvent = {
        account: 'acct_test',
        data: {
          object: {
            amount: 1000,
            application_fee_amount: 100,
            currency: 'usd',
            id: 'ch_test',
            metadata: {
              environment: process.env.NEXT_PUBLIC_ENV_CONFIG,
              transaction_id: 'tx-123',
            },
            payment_method_details: { type: 'card' },
            receipt_url: '',
          },
        },
      } as any

      jest.spyOn(database, 'confirmFiatTransaction').mockRejectedValue(
        new Error('Database error')
      )

      await expect(handleChargeSucceeded(mockEvent)).rejects.toThrow('Database error')
    })

    it('should handle malformed metadata gracefully', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'ch_malformed',
            metadata: {
              invalid_key: 'value',
            },
          },
        },
      } as any

      await handleChargeSucceeded(mockEvent)

      // Should complete without throwing
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })

    it('should handle null metadata', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'ch_null_meta',
            metadata: null,
          },
        },
      } as any

      await expect(handleChargeSucceeded(mockEvent)).rejects.toThrow()
    })
  })

  describe('Error Handling - handleChargeFailed', () => {
    it('should capture exception with charge details', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'ch_failed',
            failure_message: 'Card declined',
            metadata: {
              transaction_id: 'tx-456',
            },
          },
        },
      } as any

      await handleChargeFailed(mockEvent)

      expect(database.handleUpdateTransactionStatus).toHaveBeenCalledWith(
        'tx-456',
        PaymentStatus.FAILED
      )
    })

    it('should handle missing metadata in failed charge', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'ch_no_meta',
          },
        },
      } as any

      await expect(handleChargeFailed(mockEvent)).rejects.toThrow()
    })
  })

  describe('Error Handling - handleFeeCollected', () => {
    it('should handle Stripe charge retrieve failures', async () => {
      const mockEvent = {
        data: {
          object: {
            account: 'acct_test',
            charge: 'ch_error',
          },
        },
      } as any

      jest.mocked(StripeService).mockImplementationOnce(() => ({
        charges: { retrieve: jest.fn().mockRejectedValue(new Error('Charge not found')) },
      }) as any)

      await expect(handleFeeCollected(mockEvent)).rejects.toThrow('Charge not found')
    })

    it('should handle missing charge reference', async () => {
      const mockEvent = {
        data: {
          object: {},
        },
      } as any

      await expect(handleFeeCollected(mockEvent)).rejects.toThrow()
    })
  })

  describe('Error Handling - handleSubscriptionCreated', () => {
    it('should handle database createSubscription failures', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'sub_create_error',
            customer: 'cus_test',
            metadata: {
              account_address: '0xtest',
              billing_plan_id: 'plan-123',
            },
          },
        },
      } as any

      jest.spyOn(database, 'createStripeSubscription').mockRejectedValue(
        new Error('Database constraint violation')
      )

      await handleSubscriptionCreated(mockEvent)

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('Error Handling - handleSubscriptionUpdated', () => {
    it('should handle Stripe API errors during update', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'sub_update_error',
            status: 'active',
          },
        },
      } as any

      jest.spyOn(database, 'updateStripeSubscription').mockRejectedValue(
        new Error('Stripe API timeout')
      )

      await handleSubscriptionUpdated(mockEvent)

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle complex plan changes', async () => {
      const mockEvent = {
        data: {
          object: {
            id: 'sub_plan_change',
            items: {
              data: [
                {
                  price: {
                    id: 'price_new',
                    product: 'prod_new',
                    recurring: {
                      interval: 'year',
                    },
                  },
                },
              ],
            },
          },
          previous_attributes: {},
        },
      } as any

      jest.spyOn(database, 'getStripeSubscriptionById').mockResolvedValue({
        account_address: '0xtest',
        billing_plan_id: 'plan-old',
        stripe_subscription_id: 'sub_plan_change',
      } as any)
      jest.spyOn(database, 'getBillingPlanIdFromStripeProduct').mockResolvedValue('plan-new')
      jest.spyOn(database, 'getSubscriptionPeriodsByAccount').mockResolvedValue([])
      jest.spyOn(database, 'updateStripeSubscription').mockResolvedValue({} as any)

      await handleSubscriptionUpdated(mockEvent)

      expect(database.updateStripeSubscription).toHaveBeenCalledWith(
        'sub_plan_change',
        { billing_plan_id: 'plan-new' }
      )
    })
  })

  describe('Error Handling - handleInvoicePaymentSucceeded', () => {
    it('should handle billing plan lookup failures', async () => {
      const mockEvent = {
        data: {
          object: {
            subscription: 'sub_test',
            customer: 'cus_test',
            total: 1000,
          },
        },
      } as any

      jest.spyOn(database, 'getStripeSubscriptionById').mockResolvedValue({
        account_address: '0xtest',
        billing_plan_id: 'plan-missing',
      } as any)
      jest.spyOn(database, 'getBillingPlanById').mockResolvedValue(null)

      await handleInvoicePaymentSucceeded(mockEvent)

      expect(database.createSubscriptionTransaction).not.toHaveBeenCalled()
    })

    it('should handle transaction creation errors', async () => {
      const mockEvent = {
        data: {
          object: {
            subscription: 'sub_test',
            customer: 'cus_test',
            total: 1000,
          },
        },
      } as any

      jest.spyOn(database, 'getStripeSubscriptionById').mockResolvedValue({
        account_address: '0xtest',
        billing_plan_id: 'plan-123',
      } as any)
      jest.spyOn(database, 'getBillingPlanById').mockResolvedValue({
        id: 'plan-123',
        name: 'Pro',
        interval: 'month',
      } as any)
      jest.spyOn(database, 'createSubscriptionTransaction').mockRejectedValue(
        new Error('Transaction creation failed')
      )

      await handleInvoicePaymentSucceeded(mockEvent)

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle missing subscription in invoice', async () => {
      const mockEvent = {
        data: {
          object: {
            customer: 'cus_test',
            total: 1000,
          },
        },
      } as any

      await handleInvoicePaymentSucceeded(mockEvent)

      expect(database.getStripeSubscriptionById).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling - handleInvoicePaymentFailed', () => {
    it('should handle database lookup failures', async () => {
      const mockEvent = {
        data: {
          object: {
            subscription: 'sub_fail',
          },
        },
      } as any

      jest.spyOn(database, 'getStripeSubscriptionById').mockRejectedValue(
        new Error('Database connection lost')
      )

      await expect(handleInvoicePaymentFailed(mockEvent)).rejects.toThrow('Database connection lost')
    })

    it('should handle null subscription lookup', async () => {
      const mockEvent = {
        data: {
          object: {
            subscription: 'sub_nonexistent',
          },
        },
      } as any

      jest.spyOn(database, 'getStripeSubscriptionById').mockResolvedValue(null)

      await handleInvoicePaymentFailed(mockEvent)

      // Source returns early when subscription is null, without capturing
      expect(Sentry.captureException).not.toHaveBeenCalled()
    })
  })
})
