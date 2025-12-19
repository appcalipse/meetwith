import { HStack } from '@chakra-ui/layout'
import * as React from 'react'

import { CalendarProvider } from '@/providers/calendar/CalendarContext'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'

import ActiveEvent from './ActiveEvent'
import Calendar from './Calendar'
import Sidebar from './Sidebar'

interface CalendarViewProps {
  test?: string
}

const CalendarView: React.FC<CalendarViewProps> = ({}) => {
  return (
    <CalendarProvider>
      <HStack align="start" gap={0} w="100%" overflowX="hidden">
        <Sidebar />
        <Calendar />
      </HStack>
      <PermissionsProvider>
        <NavigationProvider>
          <ParticipantsProvider>
            <ScheduleStateProvider>
              <ActiveEvent />
            </ScheduleStateProvider>
          </ParticipantsProvider>
        </NavigationProvider>
      </PermissionsProvider>
    </CalendarProvider>
  )
}

export default CalendarView
