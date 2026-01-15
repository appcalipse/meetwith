import { isSameDay } from 'date-fns'

import { convertTimeRangesToDate } from '@/utils/date_helper'

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
