import * as ct from 'countries-and-timezones'
import {
  add,
  differenceInMinutes,
  endOfMonth,
  getWeekOfMonth,
  isBefore,
  setDay,
  startOfMonth,
} from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { DateTime, WeekdayNumbers } from 'luxon'
import spacetime from 'spacetime'
import soft from 'timezone-soft'

import { TimeRange } from '@/types/Account'
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
    if (timeRange.end === '24:00') {
      timeRange.end = '23:59'
    }
    const timezone =
      timeRange.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const [startHours, startMinutes] = timeRange.start.split(':').map(Number)
    const [endHours, endMinutes] = timeRange.end.split(':').map(Number)
    const baseOptions = {
      day: date.getDay(),
      month: date.getMonth(),
      year: date.getFullYear(),
      weekday: (timeRange.weekday + 1) as WeekdayNumbers,
    }
    const startTime = DateTime.local()
      .setZone(timezone)
      .set({
        hour: startHours,
        minute: startMinutes,
        ...baseOptions,
      })
      .toJSDate()
    const endTime = DateTime.local()
      .setZone(timezone)
      .set({
        hour: endHours,
        minute: endMinutes,
        ...baseOptions,
      })
      .toJSDate()
    if (
      date.getDay() === 4 &&
      timezone === 'Pacific/Kiritimati' &&
      timeRange.weekday === 4
    ) {
      console.log({
        date: date.toLocaleDateString('en', {
          timeZone: timezone,
          hour: 'numeric',
          dateStyle: 'full',
        }),
        start: startTime.toLocaleDateString('en', {
          timeZone: timezone,
        }),
        end: endTime.toLocaleDateString('en', {
          timeZone: timezone,
        }),
        timeRange,
      })
    }
    return {
      start: startTime,
      end: endTime,
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

function getDateInTimezone(timezone: string) {
  const timezoneOffset =
    timezones.find(tz => tz.tzCode === timezone)?.offset || 0
  const date = new Date()
  const utc = date.getTime() + date.getTimezoneOffset() * 60000 // Convert to UTC
  return new Date(utc + timezoneOffset * 3600000) // Apply timezone offset
}
