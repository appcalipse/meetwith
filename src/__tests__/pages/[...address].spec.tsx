import { when } from 'jest-when'
import { NextPageContext } from 'next'

import PublicCalendar from '@/pages/[...address]'
import { Account } from '@/types/Account'
import { getAccount } from '@/utils/api_helper'
import { AccountNotFoundError } from '@/utils/errors'
import redirectTo from '@/utils/redirect'
import { isProAccount } from '@/utils/subscription_manager'

jest.mock('@/utils/redirect')
jest.mock('@/utils/api_helper')
jest.mock('@/utils/subscription_manager')

describe('PublicCalendar /[...address] - getInitialProps', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /404 if the address is missing', async () => {
    // given
    const ctx: Partial<NextPageContext> = {
      query: {},
    }

    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(redirectTo).toHaveBeenCalledTimes(1)
    expect(redirectTo).toHaveBeenCalledWith('/404', 302, ctx)
    expect(props).toBeUndefined()
  })

  it('redirects to /address/[...address] if the address is a valid EVM address', async () => {
    // given
    const address = '0x75c84f2af0dae53eb7ae549a6af53eb88ffd7616'
    const ctx: Partial<NextPageContext> = {
      query: { address: [address] },
    }
    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(redirectTo).toHaveBeenCalledTimes(1)
    expect(redirectTo).toHaveBeenCalledWith('/address/' + address, 302, ctx)
    expect(props).toBeUndefined()
  })

  it('redirects to /404 if the user was not found', async () => {
    // given
    const address = 'non_prop_user'
    const ctx: Partial<NextPageContext> = {
      query: { address: [address] },
    }

    when(getAccount)
      .calledWith(address)
      .mockRejectedValue(new AccountNotFoundError(address))

    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(redirectTo).toHaveBeenCalledTimes(1)
    expect(redirectTo).toHaveBeenCalledWith('/404', 302, ctx)
    expect(props).toBeUndefined()
  })

  it('redirects to /404 if the account is not PRO', async () => {
    // given
    const address = 'non_prop_user'
    const ctx: Partial<NextPageContext> = {
      query: { address: [address] },
    }
    const account = {
      address,
    } as Account

    when(isProAccount).calledWith(account).mockReturnValueOnce(false)
    when(getAccount)
      .calledWith(ctx.query!.address![0])
      .mockResolvedValue(account)

    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(redirectTo).toHaveBeenCalledTimes(1)
    expect(redirectTo).toHaveBeenCalledWith('/404', 302, ctx)
    expect(props).toBeUndefined()
  })

  it('redirects to /404 is the account is_invited property is true', async () => {
    // given
    const address = '_PRO_DOMAIN_'
    const ctx: Partial<NextPageContext> = {
      query: { address: [address] },
      req: { headers: { host: 'http://localhost:3000' } } as any,
      asPath: '/address/' + address,
      res: {} as any,
    }
    const account = {
      address,
      is_invited: true,
    } as Account

    when(getAccount)
      .calledWith(ctx.query!.address![0])
      .mockResolvedValue(account)

    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(redirectTo).toHaveBeenCalledTimes(1)
    expect(redirectTo).toHaveBeenCalledWith('/404', 302, ctx)
    expect(props).toBeUndefined()
  })

  it('returns the expected properties when the account exists and is a PRO account', async () => {
    // given
    const address = 'pro_user'
    const ctx: Partial<NextPageContext> = {
      query: { address: [address] },
      req: { headers: { host: 'http://localhost:3000' } } as any,
      asPath: '/address/' + address,
    }
    const account = {
      address,
    } as Account

    when(isProAccount).calledWith(account).mockReturnValueOnce(true)
    when(getAccount)
      .calledWith(ctx.query!.address![0])
      .mockResolvedValue(account)

    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(props).toEqual({
      currentUrl: 'http://localhost:3000/address/' + address,
      account,
      serverSideRender: false,
    })
  })
})
