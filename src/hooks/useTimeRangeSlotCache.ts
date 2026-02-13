import { DateTime, Interval } from 'luxon'
import { useMemo } from 'react'

/**
 * Generates time slots for time range mode, anchored to the selected range
 */
const useTimeRangeSlotCache = (
  startTime: string,
  endTime: string,
  timezone: string
) => {
  return useMemo(() => {
    const slots: Array<Interval<true>> = []
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const [endHours, endMinutes] = endTime.split(':').map(Number)

    const templateDay = DateTime.fromObject(
      { day: 1, month: 1, year: 2000 },
      { zone: timezone }
    )
    const dayStart = templateDay.startOf('day')
    const dayEnd = templateDay.endOf('day')

    const rangeStartMinutes = startHours * 60 + startMinutes
    const rangeEndMinutes = endHours * 60 + endMinutes
    const rangeDurationMinutes = rangeEndMinutes - rangeStartMinutes
    if (rangeDurationMinutes <= 0) return slots

    const rangeStart = templateDay.plus({ minutes: rangeStartMinutes })
    const rangeEnd = templateDay.plus({ minutes: rangeEndMinutes })

    const beforeSlots: Interval<true>[] = []
    let current = rangeStart

    while (current > dayStart) {
      const slotEnd = current
      let slotStart = current.minus({ minutes: rangeDurationMinutes })
      if (slotStart < dayStart) slotStart = dayStart
      const slot = Interval.fromDateTimes(slotStart, slotEnd)
      if (slot.isValid && slot.length('minutes') > 0) beforeSlots.unshift(slot)
      current = slotStart
      if (current <= dayStart) break
    }

    slots.push(...beforeSlots)
    const rangeSlot = Interval.fromDateTimes(rangeStart, rangeEnd)
    if (rangeSlot.isValid) slots.push(rangeSlot)

    let currentAfter = rangeEnd
    while (currentAfter < dayEnd) {
      const slotStart = currentAfter
      let slotEnd = currentAfter.plus({ minutes: rangeDurationMinutes })
      if (slotEnd > dayEnd) slotEnd = dayEnd
      const slot = Interval.fromDateTimes(slotStart, slotEnd)
      if (slot.isValid && slot.length('minutes') > 0) slots.push(slot)
      currentAfter = slotEnd
      if (currentAfter >= dayEnd) break
    }

    return slots
  }, [startTime, endTime, timezone])
}

export default useTimeRangeSlotCache
