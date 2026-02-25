import { DateTime, Interval as LuxonInterval } from 'luxon'
import { DayAvailability } from '@/types/Account'
import { parseMonthAvailabilitiesToDate } from '@/utils/date_helper'

jest.mock('@/utils/date_helper', () => ({
  parseMonthAvailabilitiesToDate: jest.fn(() => []),
}))

import {
  generateTimeSlots,
  getBlockedAvailabilities,
  getAvailabilitiesForWeekDay,
  getEmptySlots,
  isTimeInsideAvailabilities,
  suggestBestSlots,
} from '@/utils/slots.helper'

const mockedParse = parseMonthAvailabilitiesToDate as jest.Mock

describe('generateTimeSlots', () => {
  const futureDate = new Date('2099-06-15T00:00:00Z')

  it('generates 48 slots for 30-min duration over a full day', () => {
    const slots = generateTimeSlots(futureDate, 30, true, 'UTC')
    expect(slots).toHaveLength(48)
  })

  it('generates 96 slots for 15-min duration over a full day', () => {
    const slots = generateTimeSlots(futureDate, 15, true, 'UTC')
    expect(slots).toHaveLength(96)
  })

  it('respects endDate parameter', () => {
    const endDate = new Date('2099-06-15T02:00:00Z')
    const slots = generateTimeSlots(futureDate, 30, true, 'UTC', endDate)
    expect(slots).toHaveLength(4)
  })

  it('with fromStartDate=true starts from start of hour', () => {
    const slots = generateTimeSlots(futureDate, 30, true, 'UTC')
    const first = slots[0]
    expect(first.start!.minute).toBe(0)
    expect(first.start!.second).toBe(0)
  })

  it('all returned intervals are valid', () => {
    const slots = generateTimeSlots(futureDate, 30, true, 'UTC')
    slots.forEach(slot => {
      expect(slot.isValid).toBe(true)
    })
  })
})

describe('getBlockedAvailabilities', () => {
  it('returns days with empty ranges', () => {
    const avails: DayAvailability[] = [
      { weekday: 0, ranges: [] },
      { weekday: 1, ranges: [{ start: '09:00', end: '17:00' }] },
      { weekday: 2, ranges: [] },
    ]
    const blocked = getBlockedAvailabilities(avails)
    expect(blocked).toHaveLength(2)
    expect(blocked[0].weekday).toBe(0)
    expect(blocked[1].weekday).toBe(2)
  })

  it('returns empty array when all days have ranges', () => {
    const avails: DayAvailability[] = [
      { weekday: 1, ranges: [{ start: '09:00', end: '17:00' }] },
    ]
    expect(getBlockedAvailabilities(avails)).toHaveLength(0)
  })

  it('returns empty array for undefined input', () => {
    expect(getBlockedAvailabilities(undefined)).toEqual([])
  })
})

describe('getAvailabilitiesForWeekDay', () => {
  const avails: DayAvailability[] = [
    { weekday: 0, ranges: [{ start: '09:00', end: '12:00' }] },
    { weekday: 3, ranges: [{ start: '10:00', end: '18:00' }] },
  ]

  it('returns ranges for matching weekday', () => {
    // 2099-06-15 is a Monday → getDay returns 1; weekday 0 = Sunday
    const sunday = new Date('2099-06-14T12:00:00Z') // Sunday
    const ranges = getAvailabilitiesForWeekDay(avails, sunday)
    expect(ranges).toEqual([{ start: '09:00', end: '12:00' }])
  })

  it('returns empty array for non-matching weekday', () => {
    const tuesday = new Date('2099-06-16T12:00:00Z')
    expect(getAvailabilitiesForWeekDay(avails, tuesday)).toEqual([])
  })

  it('returns empty array when day is undefined', () => {
    expect(getAvailabilitiesForWeekDay(avails, undefined)).toEqual([])
  })

  it('returns empty array when availabilities is undefined', () => {
    const day = new Date('2099-06-14T12:00:00Z')
    expect(getAvailabilitiesForWeekDay(undefined, day)).toEqual([])
  })
})

describe('getEmptySlots', () => {
  const time = DateTime.fromISO('2099-06-15T12:00:00', { zone: 'UTC' })

  it('generates 48 slots for 30-min duration', () => {
    const slots = getEmptySlots(time, 30, 'UTC')
    expect(slots).toHaveLength(48)
  })

  it('generates 96 slots for 15-min duration', () => {
    const slots = getEmptySlots(time, 15, 'UTC')
    expect(slots).toHaveLength(96)
  })

  it('all slots are valid', () => {
    const slots = getEmptySlots(time, 30, 'UTC')
    slots.forEach(slot => {
      expect(slot.isValid).toBe(true)
    })
  })

  it('falls back to 30-min when scheduleDuration is 0', () => {
    const slots = getEmptySlots(time, 0, 'UTC')
    expect(slots).toHaveLength(48)
  })
})

describe('isTimeInsideAvailabilities', () => {
  const start = new Date('2099-06-15T10:00:00Z')
  const end = new Date('2099-06-15T10:30:00Z')
  const avails: DayAvailability[] = [
    { weekday: 0, ranges: [{ start: '09:00', end: '17:00' }] },
  ]

  afterEach(() => {
    mockedParse.mockReset()
    mockedParse.mockReturnValue([])
  })

  it('returns true when parsed availabilities overlap the slot', () => {
    const overlapping = LuxonInterval.fromDateTimes(
      DateTime.fromISO('2099-06-15T09:00:00', { zone: 'UTC' }),
      DateTime.fromISO('2099-06-15T17:00:00', { zone: 'UTC' }),
    )
    mockedParse.mockReturnValue([overlapping])
    expect(isTimeInsideAvailabilities(start, end, avails)).toBe(true)
  })

  it('returns false when parsed availabilities are empty', () => {
    mockedParse.mockReturnValue([])
    expect(isTimeInsideAvailabilities(start, end, avails)).toBe(false)
  })
})

describe('suggestBestSlots', () => {
  it('returns slots when no busy slots and availability covers all', () => {
    const startDate = new Date('2099-06-15T00:00:00Z')
    const endDate = new Date('2099-06-15T02:00:00Z')
    const duration = 30

    // Build availability intervals that cover the entire range
    const availStart = DateTime.fromISO('2099-06-15T00:00:00', { zone: 'UTC' })
    const availEnd = DateTime.fromISO('2099-06-15T02:00:00', { zone: 'UTC' })
    const availInterval = LuxonInterval.fromDateTimes(availStart, availEnd) as LuxonInterval<true>

    const accountAvailabilities = [
      { address: 'user@example.com', availabilities: [availInterval] },
    ]

    const result = suggestBestSlots(
      startDate, duration, endDate, 'UTC', [], accountAvailabilities,
    )

    expect(result.length).toBeGreaterThan(0)
    result.forEach(slot => {
      expect(slot.isValid).toBe(true)
    })
  })
})
