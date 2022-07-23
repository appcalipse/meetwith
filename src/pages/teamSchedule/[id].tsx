import { isPast } from 'date-fns'
import { NextPage } from 'next'

import PublicCalendar from '@/components/public-calendar'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { Account } from '@/types/Account'
import { TeamMeetingRequest } from '@/types/Meeting'
import { getTeamMeetingRequest } from '@/utils/api_helper'
import redirectTo from '@/utils/redirect'

interface ScheduleProps {
  currentUrl: string
  teamMeetingRequest: TeamMeetingRequest
  account: Account
  serverSideRender: boolean
}

const Schedule: NextPage<ScheduleProps> = ({ currentUrl, ...rest }) => (
  <PublicCalendar {...rest} url={currentUrl} />
)

const TeamMeetingSchedule: NextPage = forceAuthenticationCheck(Schedule)

TeamMeetingSchedule.getInitialProps = async ctx => {
  const id = ctx.query.id

  if (!id) {
    return redirectTo('/404', 302, ctx)
  }

  const teamMeetingRequest = await getTeamMeetingRequest(id as string)

  if (!teamMeetingRequest) {
    return redirectTo('/404', 302, ctx)
  } else if (
    teamMeetingRequest.range_end &&
    isPast(new Date(teamMeetingRequest.range_end))
  ) {
    return redirectTo('/404', 302, ctx)
  }

  const host = ctx.req?.headers.host
  const currentUrl = host && ctx.asPath ? host + ctx.asPath : ''

  return { currentUrl, teamMeetingRequest, serverSideRender: Boolean(ctx.res) }
}

export default TeamMeetingSchedule
