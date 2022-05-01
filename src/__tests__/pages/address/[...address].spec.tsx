import { when } from 'jest-when'
import { NextPageContext } from 'next'

import PublicCalendar from '@/pages/address/[...address]'
import { Account } from '@/types/Account'
import { getAccount } from '@/utils/api_helper'
import redirectTo from '@/utils/redirect'

jest.mock('@/utils/redirect')
jest.mock('@/utils/api_helper')

describe('PublicCalendar /address/[...address] - getInitialProps', () => {
  it('returns the expected properties when the account exists', async () => {
    // given
    const address = '0x75c84f2af0dae53eb7ae549a6af53eb88ffd7616'
    const ctx: Partial<NextPageContext> = {
      query: { address: [address] },
      req: { headers: { host: 'http://localhost:3000' } } as any,
      asPath: '/address/' + address,
      res: {} as any,
    }
    const account = {
      address,
    } as Account

    when(getAccount)
      .calledWith(ctx.query!.address![0])
      .mockResolvedValue(account)

    // when
    const props = await PublicCalendar.getInitialProps!(ctx as any)

    // then
    expect(props).toEqual({
      currentUrl: 'http://localhost:3000/address/' + address,
      account,
      serverSideRender: true,
    })
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

  //TODO: I'm not sure what is_invited really means
  it.todo('redirects to /404 is the account is_invited')
})
