import * as Sentry from '@sentry/nextjs'
import { NextPage } from 'next'

import PublicPage from '@/components/public-meeting'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { Account } from '@/types/Account'
import { getAccount } from '@/utils/api_helper'
import { AccountNotFoundError } from '@/utils/errors'
import redirectTo from '@/utils/redirect'

interface ScheduleProps {
  currentUrl: string
  account: Account
  serverSideRender: boolean
}

const Schedule: NextPage<ScheduleProps> = ({ currentUrl, ...rest }) => (
  <PublicPage {...rest} url={currentUrl} />
)

const EnhancedSchedule: NextPage = forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const address = ctx.query.address

  if (!address || !address[0]) {
    return redirectTo('/404', 302, ctx)
  }

  try {
    const account = await getAccount(address[0])

    if (account.is_invited) {
      return redirectTo('/404', 302, ctx)
    }

    const host = ctx.req?.headers.host
    const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

    return { currentUrl, account, serverSideRender: Boolean(ctx.res) }
  } catch (e) {
    if (!(e instanceof AccountNotFoundError)) {
      Sentry.captureException(e)
    }

    return redirectTo('/404', 302, ctx)
  }
}

export default EnhancedSchedule
