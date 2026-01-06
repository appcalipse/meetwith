import { NextPage } from 'next'

import { AvailabilityTrackerProvider } from '@/components/schedule/schedule-time-discover/AvailabilityTracker'
import ScheduleMain from '@/components/schedule/ScheduleMain'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { Intents } from '@/types/Dashboard'

interface IInitialProps {
  groupId?: string
  intent?: Intents
  meetingId?: string
  contactId?: string
  pollId?: string
  conferenceId?: string
}

const Schedule: NextPage<IInitialProps> = ({
  groupId,
  intent,
  meetingId,
  contactId,
  pollId,
  conferenceId,
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
  const { groupId, intent, meetingId, contactId, pollId, conferenceId } =
    ctx.query
  return { groupId, intent, meetingId, contactId, pollId, conferenceId }
}

export default withLoginRedirect(EnhancedSchedule)
