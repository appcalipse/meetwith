import { Grid, GridItem } from '@chakra-ui/layout'
import { DateTime, Interval } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import DayItem from './DayItem'

interface CalendarItemProps {
  timeSlot: DateTime
  dayIndex: number
}

const CalendarItem: React.FC<CalendarItemProps> = ({ timeSlot, dayIndex }) => {
  const { calculateSlotForInterval } = useCalendarContext()
  const TIME_SLOTS = Array.from({ length: 24 }, (_, i) =>
    timeSlot.set({ hour: i, minute: 0 })
  )
  const allSlotsForDay = calculateSlotForInterval(
    Interval.fromDateTimes(timeSlot.startOf('day'), timeSlot.endOf('day'))
  )

  return (
    <Grid templateRows="repeat(1fr)" position="relative">
      {TIME_SLOTS.map((time, timeIndex) => (
        <GridItem
          key={`${dayIndex}-${timeIndex}`}
          border="1px solid"
          borderColor="neutral.700"
          bg={dayIndex % 2 === 0 ? 'neutral.825' : 'neutral.950'}
          height="36px"
          cursor="pointer"
          position="relative"
        >
          <DayItem time={time} allSlotsForDay={allSlotsForDay} />
        </GridItem>
      ))}
    </Grid>
  )
}

export default CalendarItem
