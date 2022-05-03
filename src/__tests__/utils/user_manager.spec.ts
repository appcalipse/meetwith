import { when } from 'jest-when'

import { Account } from '@/types/Account'
import { Subscription } from '@/types/Subscription'
import { getActiveProSubscription } from '@/utils/subscription_manager'
import { getAccountDisplayName } from '@/utils/user_manager'

jest.mock('@/utils/subscription_manager')

describe('getAccountDisplayName', () => {
  describe('when useENSorUD is false/undefined', () => {
    it('returns the account name if there is a PRO subscription', () => {
      const account = {
        address: '__address__',
      } as Account

      when(getActiveProSubscription)
        .calledWith(account)
        .mockReturnValueOnce({
          domain: 'PRO_DOMAIN',
        } as Subscription)

      expect(getAccountDisplayName(account)).toEqual('PRO_DOMAIN')
    })

    it('returns the account address if there is not a PRO subscription', () => {
      const account = {
        address: '__address__',
      } as Account

      when(getActiveProSubscription)
        .calledWith(account)
        .mockReturnValueOnce(undefined)

      expect(getAccountDisplayName(account)).toEqual('__add...ess__')
    })
  })

  describe('when useENSorUD is true', () => {
    const useENSorUD = true
    it('returns the account name if there is one', () => {
      const account = {
        name: '__name__',
        address: '__address__',
      } as Account

      expect(getAccountDisplayName(account, useENSorUD)).toEqual('__name__')
    })

    it('returns the account address if the account does not have a name', () => {
      const account = {
        address: '__address__',
      } as Account

      expect(getAccountDisplayName(account, useENSorUD)).toEqual(
        '__add...ess__'
      )
    })
  })
})
