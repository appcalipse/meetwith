import { Box } from '@chakra-ui/layout'
import * as React from 'react'

import CalendarHeader from './CalendarHeader'
import CalendarItems from './CalendarItems'

interface CalendarProps {
  startDate?: string
}

const Calendar: React.FC<CalendarProps> = () => {
  return (
    <Box width="100%" roundedRight={'md'} overflow="hidden">
      <CalendarHeader />
      <CalendarItems />
    </Box>
  )
}

export default Calendar
