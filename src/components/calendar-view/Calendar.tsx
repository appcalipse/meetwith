import { Box } from '@chakra-ui/layout'
import * as React from 'react'

import CalendarHeader from './CalendarHeader'
import CalendarItems from './CalendarItems'

interface CalendarProps {
  startDate?: string
}

const Calendar: React.FC<CalendarProps> = () => {
  return (
    <Box width="100%" roundedRight={'md'} height="100%" minH={'100vh'}>
      <CalendarHeader />
      <CalendarItems />
    </Box>
  )
}

export default Calendar
