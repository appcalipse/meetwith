import { NextPage } from 'next'
import React from 'react'

import ScheduleMain from '@/components/schedule/ScheduleMain'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'
import { forceAuthenticationCheck } from '@/session/forceAuthenticationCheck'
import { withLoginRedirect } from '@/session/requireAuthentication'
import { Intents } from '@/types/Dashboard'

interface IInitialProps {
  groupId: string
  intent: Intents
  meetingId: string
  contactId: string
}

const Schedule: NextPage<IInitialProps> = ({
  groupId,
  intent,
  meetingId,
  contactId,
}) => {
  return (
    <ScheduleStateProvider>
      <ParticipantsProvider>
        <NavigationProvider>
          <PermissionsProvider>
            <ScheduleMain
              groupId={groupId}
              intent={intent}
              meetingId={meetingId}
              contactId={contactId}
            />
          </PermissionsProvider>
        </NavigationProvider>
      </ParticipantsProvider>
    </ScheduleStateProvider>
  )
}

const EnhancedSchedule: NextPage = withLoginRedirect(
  forceAuthenticationCheck(Schedule)
)

EnhancedSchedule.getInitialProps = async ctx => {
  const { groupId, intent, meetingId, contactId } = ctx.query
  return { groupId, intent, meetingId, contactId }
}

export default withLoginRedirect(EnhancedSchedule)
