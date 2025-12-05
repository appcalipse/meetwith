import { Grid, GridItem } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

interface CalendarItemProps {
  timeSlot: DateTime
  dayIndex: number
}

const CalendarItem: React.FC<CalendarItemProps> = ({ timeSlot, dayIndex }) => {
  const days = Array.from({
    length: 7,
  }).map((_, index) => {
    return DateTime.now().plus({ days: index })
  })
  const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
    DateTime.fromObject({ hour: i, minute: 0 })
  )
  return (
    <Grid templateRows="repeat(1fr)">
      {TIME_SLOTS.map((_, timeIndex) => (
        <GridItem
          key={`${dayIndex}-${timeIndex}`}
          border="1px solid"
          borderColor="neutral.700"
          bg={dayIndex % 2 === 0 ? 'neutral.825' : 'neutral.950'}
          minH="36px"
          cursor="pointer"
          _hover={{
            borderColor: 'primary.600',
            borderWidth: '2px',
          }}
        >
          {/* Placeholder for events */}
        </GridItem>
      ))}
    </Grid>
  )
}

export default CalendarItem
