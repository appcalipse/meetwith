import { HStack } from '@chakra-ui/layout'
import * as React from 'react'

import Calendar from './Calendar'
import Sidebar from './Sidebar'

interface CalendarViewProps {
  test?: string
}

const CalendarView: React.FC<CalendarViewProps> = ({}) => {
  return (
    <HStack>
      <Sidebar />
      <Calendar />
    </HStack>
  )
}

export default CalendarView
