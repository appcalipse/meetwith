import { Grid, GridItem, Text } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import CalendarItem from './CalendarItem'

const CalendarItems: React.FC = () => {
  const { currrentDate } = useCalendarContext()
  const startOfWeek = currrentDate.startOf('week')

  const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
    DateTime.fromObject({ hour: i, minute: 0 })
  )
  const days = Array.from({
    length: 7,
  }).map((_, index) => {
    return startOfWeek.plus({ days: index }).startOf('day')
  })
  return (
    <Grid templateColumns="minmax(45px, 70px) repeat(7, 1fr)" h="100%">
      <Grid templateRows="repeat(1fr)">
        {TIME_SLOTS.map((timeSlot, index) => (
          <GridItem
            pos="relative"
            minH="35px"
            borderInline="1px solid"
            borderColor="neutral.700"
            bg="neutral.825"
            key={index}
          >
            <Text
              top={'-13px'}
              pos="absolute"
              zIndex={2}
              textAlign="center"
              w="100%"
            >
              {timeSlot.toFormat('h a')}
            </Text>
          </GridItem>
        ))}
      </Grid>
      {days.map((day, dayIndex) => (
        <CalendarItem
          key={`${dayIndex}-${day.toMillis()}`}
          dayIndex={dayIndex}
          timeSlot={day}
        />
      ))}
    </Grid>
  )
}

export default CalendarItems
