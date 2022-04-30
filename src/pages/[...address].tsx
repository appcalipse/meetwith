import * as Sentry from '@sentry/browser'
import { NextPage } from 'next'
import Router from 'next/router'
import React from 'react'

import PublicCalendar from '../components/public-calendar'
import { Account } from '../types/Account'
import { getAccount } from '../utils/api_helper'
import { AccountNotFoundError } from '../utils/errors'
import { isValidEVMAddress } from '../utils/validations'

interface ScheduleProps {
  currentUrl: string
  account: Account
  serverSideRender: boolean
}

const Schedule: NextPage<ScheduleProps | void> = props => {
  if (!props) {
    return null
  }

  const { currentUrl, ...rest } = props
  return <PublicCalendar {...rest} url={currentUrl} />
}

Schedule.getInitialProps = async ctx => {
  const address = ctx.query.address
  const serverSide = Boolean(ctx.res)

  const redirectTo = (path: string) => {
    if (serverSide) {
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

export default Schedule
