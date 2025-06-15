import PublicPage from '@components/public-meeting'
import { Account } from '@meta/Account'
import * as Sentry from '@sentry/nextjs'
import { getAccount } from '@utils/api_helper'
import { AccountNotFoundError } from '@utils/errors'
import { isProAccount } from '@utils/subscription_manager'
import { isValidEVMAddress } from '@utils/validations'
import { NextPage } from 'next'
import React from 'react'

import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import redirectTo from '@/utils/redirect'

interface ScheduleProps {
  currentUrl: string
  account: Account
  serverSideRender: boolean
}

const Schedule: NextPage<ScheduleProps> = ({ currentUrl, ...rest }) => {
  return <PublicPage {...rest} url={currentUrl} />
}

const EnhancedSchedule = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const address = ctx.query.address
  const serverSide = Boolean(ctx.res)

  if (!address || !address[0]) {
    return redirectTo('/404', 302, ctx)
  }

  if (isValidEVMAddress(address[0])) {
    const newLocation = `/address/${address[0]}`
    return redirectTo(newLocation, 302, ctx)
  }

  try {
    const account = await getAccount(address[0])

    if (account.is_invited || !isProAccount(account)) {
      return redirectTo('/404', 302, ctx)
    }

    const host = ctx.req?.headers.host
    const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

    return { currentUrl, account, serverSideRender: serverSide }
  } catch (e) {
    if (!(e instanceof AccountNotFoundError)) {
      Sentry.captureException(e)
    }

    return redirectTo('/404', 302, ctx)
  }
}

export default EnhancedSchedule
