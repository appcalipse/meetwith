import { add, sub } from 'date-fns'

import { Account } from '@/types/Account'
import { Plan } from '@/types/Subscription'
import { isProAccount } from '@/utils/subscription_manager'

describe('isProAccount', () => {
  it('returns false when there the account is undefined', () => {
    const account = undefined
    expect(isProAccount(account)).toEqual(false)
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
          plan_id: Plan.PRO,
          expiry_time: sub(new Date(), { minutes: 1 }),
        },
      ],
    } as Account

    expect(isProAccount(account)).toEqual(false)
  })

  it('returns true when the Subscription is not expired', () => {
    const account = {
      subscriptions: [
        {
          plan_id: Plan.PRO,
          expiry_time: add(new Date(), { minutes: 1 }),
        },
      ],
    } as Account

    expect(isProAccount(account)).toEqual(true)
  })
})
