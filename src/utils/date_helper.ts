import * as ct from 'countries-and-timezones'
import {
  add,
  addDays,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  getWeekOfMonth,
  isBefore,
  setDay,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import {
  DateTime,
  Interval,
  Interval as LuxonInterval,
  WeekdayNumbers,
} from 'luxon'
import spacetime from 'spacetime'
import soft from 'timezone-soft'

import { DayAvailability } from '@/types/Account'
import { CustomTimeRange } from '@/types/common'
import { MeetingRepeat } from '@/types/Meeting'

const timezonesObj = ct.getAllTimezones()
const timezonesKeys = Object.keys(timezonesObj) as Array<
  keyof typeof timezonesObj
>
export const timezones = timezonesKeys
  .map(key => {
    const timeInfo = timezonesObj[key]
    const display = soft(key)[0]
    let show = timeInfo.utcOffsetStr
    let offset = timeInfo.utcOffset
    // are we in standard time, or daylight time?
    const s = spacetime.now(display?.iana)
    if (s.isDST()) {
      show = timeInfo.dstOffsetStr
      offset = timeInfo.dstOffset
    }
    return {
      name: `${key} (UTC${show})`,
      tzCode: key,
      offset,
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
      start: startDate,
      end: endDate,
    }
  })
}

export const addRecurrence = (
  start: Date,
  end: Date,
  recurrence: MeetingRepeat
) => {
  const diffMinutes = differenceInMinutes(end, start)
  let newStart: Date = start
  while (isBefore(newStart, new Date())) {
    switch (recurrence) {
      case MeetingRepeat.DAILY:
        newStart = add(newStart, { days: 1 })
        break

      case MeetingRepeat.WEEKLY:
        newStart = add(newStart, { weeks: 1 })
        break
      case MeetingRepeat.MONTHLY:
        const dayOfWeek = new Date(newStart).getDay()
        const weekOfMonth = getWeekOfMonth(newStart)

        const nextMonth = add(newStart, { months: 1 })
        const monthStart = startOfMonth(nextMonth)

        newStart = setDay(monthStart, dayOfWeek)

        for (let i = 1; i < weekOfMonth; i++) {
          newStart = add(newStart, { weeks: 1 })
          if (newStart > endOfMonth(nextMonth)) {
            newStart = add(newStart, { weeks: -1 })
            break
          }
        }
        break
      default:
        newStart = add(newStart, { days: 1 })
        break
    }
  }
  const newEnd = add(newStart, { minutes: diffMinutes })
  return { start: newStart, end: newEnd }
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
            minute: startMinutes,
            second: 0,
            millisecond: 0,
          })

        // Create end time in owner timezone for this specific day
        const endTime = currentWeek.set({ weekday: luxonWeekday }).set({
          hour: endHours,
          minute: endMinutes,
          second: 0,
          millisecond: 0,
        })

        slots.push(Interval.fromDateTimes(startTime, endTime))
      }
    }

    currentWeek = currentWeek.plus({ weeks: 1 }) // Move to next week
  }

  return slots
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
      isTopElement: currentSlotInSequence % slotsInMeeting === 0,
      isBottomElement: (currentSlotInSequence + 1) % slotsInMeeting === 0,
    }
  }

  return {
    isTopElement: isBeginningOfHour(slot.start),
    isBottomElement: isBeginningOfHour(slot.end),
  }
}

export const formatWithOrdinal = (dateTime: LuxonInterval<true>) => {
  const zonedStart = dateTime.start
  const zonedEnd = dateTime.end

  const day = zonedStart.day
  const suffix = ['th', 'st', 'nd', 'rd'][day % 10 > 3 ? 0 : day % 10]

  // Same day interval
  if (zonedStart.hasSame(zonedEnd, 'day')) {
    return (
      zonedStart
        .toFormat('EEE, {**} MMMM - h:mm')
        .replace('{**}', `${day}${suffix}`) +
      ` - ${zonedEnd.toFormat('h:mm a')}`
    )
  }

  // Cross-day interval (rare for most meeting slots)
  return `${zonedStart.toFormat('EEE, d MMM h:mm')} - ${zonedEnd.toFormat(
    'EEE, d MMM h:mm a'
  )}`
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
