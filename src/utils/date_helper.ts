import * as ct from 'countries-and-timezones'
import {
  addDays,
  endOfWeek,
  setDay,
  setHours,
  setMinutes,
  startOfWeek,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import {
  DateTime,
  Interval,
  Interval as LuxonInterval,
  WeekdayNumbers,
} from 'luxon'

import { DayAvailability } from '@/types/Account'
import { CustomTimeRange } from '@/types/common'
import { MeetingRepeat } from '@/types/Meeting'

const timezonesKeys = Object.keys(ct.getAllTimezones()) as Array<
  keyof ReturnType<typeof ct.getAllTimezones>
>
/**
 * Returns timezone list with current DST-aware offsets.
 * Must be called at render time (not module load) so offsets reflect
 * the actual DST state at the moment the user sees the picker.
 *
 * Uses Luxon to compute the live UTC offset instead of static data from
 * countries-and-timezones, which has inverted standard/DST definitions
 * for zones like Europe/Dublin and Africa/Casablanca.
 */
export const getTimezones = () =>
  timezonesKeys
    .map(key => {
      const countries = ct.getCountriesForTimezone(key)
      // Compute the real offset right now via Luxon — handles DST,
      // inverted-DST zones (Ireland), and everything else correctly.
      const now = DateTime.now().setZone(key)
      const offset = now.offset // minutes from UTC
      const offsetStr = now.toFormat('ZZ') // e.g. "+00:00", "-05:00", "+05:30"
      return {
        countries: countries.map(c => ({
          id: c.id,
          name: c.name,
        })),
        name: `${key.replace(/^Etc\/GMT([+-]?\d+)?$/, (match, gmtOffset) => {
          if (!gmtOffset || Number(gmtOffset) === 0) return 'GMT'
          const sign = gmtOffset[0] === '+' ? '-' : '+'
          const number = gmtOffset.replace(/^[+-]/, '')
          return `GMT${sign}${number}`
        })} (UTC${offsetStr})`,
        offset,
        tzCode: key,
      }
    })
    .sort((a, b) => a.offset - b.offset)

export const convertTimeRangesToDate = (
  timeRanges: CustomTimeRange[],
  date: Date
) => {
  return timeRanges.map(timeRange => {
    const timezone =
      timeRange.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const [startHours, startMinutes] = timeRange.start.split(':').map(Number)
    const [endHours, endMinutes] = timeRange.end.split(':').map(Number)
    const weekOptions = {
      weekStartsOn: timeRange.weekday === 0 ? 6 : 0,
    } as {
      weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6
    }
    const startOfWeekDate = startOfWeek(date, weekOptions) // Adjust week start if needed
    const endOfWeekDate = endOfWeek(date, weekOptions)

    // Calculate the start and end dates based on the provided time range
    let startDate = setMinutes(
      setHours(
        setDay(startOfWeekDate, timeRange.weekday, weekOptions),
        startHours
      ),
      startMinutes
    )
    let endDate = setMinutes(
      setHours(
        setDay(startOfWeekDate, timeRange.weekday, weekOptions),
        endHours
      ),
      endMinutes
    )

    // Handle 24:00 case
    if (endHours === 24) {
      endDate = setMinutes(
        setHours(setDay(startOfWeekDate, timeRange.weekday, weekOptions), 23),
        59
      )
    }

    // Ensure dates are within the same week
    if (startDate > endOfWeekDate) {
      startDate = addDays(startDate, -7)
    }
    if (endDate > endOfWeekDate) {
      endDate = addDays(endDate, -7)
    }

    // Convert to timezone if provided
    startDate = zonedTimeToUtc(startDate, timezone)
    endDate = zonedTimeToUtc(endDate, timezone)
    return {
      end: endDate,
      start: startDate,
    }
  })
}

export const addRecurrence = (
  start: Date,
  end: Date,
  recurrence: MeetingRepeat,
  minDate = new Date()
) => {
  const startDate = DateTime.fromJSDate(start)
  const diffMinutes = startDate.diff(
    DateTime.fromJSDate(end),
    'minutes'
  ).minutes
  let newStart: DateTime<true> = startDate.isValid ? startDate : DateTime.now()
  const now = DateTime.fromJSDate(minDate)

  do {
    switch (recurrence) {
      case MeetingRepeat.DAILY:
        newStart = newStart.plus({ days: 1 })
        break

      case MeetingRepeat.WEEKLY:
        newStart = newStart.plus({ weeks: 1 })
        break

      case MeetingRepeat.MONTHLY:
        const dayOfWeek = newStart.weekday
        const originalWeekOfMonth = Math.ceil(newStart.day / 7) // ✓ Calculate BEFORE advancing

        const nextMonth = newStart.plus({ months: 1 })
        const monthStart = nextMonth.startOf('month')
        newStart = monthStart.set({ weekday: dayOfWeek })

        for (let i = 1; i < originalWeekOfMonth; i++) {
          newStart = newStart.plus({ weeks: 1 })
          if (newStart.month !== nextMonth.month) {
            newStart = newStart.minus({ weeks: 1 })
            break
          }
        }
        break

      default:
        newStart = newStart.plus({ days: 1 })
        break
    }
  } while (newStart < now)
  const newEnd = newStart.plus({ minutes: diffMinutes }).toJSDate()
  return { end: newEnd, start: newStart.toJSDate() }
}

export const parseMonthAvailabilitiesToDate = (
  availabilities: Array<DayAvailability>,
  startDate: Date,
  endDate: Date,
  ownerTimezone: string
) => {
  const slots = []
  let currentWeek = DateTime.fromJSDate(startDate, {
    zone: ownerTimezone,
  }).startOf('month') // Start of first week
  const endWeek = DateTime.fromJSDate(endDate, {
    zone: ownerTimezone,
  }).endOf('month') // End of last week

  while (currentWeek <= endWeek) {
    for (const availability of availabilities) {
      const { ranges, weekday } = availability

      for (const range of ranges) {
        const { start, end } = range
        const [startHours, startMinutes] = start.split(':').map(Number)
        const [endHours, endMinutes] = end.split(':').map(Number)
        const luxonWeekday: WeekdayNumbers = (
          weekday === 0 ? 7 : weekday
        ) as WeekdayNumbers
        // Create start time in owner timezone for this specific day
        const startTime = currentWeek
          .set({ weekday: luxonWeekday }) // Luxon uses 1-7, Sunday = 7
          .set({
            hour: startHours,
            millisecond: 0,
            minute: startMinutes,
            second: 0,
          })

        // Create end time in owner timezone for this specific day
        const endTime = currentWeek.set({ weekday: luxonWeekday }).set({
          hour: endHours,
          millisecond: 0,
          minute: endMinutes,
          second: 0,
        })

        slots.push(Interval.fromDateTimes(startTime, endTime))
      }
    }

    currentWeek = currentWeek.plus({ weeks: 1 }) // Move to next week
  }

  return slots.filter(slot => slot.isValid)
}

export const isBeginningOfHour = (dateTime: DateTime): boolean => {
  return dateTime.minute === 0
}
export const getMeetingBoundaries = (
  slot: LuxonInterval<true>,
  meetingDurationMinutes: number
) => {
  const slotDurationMinutes = slot.toDuration('minutes').minutes
  const meetingDurationHours = meetingDurationMinutes / 60

  if (meetingDurationHours >= 1) {
    const slotsInMeeting = meetingDurationMinutes / slotDurationMinutes
    const totalMinutesFromStartOfDay = slot.start.hour * 60 + slot.start.minute
    const currentSlotInSequence = Math.floor(
      totalMinutesFromStartOfDay / slotDurationMinutes
    )

    return {
      isBottomElement: (currentSlotInSequence + 1) % slotsInMeeting === 0,
      isTopElement: currentSlotInSequence % slotsInMeeting === 0,
    }
  }

  return {
    isBottomElement: isBeginningOfHour(slot.end),
    isTopElement: isBeginningOfHour(slot.start),
  }
}

const getOrdinalSuffix = (day: number) => {
  if (day >= 11 && day <= 13) {
    return 'th'
  }

  switch (day % 10) {
    case 1:
      return 'st'
    case 2:
      return 'nd'
    case 3:
      return 'rd'
    default:
      return 'th'
  }
}

export const formatWithOrdinal = (
  dateTime: LuxonInterval<true>,
  timezone?: string
) => {
  const zone = timezone || dateTime.start.zoneName
  const zonedStart = dateTime.start.setZone(zone)
  const zonedEnd = dateTime.end.setZone(zone)

  const startDay = zonedStart.day
  const endDay = zonedEnd.day
  const startSuffix = getOrdinalSuffix(startDay)
  const endSuffix = getOrdinalSuffix(endDay)

  const formattedStartDate = `${zonedStart.toFormat(
    'EEE, MMM'
  )} ${startDay}${startSuffix}`
  const formattedStartTime = zonedStart.toFormat('h:mm a')
  const formattedEndTime = zonedEnd.toFormat('h:mm a')

  if (zonedStart.hasSame(zonedEnd, 'day')) {
    return `${formattedStartDate} • ${formattedStartTime} - ${formattedEndTime}`
  }

  const formattedEndDate = `${zonedEnd.toFormat(
    'EEE, MMM'
  )} ${endDay}${endSuffix}`
  return `${formattedStartDate} ${formattedStartTime} - ${formattedEndDate} ${formattedEndTime}`
}
export const getFormattedDateAndDuration = (
  timezone: string,
  startTime: Date,
  duration_in_minutes: number,
  endTime?: Date
) => {
  const startTimeInTimezone = DateTime.fromJSDate(startTime).setZone(
    timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const endTimeInTimezone = endTime
    ? DateTime.fromJSDate(endTime).setZone(
        timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      )
    : startTimeInTimezone.plus({
        minutes: duration_in_minutes || 0,
      })

  const formattedStartTime = startTimeInTimezone.toFormat('h:mm a')
  const formattedEndTime = endTimeInTimezone.toFormat('h:mm a')
  const formattedDate = DateTime.fromJSDate(startTime)
    .setZone(timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
    .toFormat('cccc, LLLL d, yyyy')
  const timeDuration = `${formattedStartTime} - ${formattedEndTime}`
  return {
    formattedDate,
    timeDuration,
  }
}

// Format a date range for QuickPoll display (e.g., "24th April - 24th June, 2025")

export const formatPollDateRange = (startDate: string, endDate: string) => {
  const start = DateTime.fromISO(startDate, { zone: 'utc' })
  const end = DateTime.fromISO(endDate, { zone: 'utc' })

  const getOrdinalSuffix = (day: number) => {
    const j = day % 10
    const k = day % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  const startDay = start.day
  const endDay = end.day
  const startDayOrdinal = `${startDay}${getOrdinalSuffix(startDay)}`
  const endDayOrdinal = `${endDay}${getOrdinalSuffix(endDay)}`

  // Same year
  if (start.year === end.year) {
    // Same month
    if (start.month === end.month) {
      return `${startDayOrdinal} - ${endDayOrdinal} ${start.toFormat(
        'MMMM, yyyy'
      )}`
    }
    // Different months, same year
    return `${startDayOrdinal} ${start.toFormat(
      'MMMM'
    )} - ${endDayOrdinal} ${end.toFormat('MMMM, yyyy')}`
  }

  // Different years
  return `${startDayOrdinal} ${start.toFormat(
    'MMMM, yyyy'
  )} - ${endDayOrdinal} ${end.toFormat('MMMM, yyyy')}`
}

// Format a single date for QuickPoll display (e.g., "25th May, 2025")

export const formatPollSingleDate = (date: string) => {
  const dateTime = DateTime.fromISO(date)
  const day = dateTime.day

  const getOrdinalSuffix = (day: number) => {
    const j = day % 10
    const k = day % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  const dayOrdinal = `${day}${getOrdinalSuffix(day)}`
  return `${dayOrdinal} ${dateTime.toFormat('MMMM, yyyy')}`
}

export const createLocalDateTime = (date: Date, time: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()
  const hours = time.getHours()
  const minutes = time.getMinutes()
  const seconds = time.getSeconds()

  const localDateTime = new Date(year, month, day, hours, minutes, seconds)

  return localDateTime.toISOString()
}

// Helper to create an ISO string for a calendar date (midnight UTC) so display is consistent across timezones
export const createLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = date.getMonth()
  const day = date.getDate()

  const utcMidnight = new Date(Date.UTC(year, month, day, 0, 0, 0))
  return utcMidnight.toISOString()
}

export const checkHasSameScheduleTime = (date: Date, date2: Date): boolean => {
  const instance = DateTime.fromJSDate(date)
  const instance2 = DateTime.fromJSDate(date2)
  return (
    instance.hasSame(instance2, 'hour') && instance.hasSame(instance2, 'minute')
  )
}
export const checkIsSameDay = (date: Date, date2: Date): boolean => {
  const instance = DateTime.fromJSDate(date)
  const instance2 = DateTime.fromJSDate(date2)
  return instance.hasSame(instance2, 'day')
}
