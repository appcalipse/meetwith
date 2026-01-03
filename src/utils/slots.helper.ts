import { addMinutes, compareAsc, getDay, Interval, isAfter } from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { DateTime, Interval as LuxonInterval } from 'luxon'

import { Account, DayAvailability } from '@/types/Account'

import { parseMonthAvailabilitiesToDate } from './date_helper'

export const generateTimeSlots = (
  selectedDate: Date,
  slotSizeMinutes: number,
  fromStartDate: boolean,
  timezone = 'UTC',
  endDate?: Date
): LuxonInterval<true>[] => {
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

  const timeSlots: LuxonInterval[] = []
  let current = start

  while (current < end) {
    const slotEnd = current.plus({ minutes: slotSizeMinutes })

    timeSlots.push(LuxonInterval.fromDateTimes(current, slotEnd))

    current = slotEnd
  }

  return timeSlots.filter(val => val.isValid)
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
  targetAvailabilities: DayAvailability[],
  timezone?: string
): boolean => {
  const startTime = DateTime.fromJSDate(startOnTargetTimezone).setZone(timezone)
  const endTime = DateTime.fromJSDate(endOnTargetTimezone).setZone(timezone)
  const slots = parseMonthAvailabilitiesToDate(
    targetAvailabilities,
    startTime.toJSDate(),
    endTime.toJSDate(),
    timezone || 'UTC'
  )
  return slots.some(slot =>
    slot.overlaps(LuxonInterval.fromDateTimes(startTime, endTime))
  )
}

export const getBlockedAvailabilities = (
  availabilities?: DayAvailability[]
): DayAvailability[] => availabilities?.filter(_ => _.ranges.length === 0) ?? []

export const getAvailabilitiesForWeekDay = (
  availabilities?: DayAvailability[],
  day?: Date
) => availabilities?.find(_ => !!day && _.weekday === getDay(day))?.ranges ?? []

export const suggestBestSlots = (
  startDate: Date,
  duration: number,
  endDate: Date,
  timezone: string,
  busySlots: LuxonInterval<true>[],
  accounts: Account[]
) => {
  const accountAvailabilities = accounts.map(account => ({
    account,
    availabilities: parseMonthAvailabilitiesToDate(
      account.preferences.availabilities || [],
      startDate,
      endDate,
      account.preferences.timezone || 'UTC'
    ),
  }))
  const sortedBusySlots = busySlots.sort(
    (a, b) => a.start.toMillis() - b.start.toMillis()
  )
  const now = DateTime.now()
  const allSlots: LuxonInterval<true>[] = generateTimeSlots(
    startDate,
    duration || 30,
    true,
    timezone,
    endDate
  ).filter(slot => slot.isValid && slot.start >= now)

  return allSlots.filter(slot => {
    const hasAvailability = accountAvailabilities.every(({ availabilities }) =>
      hasOverlapBinary(slot, availabilities)
    )

    return hasAvailability && !hasOverlapBinary(slot, sortedBusySlots)
  })
}

export const getEmptySlots = (
  time: DateTime,
  scheduleDuration: number,
  timezone = 'UTC'
): Array<LuxonInterval<true>> => {
  const slots: Array<LuxonInterval<true>> = []
  const slotsPerHour = 60 / (scheduleDuration || 30)
  const totalSlots = 24 * slotsPerHour

  const dayStart = time.setZone(timezone).startOf('day')

  for (let i = 0; i < totalSlots; i++) {
    const minutesFromStart = i * (scheduleDuration || 30)
    const start = dayStart.plus({ minutes: minutesFromStart })
    const slot = LuxonInterval.after(start, { minutes: scheduleDuration || 30 }) // ✅ Fixed typo: 'minute' → 'minutes'
    if (slot.isValid) slots.push(slot)
  }

  return slots
}

function hasOverlapBinary(
  slot: LuxonInterval<true>,
  sortedIntervals: LuxonInterval<true>[]
): boolean {
  if (sortedIntervals.length === 0) return false

  let left = 0
  let right = sortedIntervals.length - 1

  // Find the first interval that might overlap
  // We need to check intervals where interval.end > slot.start
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const interval = sortedIntervals[mid]

    // Check for overlap
    if (interval.overlaps(slot)) {
      return true
    }

    // If slot is completely before this interval, search left
    if (slot.end <= interval.start) {
      right = mid - 1
    }
    // If slot is completely after this interval, search right
    else if (slot.start >= interval.end) {
      left = mid + 1
    } else {
      return interval.overlaps(slot)
    }
  }

  return false
}
