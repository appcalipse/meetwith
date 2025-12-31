import { Grid, GridItem } from '@chakra-ui/layout'
import { DateTime } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { UnifiedEvent, WithInterval } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'

import Event from './Event'

interface CalendarItemProps {
  timeSlot: DateTime
  dayIndex: number
}

const CalendarItem: React.FC<CalendarItemProps> = ({ timeSlot, dayIndex }) => {
  const { eventIndex } = useCalendarContext()
  const { getSlotBgColor } = useCalendarContext()

  const TIME_SLOTS = React.useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) =>
        timeSlot.set({ hour: i, minute: 0 })
      ),
    [timeSlot]
  )
  const dayEvents = React.useMemo(() => {
    const dayStart = timeSlot.startOf('day')
    return eventIndex.dayIndex.get(dayStart.toISODate()!) || []
  }, [timeSlot, eventIndex])

  return (
    <Grid templateRows="repeat(1fr)" position="relative">
      {TIME_SLOTS.map((time, timeIndex) => (
        <TimeSlotItem
          key={timeIndex}
          time={time}
          hourEvents={eventIndex.hourIndex.get(time.toISO()!) || []}
          dayEvents={dayEvents}
          dayIndex={dayIndex}
          getSlotBgColor={getSlotBgColor}
          timeIndex={timeIndex}
        />
      ))}
    </Grid>
  )
}
const TimeSlotItem: React.FC<{
  time: DateTime
  dayIndex: number
  timeIndex: number
  getSlotBgColor: (calId: string) => string
  hourEvents: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
  dayEvents: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
}> = ({ time, dayIndex, timeIndex, hourEvents, dayEvents, getSlotBgColor }) => {
  const ref = React.useRef<HTMLDivElement>(null)
  return (
    <GridItem
      border="1px solid"
      borderColor="border-subtle"
      bg={dayIndex % 2 === 0 ? 'bg-event' : 'bg-event-alternate'}
      height="40px"
      cursor="pointer"
    >
      <Grid
        templateColumns={`repeat(${hourEvents.length}, minmax(0, 1fr))`}
        w="100%"
        h="100%"
        gap={0.5}
        ref={ref}
      >
        {hourEvents.map(event => (
          <Event
            key={`${event.id}-${time.toISO()}`}
            event={event}
            dayEvents={dayEvents}
            timeSlot={time}
            bg={
              'calendarId' in event
                ? getSlotBgColor(event.calendarId)
                : '#FEF0EC'
            }
          />
        ))}
      </Grid>
    </GridItem>
  )
}
export default CalendarItem
