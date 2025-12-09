import { Grid } from '@chakra-ui/layout'
import { DateTime, Interval } from 'luxon'
import * as React from 'react'

import {
  useCalendarContext,
  WithInterval,
} from '@/providers/calendar/CalendarContext'
import { UnifiedEvent } from '@/types/Calendar'
import { MeetingDecrypted } from '@/types/Meeting'

import Event from './Event'

interface DayItemProps {
  time: DateTime
  allSlotsForDay: Array<
    WithInterval<UnifiedEvent<DateTime> | MeetingDecrypted<DateTime>>
  >
}

const DayItem: React.FC<DayItemProps> = ({ time, allSlotsForDay }) => {
  const { calculateSlotForInterval, getSlotBgColor } = useCalendarContext()
  const interval = Interval.fromDateTimes(
    time,
    time.plus({
      hours: 1,
    })
  )
  const slots = calculateSlotForInterval(interval)
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
          slot={slot}
          allSlotsForDay={allSlotsForDay}
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
