import { Grid, GridItem, Text } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import CalendarItem from './CalendarItem'

const CalendarItems: React.FC = () => {
  const { currrentDate } = useCalendarContext()

  const timeSlots = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) =>
        DateTime.fromObject({ hour: i, minute: 0 })
      ),
    []
  )

  const days = React.useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        currrentDate.startOf('week').plus({ days: index }).startOf('day')
      ),
    [currrentDate]
  )

  return (
    <Grid
      templateColumns="minmax(40px, 50px) repeat(7, 1fr)"
      h="100%"
      bg="bg-surface-event"
    >
      <TimeColumn timeSlots={timeSlots} />
      {days.map((day, dayIndex) => (
        <CalendarItem
          key={day.toISODate()} // Use ISO date for stable keys
          dayIndex={dayIndex}
          timeSlot={day}
        />
      ))}
    </Grid>
  )
}

const TimeColumn = ({ timeSlots }: { timeSlots: DateTime[] }) => (
  <Grid templateRows="repeat(1fr)">
    {timeSlots.map(timeSlot => (
      <TimeSlot key={timeSlot.hour} timeSlot={timeSlot} />
    ))}
  </Grid>
)

const TimeSlot: React.FC<{ timeSlot: DateTime }> = ({ timeSlot }) => {
  return (
    <GridItem
      pos="relative"
      minH="35px"
      borderInline="1px solid"
      borderColor="border-subtle"
      bg="bg-event"
      color={timeSlot.hour === 0 ? 'transparent' : undefined}
    >
      <Text
        top={'-10px'}
        pos="absolute"
        zIndex={2}
        textAlign="center"
        w="100%"
        fontSize={'12px'}
        fontWeight={500}
        userSelect="none"
      >
        {timeSlot.toFormat('h a')}
      </Text>
    </GridItem>
  )
}

export default CalendarItems
