import * as Sentry from '@sentry/browser'
import { NextPage } from 'next'
import Router from 'next/router'
import React from 'react'

import PublicCalendar, {
  PublicCalendarProps,
} from '../../components/public-calendar'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { getAccount } from '../../utils/api_helper'
import { AccountNotFoundError } from '../../utils/errors'
import { isProAccount } from '../../utils/subscription_manager'
import { isValidEVMAddress } from '../../utils/validations'

const Schedule: NextPage<PublicCalendarProps> = props => (
  <PublicCalendar {...props} />
)

const EnhancedSchedule: NextPage = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const serverSide = Boolean(ctx.res)

  const redirectTo404 = () => {
    if (serverSide) {
      ctx.res!.writeHead(302, {
        Location: '/404',
      })
      ctx.res!.end()
    } else {
      Router.replace('404')
    }
  }

  const address = ctx.query.address

  if (!address || !address[0] || !isValidEVMAddress(address[0])) {
    return redirectTo404()
  }

  try {
    const account = await getAccount(address[0])

    if (account.is_invited) {
      return redirectTo404()
    }
    if (!isValidEVMAddress(address[0]) && !isProAccount(account)) {
      return redirectTo404()
    }

    const host = ctx.req?.headers.host
    const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

    return { currentUrl, account, serverSideRender: serverSide }
  } catch (e) {
    if (!(e instanceof AccountNotFoundError) && !serverSide) {
      // does sentry work on the server side?
      Sentry.captureException(e)
    }

    return redirectTo404()
  }
}

export default EnhancedSchedule
