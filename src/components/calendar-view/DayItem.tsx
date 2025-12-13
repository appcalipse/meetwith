import { Grid } from '@chakra-ui/layout'
import { DateTime, Interval } from 'luxon'
import * as React from 'react'

import { useCalendarContext } from '@/providers/calendar/CalendarContext'
import { UnifiedEvent, WithInterval } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'

import Event from './Event'

interface DayItemProps {
  time: DateTime
  allSlotsForDay: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
}

const DayItem: React.FC<DayItemProps> = ({ time, allSlotsForDay }) => {
  const { getSlotBgColor } = useCalendarContext()
  const interval = Interval.fromDateTimes(
    time,
    time.plus({
      hours: 1,
    })
  )
  const slots = React.useMemo(() => {
    if (!interval.start) return []

    return allSlotsForDay.filter(event => interval.contains(event.start))
  }, [])
  return slots.length > 0 ? (
    <Grid
      templateColumns={`repeat(${slots.length}, minmax(0, 1fr))`}
      w="100%"
      h="100%"
      gap={0.5}
    >
      {slots.map(slot => (
        <Event
          key={slot.id}
          event={slot}
          dayEvents={allSlotsForDay}
          timeSlot={time}
          bg={
            'calendarId' in slot ? getSlotBgColor(slot.calendarId) : '#FEF0EC'
          }
        />
      ))}
    </Grid>
  ) : null
}

export default DayItem
