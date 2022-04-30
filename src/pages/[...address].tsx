//TODO: should we migrate to @sentry/nextjs?
import * as Sentry from '@sentry/browser'
import { NextPage } from 'next'
import Router from 'next/router'
import React from 'react'

import PublicCalendar from '../components/public-calendar'
import { forceAuthenticationCheck } from '../session/forceAuthenticationCheck'
import { Account } from '../types/Account'
import { getAccount } from '../utils/api_helper'
import { AccountNotFoundError } from '../utils/errors'
import { isProAccount } from '../utils/subscription_manager'
import { isValidEVMAddress } from '../utils/validations'

interface ScheduleProps {
  currentUrl: string
  account: Account
  serverSideRender: boolean
}

const Schedule: NextPage<ScheduleProps> = ({ currentUrl, ...rest }) => {
  return <PublicCalendar {...rest} url={currentUrl} />
}

//TODO: why do we force authentication here?
const EnhancedSchedule = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const address = ctx.query.address
  const serverSide = Boolean(ctx.res)

  const redirectTo = (path: string) => {
    if (serverSide) {
      //TODO: when redirecting to 404, should I use which code here? 302 seems appropriate
      ctx.res!.writeHead(302, {
        Location: path,
      })
      ctx.res!.end()
    } else {
      Router.replace(path)
    }
    return
  }

  if (!address || !address[0]) {
    return redirectTo('/404')
  }

  if (isValidEVMAddress(address[0])) {
    const newLocation = `/address/${address[0]}`
    return redirectTo(newLocation)
  }

  try {
    const account = await getAccount(address[0])

    //TODO: what this is_invited means?
    if (account.is_invited || !isProAccount(account)) {
      return redirectTo('/404')
    }

    const host = ctx.req?.headers.host
    const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

    return { currentUrl, account, serverSideRender: serverSide }
  } catch (e) {
    if (!(e instanceof AccountNotFoundError)) {
      Sentry.captureException(e)
    }

    return redirectTo('/404')
  }
}

export default EnhancedSchedule
