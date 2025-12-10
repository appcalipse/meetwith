import { HStack } from '@chakra-ui/layout'
import * as React from 'react'

import { CalendarProvider } from '@/providers/calendar/CalendarContext'

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
      {/*<ActiveEvent />*/}
    </CalendarProvider>
  )
}

export default CalendarView
