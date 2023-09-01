import { NextPage } from 'next'
import React from 'react'

import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { EditMode } from '@/types/Dashboard'
import redirectTo from '@/utils/redirect'

const Dashboard: NextPage = () => {
  return <></>
}

const EnhancedDashboard: NextPage = withLoginRedirect(
  forceAuthenticationCheck(Dashboard)
)

EnhancedDashboard.getInitialProps = async ctx => {
  return redirectTo(`/dashboard/${EditMode.MEETINGS}`, 302, ctx)
}

export default EnhancedDashboard
