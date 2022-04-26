import { NextPage } from 'next'
import React from 'react'

import PublicCalendar from '../../components/public-calendar'
import { forceAuthenticationCheck } from '../../session/forceAuthenticationCheck'

interface ScheduleProps {
  currentUrl?: string
}

const Schedule: NextPage<ScheduleProps> = props => (
  <PublicCalendar url={props.currentUrl} />
)

const EnhancedSchedule: NextPage<ScheduleProps> =
  forceAuthenticationCheck(Schedule)

EnhancedSchedule.getInitialProps = async ctx => {
  const host = ctx.req?.headers.host

  return { currentUrl: host && ctx.asPath ? host + ctx.asPath : undefined }
}

export default EnhancedSchedule
