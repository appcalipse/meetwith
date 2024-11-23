import * as ct from 'countries-and-timezones'
import { setDay } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'

import { TimeRange } from '@/types/Account'
import { CustomTimeRange } from '@/types/common'
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
  return timeRanges.map(timeRange => {
    if (timeRange.end === '24:00') {
      timeRange.end = '23:59'
    }
    const timezone =
      timeRange.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    return {
      start: zonedTimeToUtc(
        setDay(
          new Date(`${date.toDateString()} ${timeRange.start}`),
          timeRange.weekday,
          {
            weekStartsOn: timeRange.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          }
        ),
        timezone
      ),
      end: zonedTimeToUtc(
        setDay(
          new Date(`${date.toDateString()} ${timeRange.end}`),
          timeRange.weekday,
          {
            weekStartsOn: timeRange.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6,
          }
        ),
        timezone
      ),
    }
  })
}
