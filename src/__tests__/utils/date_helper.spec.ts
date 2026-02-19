import { isSameDay } from 'date-fns'
import { DateTime, Settings } from 'luxon'

// Setup Luxon for tests
Settings.defaultLocale = 'en-US'

// Mock timezone-soft module
jest.mock('timezone-soft', () => {
  return jest.fn((tzCode: string) => {
    return [{ iana: tzCode }]
  })
})

import { MeetingRepeat } from '@/types/Meeting'

import {
  addRecurrence,
  checkHasSameScheduleTime,
  checkIsSameDay,
  convertTimeRangesToDate,
  createLocalDate,
  createLocalDateTime,
  formatPollDateRange,
  formatPollSingleDate,
  formatWithOrdinal,
  getFormattedDateAndDuration,
  timezones,
} from '@/utils/date_helper'

const TEST_INTERVALS = [
  {
    end: '24:00',
    start: '18:00',
    timezone: 'Africa/Lagos',
    weekday: 0,
  },
  {
    end: '16:00',
    start: '13:00',
    timezone: 'Africa/Lagos',
    weekday: 1,
  },
  {
    end: '21:00',
    start: '19:00',
    timezone: 'Africa/Lagos',
    weekday: 1,
  },
  {
    end: '18:00',
    start: '14:00',
    timezone: 'Africa/Lagos',
    weekday: 2,
  },
  {
    end: '18:00',
    start: '09:00',
    timezone: 'Africa/Lagos',
    weekday: 3,
  },
  {
    end: '16:30',
    start: '13:00',
    timezone: 'Africa/Lagos',
    weekday: 4,
  },
  {
    end: '16:00',
    start: '12:00',
    timezone: 'Africa/Lagos',
    weekday: 5,
  },
  {
    end: '21:00',
    start: '19:00',
    timezone: 'Africa/Lagos',
    weekday: 5,
  },
  {
    end: '18:00',
    start: '12:00',
    timezone: 'Africa/Lagos',
    weekday: 6,
  },
]
describe('', () => {
  test('is intervals on same day', () => {
    expect(
      convertTimeRangesToDate(TEST_INTERVALS, new Date('2024-11-23')).every(
        val => isSameDay(val.start, val.end)
      )
    ).toBe(true)
  })
  test('is interval on same day', () => {
    expect(
      convertTimeRangesToDate(
        [
          {
            end: '24:00',
            start: '00:00',
            timezone: 'UTC',
            weekday: 6,
          },
        ],
        new Date('2024-11-23')
      )
    ).toStrictEqual([
      {
        end: new Date('2024-11-23T23:59:00.000Z'),
        start: new Date('2024-11-23T00:00:00.000Z'),
      },
    ])
  })
  test('is timezone applied', () => {
    expect(
      convertTimeRangesToDate(
        [
          {
            end: '18:00',
            start: '12:00',
            timezone: 'Africa/Lagos',
            weekday: 6,
          },
        ],
        new Date('2024-11-23')
      )
    ).toEqual([
      {
        end: new Date('2024-11-23T17:00:00.000Z'),
        start: new Date('2024-11-23T11:00:00.000Z'),
      },
    ])
  })
  test('all ranges are converted to dates', () => {
    expect(
      convertTimeRangesToDate(TEST_INTERVALS, new Date('2024-11-17'))
    ).toStrictEqual([
      {
        end: new Date('2024-11-17T22:59:00.000Z'),
        start: new Date('2024-11-17T17:00:00.000Z'),
      },
      {
        end: new Date('2024-11-18T15:00:00.000Z'),
        start: new Date('2024-11-18T12:00:00.000Z'),
      },
      {
        end: new Date('2024-11-18T20:00:00.000Z'),
        start: new Date('2024-11-18T18:00:00.000Z'),
      },
      {
        end: new Date('2024-11-19T17:00:00.000Z'),
        start: new Date('2024-11-19T13:00:00.000Z'),
      },
      {
        end: new Date('2024-11-20T17:00:00.000Z'),
        start: new Date('2024-11-20T08:00:00.000Z'),
      },
      {
        end: new Date('2024-11-21T15:30:00.000Z'),
        start: new Date('2024-11-21T12:00:00.000Z'),
      },
      {
        end: new Date('2024-11-22T15:00:00.000Z'),
        start: new Date('2024-11-22T11:00:00.000Z'),
      },
      {
        end: new Date('2024-11-22T20:00:00.000Z'),
        start: new Date('2024-11-22T18:00:00.000Z'),
      },
      {
        end: new Date('2024-11-23T17:00:00.000Z'),
        start: new Date('2024-11-23T11:00:00.000Z'),
      },
    ])
  })

  test('all time ranges are converted', () => {
    expect(
      convertTimeRangesToDate(TEST_INTERVALS, new Date('2024-11-23')).length
    ).toBe(TEST_INTERVALS.length)
  })
  test('should resolve to local timezone if no timezone is provided', () => {
    jest
      .spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions')
      .mockReturnValue({
        timeZone: 'Africa/Lagos',
      } as Intl.ResolvedDateTimeFormatOptions)
    expect(
      convertTimeRangesToDate(
        [
          {
            end: '18:00',
            start: '12:00',
            weekday: 6,
          },
        ],
        new Date('2024-11-23')
      )
    ).toStrictEqual([
      {
        end: new Date('2024-11-23T17:00:00.000Z'),
        start: new Date('2024-11-23T11:00:00.000Z'),
      },
    ])
  })
})

describe('timezones', () => {
  test('should export timezones array', () => {
    expect(timezones).toBeDefined()
    expect(Array.isArray(timezones)).toBe(true)
    expect(timezones.length).toBeGreaterThan(0)
  })

  test('should have timezone objects with required fields', () => {
    const tz = timezones[0]
    expect(tz).toHaveProperty('name')
    expect(tz).toHaveProperty('offset')
    expect(tz).toHaveProperty('tzCode')
    expect(tz).toHaveProperty('countries')
  })

  test('should be sorted by offset', () => {
    for (let i = 1; i < timezones.length; i++) {
      expect(timezones[i].offset).toBeGreaterThanOrEqual(timezones[i - 1].offset)
    }
  })
})

describe('addRecurrence', () => {
  test('should add daily recurrence', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T11:00:00Z')
    const minDate = new Date('2024-01-05T00:00:00Z')

    const result = addRecurrence(start, end, MeetingRepeat.DAILY, minDate)

    expect(result.start.getDate()).toBeGreaterThanOrEqual(5)
    expect(result.start.getHours()).toBe(10)
  })

  test('should add weekly recurrence', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T11:00:00Z')
    const minDate = new Date('2024-02-01T00:00:00Z')

    const result = addRecurrence(start, end, MeetingRepeat.WEEKLY, minDate)

    expect(result.start >= minDate).toBe(true)
    expect(result.start.getDay()).toBe(start.getDay())
  })

  test('should add monthly recurrence', () => {
    const start = new Date('2024-01-15T10:00:00Z')
    const end = new Date('2024-01-15T11:00:00Z')
    const minDate = new Date('2024-03-01T00:00:00Z')

    const result = addRecurrence(start, end, MeetingRepeat.MONTHLY, minDate)

    expect(result.start >= minDate).toBe(true)
  })

  test('should maintain duration', () => {
    const start = new Date('2024-01-01T10:00:00Z')
    const end = new Date('2024-01-01T11:30:00Z')
    const minDate = new Date('2024-01-05T00:00:00Z')

    const result = addRecurrence(start, end, MeetingRepeat.DAILY, minDate)

    const duration = result.end.getTime() - result.start.getTime()
    expect(duration).toBe(90 * 60 * 1000)
  })
})

describe('formatWithOrdinal', () => {
  test('should format same-day interval', () => {
    const start = DateTime.fromISO('2024-01-15T10:00:00Z')
    const end = DateTime.fromISO('2024-01-15T11:00:00Z')
    const interval = { start, end } as any

    const result = formatWithOrdinal(interval)

    expect(result).toContain('15th')
    expect(result).toContain('Jan')
    expect(result).toContain('10:00')
    expect(result).toContain('11:00')
  })

  test('should format multi-day interval', () => {
    const start = DateTime.fromISO('2024-01-15T10:00:00Z')
    const end = DateTime.fromISO('2024-01-16T11:00:00Z')
    const interval = { start, end } as any

    const result = formatWithOrdinal(interval)

    expect(result).toContain('15th')
    expect(result).toContain('16th')
  })

  test('should use correct ordinal suffixes', () => {
    const tests = [
      { day: 1, suffix: 'st' },
      { day: 2, suffix: 'nd' },
      { day: 3, suffix: 'rd' },
      { day: 4, suffix: 'th' },
      { day: 11, suffix: 'th' },
      { day: 21, suffix: 'st' },
      { day: 22, suffix: 'nd' },
      { day: 23, suffix: 'rd' },
    ]

    tests.forEach(({ day, suffix }) => {
      const start = DateTime.fromISO(`2024-01-${day.toString().padStart(2, '0')}T10:00:00Z`)
      const end = start.plus({ hours: 1 })
      const interval = { start, end } as any

      const result = formatWithOrdinal(interval)
      expect(result).toContain(`${day}${suffix}`)
    })
  })
})

describe('getFormattedDateAndDuration', () => {
  test('should format date and duration', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const duration = 60

    const result = getFormattedDateAndDuration('America/New_York', startTime, duration)

    expect(result).toHaveProperty('formattedDate')
    expect(result).toHaveProperty('timeDuration')
    expect(result.timeDuration).toContain('-')
  })

  test('should use custom end time if provided', () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T12:30:00Z')

    const result = getFormattedDateAndDuration('America/New_York', startTime, 60, endTime)

    expect(result.timeDuration).toMatch(/.*-.*/)
  })
})

describe('formatPollDateRange', () => {
  test('should format same month range', () => {
    const result = formatPollDateRange('2024-01-15', '2024-01-20')
    expect(result).toContain('15th')
    expect(result).toContain('20th')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  test('should format different month same year range', () => {
    const result = formatPollDateRange('2024-01-15', '2024-06-20')
    expect(result).toContain('15th')
    expect(result).toContain('January')
    expect(result).toContain('20th')
    expect(result).toContain('June')
    expect(result).toContain('2024')
  })

  test('should format different year range', () => {
    const result = formatPollDateRange('2024-01-15', '2025-06-20')
    expect(result).toContain('15th')
    expect(result).toContain('January')
    expect(result).toContain('2024')
    expect(result).toContain('20th')
    expect(result).toContain('June')
    expect(result).toContain('2025')
  })
})

describe('formatPollSingleDate', () => {
  test('should format single date', () => {
    const result = formatPollSingleDate('2024-01-15')
    expect(result).toContain('15th')
    expect(result).toContain('January')
    expect(result).toContain('2024')
  })

  test('should use correct ordinals', () => {
    expect(formatPollSingleDate('2024-01-01')).toContain('1st')
    expect(formatPollSingleDate('2024-01-02')).toContain('2nd')
    expect(formatPollSingleDate('2024-01-03')).toContain('3rd')
    expect(formatPollSingleDate('2024-01-04')).toContain('4th')
    expect(formatPollSingleDate('2024-01-21')).toContain('21st')
  })
})

describe('createLocalDateTime', () => {
  test('should combine date and time', () => {
    const date = new Date('2024-01-15')
    const time = new Date('2000-01-01T14:30:45')

    const result = createLocalDateTime(date, time)
    const parsed = new Date(result)

    expect(parsed.getFullYear()).toBe(2024)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(15)
    expect(parsed.getHours()).toBe(14)
    expect(parsed.getMinutes()).toBe(30)
    expect(parsed.getSeconds()).toBe(45)
  })
})

describe('createLocalDate', () => {
  test('should create date at start of day', () => {
    const date = new Date('2024-01-15T14:30:45')

    const result = createLocalDate(date)
    const parsed = new Date(result)

    expect(parsed.getFullYear()).toBe(2024)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(15)
    expect(parsed.getHours()).toBe(0)
    expect(parsed.getMinutes()).toBe(0)
    expect(parsed.getSeconds()).toBe(0)
  })
})

describe('checkHasSameScheduleTime', () => {
  test('should return true for same hour and minute', () => {
    const date1 = new Date('2024-01-15T10:30:00')
    const date2 = new Date('2024-01-20T10:30:00')

    expect(checkHasSameScheduleTime(date1, date2)).toBe(true)
  })

  test('should return false for different times', () => {
    const date1 = new Date('2024-01-15T10:30:00')
    const date2 = new Date('2024-01-15T10:31:00')

    expect(checkHasSameScheduleTime(date1, date2)).toBe(false)
  })
})

describe('checkIsSameDay', () => {
  test('should return true for same day', () => {
    const date1 = new Date('2024-01-15T10:30:00')
    const date2 = new Date('2024-01-15T14:45:00')

    expect(checkIsSameDay(date1, date2)).toBe(true)
  })

  test('should return false for different days', () => {
    const date1 = new Date('2024-01-15T10:30:00')
    const date2 = new Date('2024-01-16T10:30:00')

    expect(checkIsSameDay(date1, date2)).toBe(false)
  })
})
