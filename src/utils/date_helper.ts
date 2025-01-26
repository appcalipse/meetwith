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
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import spacetime from 'spacetime'
import soft from 'timezone-soft'

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
    if (display?.daylight && s.isDST()) {
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
      endDate = addDays(
        setMinutes(
          setHours(setDay(startOfWeekDate, timeRange.weekday, weekOptions), 0),
          0
        ),
        1
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
