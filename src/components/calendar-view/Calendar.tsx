import { Box } from '@chakra-ui/layout'
import { keyframes } from '@chakra-ui/react'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import CalendarHeader from './CalendarHeader'
import CalendarItems from './CalendarItems'

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const Calendar: React.FC = () => {
  const { isLoading } = useCalendarContext()
  return (
    <Box width="100%" roundedRight={'md'} pos="relative">
      {isLoading && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          height="4px"
          background="linear-gradient(90deg, transparent 0%, var(--chakra-colors-blue-500) 50%, transparent 100%)"
          backgroundSize="200% 100%"
          animation={`${shimmer} 3s ease-in-out infinite`}
          zIndex={10}
        />
      )}
      <CalendarHeader />
      <CalendarItems />
    </Box>
  )
}

export default Calendar
