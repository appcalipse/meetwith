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
      <HStack align="start" gap={0}>
        <Sidebar />
        <Calendar />
      </HStack>
    </CalendarProvider>
  )
}

export default CalendarView
