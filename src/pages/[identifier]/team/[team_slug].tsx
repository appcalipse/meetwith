import * as Sentry from '@sentry/nextjs'
import { NextPage } from 'next'
import React from 'react'

import PublicCalendar from '@/components/public-calendar'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { Account } from '@/types/Account'
import { getAccount } from '@/utils/api_helper'
import { getOrganization } from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'
import redirectTo from '@/utils/redirect'
import { isProAccount } from '@/utils/subscription_manager'
import { isValidEVMAddress } from '@/utils/validations'

interface ScheduleProps {
  currentUrl: string
  account: Account
  serverSideRender: boolean
}

const Schedule: NextPage<ScheduleProps> = ({ currentUrl, ...rest }) => {
  return <PublicCalendar {...rest} url={currentUrl} />
}

const EnhancedSchedule = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const address = ctx.query.identifier as string

  const serverSide = Boolean(ctx.res)

  if (!address) {
    return redirectTo('/404', 302, ctx)
  }

  if (isValidEVMAddress(address)) {
    const newLocation = `/address/${address}`
    return redirectTo(newLocation, 302, ctx)
  }

  const host = ctx.req?.headers.host
  const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

  try {
    const account = await getAccount(address)

    if (account.is_invited || !isProAccount(account)) {
      return redirectTo('/404', 302, ctx)
    }

    return { currentUrl, account, serverSideRender: serverSide }
  } catch (e) {
    if (!(e instanceof AccountNotFoundError)) {
      Sentry.captureException(e)
    }
  }

  try {
    const organization = await getOrganization(address)

    return { currentUrl, organization, serverSideRender: serverSide }
  } catch (e) {
    if (!(e instanceof AccountNotFoundError)) {
      Sentry.captureException(e)
    }
  }

  return redirectTo('/404', 302, ctx)
}

export default EnhancedSchedule
