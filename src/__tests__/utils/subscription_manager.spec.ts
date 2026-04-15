import { add, sub } from 'date-fns'

import { Account } from '@/types/Account'
import { Plan } from '@/types/Subscription'
import { SupportedChain } from '@/types/chains'
import {
  isProAccount,
  getActiveProSubscription,
  getActiveBillingSubscription,
  isTrialEligible,
  convertBlockchainSubscriptionToSubscription,
} from '@/utils/subscription_manager'

describe('subscription_manager', () => {
  describe('isProAccount', () => {
    it('returns false when the account is undefined', () => {
      expect(isProAccount(undefined)).toEqual(false)
    })

    it('returns false when there is no Subscription', () => {
      const account = {
        subscriptions: [] as Account['subscriptions'],
      } as Account

      expect(isProAccount(account)).toEqual(false)
    })

    it('returns false when the Subscription has expired', () => {
      const account = {
        subscriptions: [
          {
            expiry_time: sub(new Date(), { minutes: 1 }),
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      expect(isProAccount(account)).toEqual(false)
    })

    it('returns true when the Subscription is not expired', () => {
      const account = {
        subscriptions: [
          {
            expiry_time: add(new Date(), { minutes: 1 }),
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      expect(isProAccount(account)).toEqual(true)
    })
  })

  describe('getActiveProSubscription', () => {
    it('returns undefined when account is undefined', () => {
      expect(getActiveProSubscription(undefined)).toBeUndefined()
    })

    it('returns undefined when account has null subscriptions', () => {
      expect(
        getActiveProSubscription({ subscriptions: null } as any)
      ).toBeUndefined()
    })

    it('returns undefined when all subscriptions are expired', () => {
      const account = {
        subscriptions: [
          {
            expiry_time: sub(new Date(), { days: 1 }),
            plan_id: Plan.PRO,
          },
          {
            expiry_time: sub(new Date(), { days: 10 }),
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      expect(getActiveProSubscription(account)).toBeUndefined()
    })

    it('returns the latest active subscription when multiple exist', () => {
      const laterExpiry = add(new Date(), { days: 30 })
      const account = {
        subscriptions: [
          {
            expiry_time: add(new Date(), { days: 5 }),
            plan_id: Plan.PRO,
          },
          {
            expiry_time: laterExpiry,
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      const result = getActiveProSubscription(account)
      expect(result).toBeDefined()
      expect(new Date(result!.expiry_time).getTime()).toEqual(
        laterExpiry.getTime()
      )
    })
  })

  describe('getActiveBillingSubscription', () => {
    it('returns null when account is undefined', () => {
      expect(getActiveBillingSubscription(undefined)).toBeNull()
    })

    it('returns null when there are no billing subscriptions', () => {
      const account = {
        subscriptions: [
          {
            expiry_time: add(new Date(), { days: 5 }),
            plan_id: Plan.PRO,
            // no billing_plan_id
          },
        ],
      } as Account

      expect(getActiveBillingSubscription(account)).toBeNull()
    })

    it('returns the latest active billing subscription', () => {
      const laterExpiry = add(new Date(), { days: 30 })
      const account = {
        subscriptions: [
          {
            billing_plan_id: 'plan_1',
            expiry_time: add(new Date(), { days: 5 }),
            plan_id: Plan.PRO,
          },
          {
            billing_plan_id: 'plan_2',
            expiry_time: laterExpiry,
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      const result = getActiveBillingSubscription(account)
      expect(result).not.toBeNull()
      expect(result!.billing_plan_id).toBe('plan_2')
    })

    it('returns null when all billing subscriptions are expired', () => {
      const account = {
        subscriptions: [
          {
            billing_plan_id: 'plan_1',
            expiry_time: sub(new Date(), { days: 1 }),
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      expect(getActiveBillingSubscription(account)).toBeNull()
    })
  })

  describe('isTrialEligible', () => {
    it('returns true when account is undefined', () => {
      expect(isTrialEligible(undefined)).toBe(true)
    })

    it('returns true when account has no subscriptions', () => {
      expect(isTrialEligible({ subscriptions: [] } as any)).toBe(true)
    })

    it('returns false when account has any subscriptions', () => {
      const account = {
        subscriptions: [
          {
            expiry_time: sub(new Date(), { days: 1 }),
            plan_id: Plan.PRO,
          },
        ],
      } as Account

      expect(isTrialEligible(account)).toBe(false)
    })
  })

  describe('convertBlockchainSubscriptionToSubscription', () => {
    it('converts a valid blockchain subscription', () => {
      const blockchainSub = {
        planId: 1n,
        owner: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        expiryTime: BigInt(Math.round(Date.now() / 1000) + 86400), // tomorrow in seconds
        domain: 'test.mww',
        configIpfsHash: 'QmHash123',
        registeredAt: BigInt(Math.round(Date.now() / 1000)),
        chain: 'arbitrum' as SupportedChain,
      }

      const result = convertBlockchainSubscriptionToSubscription(blockchainSub)

      expect(result.domain).toBe('test.mww')
      expect(result.owner_account).toBe(
        '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'.toLowerCase()
      )
      expect(result.plan_id).toBe(1)
      expect(result.config_ipfs_hash).toBe('QmHash123')
      expect(result.expiry_time).toBeInstanceOf(Date)
      expect(result.registered_at).toBeInstanceOf(Date)
    })

    it('handles expiry time in milliseconds (bad domain)', () => {
      const expiryMs = Date.now() + 86400000 // tomorrow in milliseconds (13 digits)
      const blockchainSub = {
        planId: 1n,
        owner: '0xABC',
        expiryTime: BigInt(expiryMs),
        domain: 'test.mww',
        configIpfsHash: '',
        registeredAt: BigInt(Math.round(Date.now() / 1000)),
        chain: 'arbitrum' as SupportedChain,
      }

      const result = convertBlockchainSubscriptionToSubscription(blockchainSub)

      // Should be close to tomorrow, not thousands of years in the future
      const oneWeekFromNow = new Date(Date.now() + 7 * 86400000)
      expect(result.expiry_time.getTime()).toBeLessThan(
        oneWeekFromNow.getTime()
      )
    })

    it('caps expiry time to year 2200 for bad initial injections', () => {
      const farFuture = Math.round(Date.now() / 1000) + 100 * 365 * 86400 * 100 // way past 2200
      const blockchainSub = {
        planId: 1n,
        owner: '0xABC',
        expiryTime: BigInt(farFuture),
        domain: 'test.mww',
        configIpfsHash: '',
        registeredAt: BigInt(Math.round(Date.now() / 1000)),
        chain: 'arbitrum' as SupportedChain,
      }

      const result = convertBlockchainSubscriptionToSubscription(blockchainSub)

      expect(result.expiry_time.getFullYear()).toBe(2200)
    })
  })
})
