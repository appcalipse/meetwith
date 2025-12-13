import { Grid, GridItem, Text } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'

import CalendarItem from './CalendarItem'

const CalendarItems: React.FC = () => {
  const { currrentDate } = useCalendarContext()
  const weekOffset = React.useRef(0)
  const [isTransitioning, setIsTransitioning] = React.useState(false)

  const currentWeek = currrentDate.startOf('week')
  const previousWeek = React.useRef(currentWeek)

  React.useEffect(() => {
    if (!previousWeek.current.equals(currentWeek)) {
      setIsTransitioning(true)
      weekOffset.current =
        currentWeek.diff(previousWeek.current, 'weeks').weeks * 100

      // Smooth transition
      setTimeout(() => {
        previousWeek.current = currentWeek
        weekOffset.current = 0
        setIsTransitioning(false)
      }, 200)
    }
  }, [currentWeek])

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
    <Grid templateColumns="minmax(45px, 70px) repeat(7, 1fr)" h="100%">
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
    {timeSlots.map((timeSlot, index) => (
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
      borderColor="neutral.700"
      bg="neutral.825"
    >
      <Text top={'-13px'} pos="absolute" zIndex={2} textAlign="center" w="100%">
        {timeSlot.toFormat('h a')}
      </Text>
    </GridItem>
  )
}

export default CalendarItems
