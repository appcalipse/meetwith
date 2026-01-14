import { NextPage } from 'next'
import ScheduleMain from '@/components/schedule/ScheduleMain'
import { AvailabilityTrackerProvider } from '@/components/schedule/schedule-time-discover/AvailabilityTracker'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { Intents } from '@/types/Dashboard'

export interface IInitialProps {
  groupId?: string
  intent?: Intents
  meetingId?: string
  contactId?: string
  pollId?: string
  seriesId?: string
  conferenceId?: string
}

const Schedule: NextPage<IInitialProps> = ({
  groupId,
  intent,
  meetingId,
  contactId,
  pollId,
  conferenceId,
  seriesId,
}) => {
  return (
    <ScheduleStateProvider>
      <ParticipantsProvider>
        <AvailabilityTrackerProvider>
          <NavigationProvider>
            <PermissionsProvider>
              <ScheduleMain
                groupId={groupId}
                intent={intent}
                meetingId={meetingId}
                contactId={contactId}
                pollId={pollId}
                conferenceId={conferenceId}
                seriesId={seriesId}
              />
            </PermissionsProvider>
          </NavigationProvider>
        </AvailabilityTrackerProvider>
      </ParticipantsProvider>
    </ScheduleStateProvider>
  )
}

const EnhancedSchedule: NextPage = withLoginRedirect(
  forceAuthenticationCheck(Schedule)
)

EnhancedSchedule.getInitialProps = async ctx => {
  const {
    groupId,
    intent,
    meetingId,
    contactId,
    pollId,
    conferenceId,
    seriesId,
  } = ctx.query
  return {
    groupId,
    intent,
    meetingId,
    contactId,
    pollId,
    conferenceId,
    seriesId,
  }
}

export default withLoginRedirect(EnhancedSchedule)
