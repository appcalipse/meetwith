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

import { DayAvailability } from '@/types/Account'

export const generateTimeSlots = (
  selectedDate: Date,
  slotSizeMinutes: number,
  fromStartDate: boolean,
  endDate?: Date
): Interval[] => {
  const _isToday = isToday(selectedDate)

  let start = new Date(selectedDate)

  if (!fromStartDate && _isToday) {
    start.setHours(0, 0, 0, 0)
    const now = new Date()
    const offsetHours = getHours(now)

    // "Pad" the start time with the amount of hours of the current time, to
    // prevent rendering time slots of the past
    start = addHours(start, offsetHours)

    // The start positions might still be in the past in terms of minutes
    // So "pad" the start time with the slot size, to prevent rendering time
    // slots of the past
    while (start <= now) {
      start = addMinutes(start, slotSizeMinutes)
    }
  } else if (fromStartDate) {
    start.setMinutes(0)
    start.setSeconds(0)
    start.setMilliseconds(0)
  }

  const end = endDate || addDays(selectedDate, 1)

  let slot = { start, end: addMinutes(start, slotSizeMinutes) }
  const timeSlots: Interval[] = []
  while (slot.start < end) {
    timeSlots.push(slot)
    slot = {
      start: addMinutes(slot.start, slotSizeMinutes),
      end: addMinutes(slot.end, slotSizeMinutes),
    }
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
