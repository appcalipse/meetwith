import { Flex } from '@chakra-ui/layout'
import { useMediaQuery } from '@chakra-ui/media-query'
import * as React from 'react'

import { CalendarProvider } from '@/providers/calendar/CalendarContext'
import { NavigationProvider } from '@/providers/schedule/NavigationContext'
import { ParticipantsProvider } from '@/providers/schedule/ParticipantsContext'
import { PermissionsProvider } from '@/providers/schedule/PermissionsContext'
import { ScheduleStateProvider } from '@/providers/schedule/ScheduleContext'

import ActiveEvent from './ActiveEvent'
import Calendar from './Calendar'
import Header from './Header'
import Sidebar from './Sidebar'

interface CalendarViewProps {
  test?: string
}

const CalendarView: React.FC<CalendarViewProps> = ({}) => {
  const [mounted, setMounted] = React.useState(false)
  const [isLargerThan800] = useMediaQuery('(min-width: 800px)')

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <CalendarProvider>
      <Flex
        flexDir={{
          base: 'column',
          md: 'row',
        }}
        align="start"
        gap={0}
        w="100%"
        overflowX="clip"
      >
        {mounted && (isLargerThan800 ? <Sidebar /> : <Header />)}
        <Calendar />
      </Flex>
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
