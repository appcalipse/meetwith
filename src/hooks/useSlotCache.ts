import { DateTime, Interval } from 'luxon'
import { useMemo } from 'react'

import { TimeRangeFilter } from '@/types/schedule'
import { filterSlotsByTimeRange } from '@/utils/slots.helper'

// Cache slots by duration+timezone
const useSlotCache = (
  duration: number,
  timezone: string,
  timeRangeFilter?: TimeRangeFilter | null
) => {
  return useMemo(() => {
    const slots: Array<Interval<true>> = []
    const slotsPerHour = 60 / (duration || 30)
    const totalSlots = 24 * slotsPerHour

    // Create slots for a "template" day (2000-01-01)
    const templateDay = DateTime.fromObject(
      { year: 2000, month: 1, day: 1 },
      { zone: timezone }
    )

    for (let i = 0; i < totalSlots; i++) {
      const minutesFromStart = i * (duration || 30)
      const start = templateDay.plus({ minutes: minutesFromStart })
      const slot = Interval.after(start, { minutes: duration || 30 })
      if (slot.isValid) slots.push(slot)
    }

    if (timeRangeFilter) {
      return filterSlotsByTimeRange(slots, timeRangeFilter, timezone)
    }

    return slots
  }, [duration, timezone, timeRangeFilter])
}

export default useSlotCache
