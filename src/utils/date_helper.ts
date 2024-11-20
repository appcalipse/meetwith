import * as ct from 'countries-and-timezones'
import {
  add,
  differenceInMinutes,
  endOfMonth,
  getWeekOfMonth,
  setDay,
  startOfMonth,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

import { TimeRange } from '@/types/Account'
import { CustomTimeRange } from '@/types/common'
import { MeetingRepeat } from '@/types/Meeting'
const timezonesObj = ct.getAllTimezones()
const timezonesKeys = Object.keys(timezonesObj) as Array<
  keyof typeof timezonesObj
>
const _timezones = timezonesKeys
  .map(key => {
    return {
      name: `${key} (GMT${timezonesObj[key].dstOffsetStr})`,
      tzCode: key,
      offset: timezonesObj[key].utcOffset,
    }
  })
  .sort((a, b) => a.offset - b.offset)

export const timezones = [
  ..._timezones,
  { tzCode: 'UTC', name: '(UTC+00:00) UTC' },
]

export const convertTimeRangesToDate = (
  timeRanges: CustomTimeRange[],
  date: Date
) => {
  return timeRanges.map(timeRange => ({
    start: zonedTimeToUtc(
      setDay(
        new Date(`${date.toDateString()} ${timeRange.start}`),
        timeRange.weekday,
        {
          weekStartsOn: timeRange.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        }
      ),
      timeRange.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    ),
    end: zonedTimeToUtc(
      setDay(
        new Date(`${date.toDateString()} ${timeRange.end}`),
        timeRange.weekday,
        {
          weekStartsOn: timeRange.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
        }
      ),
      timeRange.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    ),
  }))
}

export const addRecurrence = (
  start: Date,
  end: Date,
  recurrence: MeetingRepeat
) => {
  const diffMinutes = differenceInMinutes(end, start)
  let newStart: Date

  switch (recurrence) {
    case MeetingRepeat.DAILY:
      newStart = add(start, { days: 1 })
      break

    case MeetingRepeat.WEEKLY:
      newStart = add(start, { weeks: 1 })
      break
    case MeetingRepeat.MONTHLY:
      const dayOfWeek = new Date(start).getDay()
      const weekOfMonth = getWeekOfMonth(start)

      const nextMonth = add(start, { months: 1 })
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
      newStart = add(start, { days: 1 })
      break
  }
  const newEnd = add(newStart, { minutes: diffMinutes })

  return { start: newStart, end: newEnd }
}
