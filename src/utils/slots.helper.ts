import {
  addDays,
  addHours,
  addMinutes,
  compareAsc,
  format,
  getDay,
  getHours,
  Interval,
  isAfter,
  isToday,
} from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { DateTime, Interval as LuxonInterval } from 'luxon'

import { DayAvailability } from '@/types/Account'

export const generateTimeSlots = (
  selectedDate: Date,
  slotSizeMinutes: number,
  fromStartDate: boolean,
  timezone: string,
  endDate?: Date
): Interval[] => {
  // Convert to Luxon DateTime in the specified timezone
  const selectedDateTime = DateTime.fromJSDate(selectedDate).setZone(timezone)
  const _isToday = selectedDateTime.hasSame(
    DateTime.now().setZone(timezone),
    'day'
  )

  let start = selectedDateTime.startOf('day')

  if (!fromStartDate && _isToday) {
    const now = DateTime.now().setZone(timezone)
    // Start from current hour to avoid past slots
    start = now.startOf('hour')

    // Round up to next slot boundary
    const minutesToAdd = slotSizeMinutes - (start.minute % slotSizeMinutes)
    if (minutesToAdd !== slotSizeMinutes) {
      start = start.plus({ minutes: minutesToAdd })
    }

    // Ensure we're not in the past
    while (start <= now) {
      start = start.plus({ minutes: slotSizeMinutes })
    }
  } else if (fromStartDate) {
    start = selectedDateTime.startOf('hour')
  }

  const end = endDate
    ? DateTime.fromJSDate(endDate).setZone(timezone)
    : selectedDateTime.plus({ days: 1 }).startOf('day')

  const timeSlots: Interval[] = []
  let current = start

  while (current < end) {
    const slotEnd = current.plus({ minutes: slotSizeMinutes })

    timeSlots.push({ start: current.toJSDate(), end: slotEnd.toJSDate() })

    current = slotEnd
  }

  return timeSlots
}

export const isSlotAvailable = (
  slotDurationInMinutes: number,
  minAdvanceTime: number,
  slotTime: Date,
  busySlots: Interval[],
  availabilities: DayAvailability[],
  userSchedulingTimezone: string,
  targetTimezone: string
): boolean => {
  const start = slotTime

  if (isAfter(addMinutes(new Date(), minAdvanceTime), start)) {
    return false
  }

  const end = addMinutes(start, slotDurationInMinutes)

  const startOnUTC = zonedTimeToUtc(start, userSchedulingTimezone)
  const startForTarget = utcToZonedTime(startOnUTC, targetTimezone)

  const endOnUTC = zonedTimeToUtc(end, userSchedulingTimezone)
  const endForTarget = utcToZonedTime(endOnUTC, targetTimezone)

  if (
    !isTimeInsideAvailabilities(startForTarget, endForTarget, availabilities)
  ) {
    return false
  }

  const filtered = busySlots.filter(
    slot =>
      (compareAsc(slot.start, startOnUTC) >= 0 &&
        compareAsc(slot.end, endOnUTC) <= 0) ||
      (compareAsc(slot.start, startOnUTC) <= 0 &&
        compareAsc(slot.end, endOnUTC) >= 0) ||
      (compareAsc(slot.end, startOnUTC) > 0 &&
        compareAsc(slot.end, endOnUTC) <= 0) ||
      (compareAsc(slot.start, startOnUTC) >= 0 &&
        compareAsc(slot.start, endOnUTC) < 0)
  )

  return filtered.length == 0
}

export const isTimeInsideAvailabilities = (
  startOnTargetTimezone: Date,
  endOnTargetTimezone: Date,
  targetAvailabilities: DayAvailability[]
): boolean => {
  const startTime = format(startOnTargetTimezone, 'HH:mm')
  let endTime = format(endOnTargetTimezone, 'HH:mm')
  if (endTime === '00:00') {
    endTime = '24:00'
  }

  const compareTimes = (t1: string, t2: string) => {
    const [h1, m1] = t1.split(':')
    const [h2, m2] = t2.split(':')

    if (h1 !== h2) {
      return h1 > h2 ? 1 : -1
    }

    if (m1 !== m2) {
      return m1 > m2 ? 1 : -1
    }

    return 0
  }

  //After midnight
  if (compareTimes(startTime, endTime) > 0) {
    endTime = `${getHours(endOnTargetTimezone) + 24}:00`
  }

  for (const availability of targetAvailabilities) {
    if (availability.weekday === getDay(startOnTargetTimezone)) {
      for (const range of availability.ranges) {
        if (compareTimes(startTime, range.start) >= 0) {
          if (compareTimes(endTime, range.end) <= 0) {
            return true
          }
        }
      }
    }
  }

  return false
}

export const getBlockedAvailabilities = (
  availabilities?: DayAvailability[]
): DayAvailability[] => availabilities?.filter(_ => _.ranges.length === 0) ?? []

export const getAvailabilitiesForWeekDay = (
  availabilities?: DayAvailability[],
  day?: Date
) => availabilities?.find(_ => !!day && _.weekday === getDay(day))?.ranges ?? []
