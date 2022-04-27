import { NextPage } from 'next'
import React from 'react'

import PublicCalendar from '../../components/public-calendar'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'
import { Account } from '../../types/Account'
import { getAccount } from '../../utils/api_helper'
import { isValidEVMAddress } from '../../utils/validations'

interface ScheduleProps {
  currentUrl: string
  account: Account
}

const Schedule: NextPage<ScheduleProps> = props => (
  <PublicCalendar url={props.currentUrl} account={props.account} />
)

const EnhancedSchedule: NextPage = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const address = ctx.query.address

  if (address && address[0] && isValidEVMAddress(address[0])) {
    //TODO: handle when this fails
    const account = await getAccount(address[0])

    const host = ctx.req?.headers.host
    const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

    return { currentUrl, account }
  } else {
    //TODO: handle this
    throw Error('Unexpected behaviour')
  }
}

export default EnhancedSchedule
