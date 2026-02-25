import { DateTime, Interval } from 'luxon'
import { AvailabilitySlot, QuickPollParticipantType } from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  clipIntervalsToBounds,
  computeAvailabilitySlotsWithOverrides,
  computeAvailabilityWithOverrides,
  computeBaseAvailability,
  convertAvailabilitySlotRangesToIntervals,
  convertAvailabilityToSelectedSlots,
  convertBusySlotsToIntervals,
  convertSelectedSlotsToAvailabilitySlots,
  createMockMeetingMembers,
  doSlotsOverlapOrContain,
  extractOverrideIntervals,
  generateFullDayBlocks,
  generatePollSlug,
  getMonthRange,
  mergeAvailabilitySlots,
  mergeLuxonIntervals,
  mergeTimeRanges,
  processPollParticipantAvailabilities,
  subtractBusyTimesFromBlocks,
  subtractRemovalIntervals,
} from '@/utils/quickpoll_helper'

jest.mock('@/utils/slots.helper', () => ({
  generateTimeSlots: jest.fn(() => []),
}))

describe('quickpoll_helper - Quality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generatePollSlug', () => {
    it('should generate slug with random suffix', () => {
      const slug = generatePollSlug('Team Meeting')
      expect(slug).toMatch(/^team-meeting-[a-z0-9]{4}$/)
    })

    it('should handle empty title', () => {
      const slug = generatePollSlug('')
      expect(slug).toMatch(/^-[a-z0-9]{4}$/)
    })

    it('should handle title with special characters', () => {
      const slug = generatePollSlug('Test @ Meeting #1! & More')
      expect(slug).toMatch(/^test-meeting-1-and-more-[a-z0-9]{4}$/)
    })

    it('should handle very long titles by truncating', () => {
      const longTitle = 'A'.repeat(100)
      const slug = generatePollSlug(longTitle)
      expect(slug.length).toBeLessThanOrEqual(35) // 30 + dash + 4 random chars
      expect(slug).toMatch(/^a+-[a-z0-9]{4}$/)
    })

    it('should handle unicode characters', () => {
      const slug = generatePollSlug('Meeting 会議 Réunion')
      expect(slug).toMatch(/^meeting-reunion-[a-z0-9]{4}$/)
    })

    it('should generate unique slugs for same title', () => {
      const slug1 = generatePollSlug('Same Title')
      const slug2 = generatePollSlug('Same Title')
      expect(slug1).not.toEqual(slug2)
    })
  })

  describe('mergeTimeRanges', () => {
    it('should return empty array for empty input', () => {
      const result = mergeTimeRanges([])
      expect(result).toEqual([])
    })

    it('should merge overlapping time ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '09:30', end: '11:00' },
      ]
      const result = mergeTimeRanges(ranges)
      expect(result).toEqual([{ start: '09:00', end: '11:00' }])
    })

    it('should merge adjacent time ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
      ]
      const result = mergeTimeRanges(ranges)
      expect(result).toEqual([{ start: '09:00', end: '11:00' }])
    })

    it('should not merge non-overlapping ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
      ]
      const result = mergeTimeRanges(ranges)
      expect(result).toEqual([
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
      ])
    })

    it('should handle unsorted ranges', () => {
      const ranges = [
        { start: '11:00', end: '12:00' },
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
      ]
      const result = mergeTimeRanges(ranges)
      expect(result).toEqual([{ start: '09:00', end: '12:00' }])
    })

    it('should handle multiple separate range groups', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '09:30', end: '10:30' },
        { start: '14:00', end: '15:00' },
        { start: '14:30', end: '16:00' },
      ]
      const result = mergeTimeRanges(ranges)
      expect(result).toEqual([
        { start: '09:00', end: '10:30' },
        { start: '14:00', end: '16:00' },
      ])
    })

    it('should handle range contained within another', () => {
      const ranges = [
        { start: '09:00', end: '12:00' },
        { start: '10:00', end: '11:00' },
      ]
      const result = mergeTimeRanges(ranges)
      expect(result).toEqual([{ start: '09:00', end: '12:00' }])
    })
  })

  describe('convertSelectedSlotsToAvailabilitySlots', () => {
    it('should convert empty slots', () => {
      const result = convertSelectedSlotsToAvailabilitySlots([])
      expect(result).toEqual([])
    })

    it('should convert single slot', () => {
      const slots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
          date: '2024-01-15',
        },
      ]
      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result).toEqual([
        {
          date: '2024-01-15',
          weekday: 1, // Monday
          ranges: [{ start: '09:00', end: '10:00' }],
        },
      ])
    })

    it('should group multiple slots on same date', () => {
      const slots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
          date: '2024-01-15',
        },
        {
          start: DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-15T15:00:00', { zone: 'UTC' }),
          date: '2024-01-15',
        },
      ]
      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result).toHaveLength(1)
      expect(result[0].ranges).toHaveLength(2)
    })

    it('should handle Sunday (weekday 7 -> 0)', () => {
      const slots = [
        {
          start: DateTime.fromISO('2024-01-14T09:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-14T10:00:00', { zone: 'UTC' }),
          date: '2024-01-14',
        },
      ]
      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result[0].weekday).toBe(0) // Sunday
    })

    it('should handle different dates', () => {
      const slots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
          date: '2024-01-15',
        },
        {
          start: DateTime.fromISO('2024-01-16T14:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-16T15:00:00', { zone: 'UTC' }),
          date: '2024-01-16',
        },
      ]
      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result).toHaveLength(2)
    })
  })

  describe('computeBaseAvailability', () => {
    const timezone = 'UTC'
    const monthStart = new Date('2024-01-01T00:00:00Z')
    const monthEnd = new Date('2024-01-31T23:59:59Z')

    it('should handle empty participant with no intervals', () => {
      const result = computeBaseAvailability(
        {},
        [],
        [],
        [],
        monthStart,
        monthEnd,
        timezone
      )
      // Should generate full day blocks
      expect(result.length).toBeGreaterThan(0)
    })

    it('should use default intervals when available', () => {
      const defaultIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const result = computeBaseAvailability(
        {},
        [],
        defaultIntervals,
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should subtract busy intervals from default intervals', () => {
      const defaultIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const busyIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T12:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T13:00:00', { zone: timezone })
        ),
      ]
      const result = computeBaseAvailability(
        {},
        [],
        defaultIntervals,
        busyIntervals,
        monthStart,
        monthEnd,
        timezone
      )
      // Should have split the interval around busy time
      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle participant with available_slots', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1,
            ranges: [{ start: '09:00', end: '17:00' }],
          },
        ],
        timezone: 'UTC',
      }
      const result = computeBaseAvailability(
        participant,
        [],
        [],
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle participant with date-specific slots', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1,
            date: '2024-01-15',
            ranges: [{ start: '09:00', end: '17:00' }],
          },
        ],
        timezone: 'UTC',
      }
      const result = computeBaseAvailability(
        participant,
        [],
        [],
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle participant with overrides removals', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1,
            date: '2024-01-15',
            ranges: [{ start: '09:00', end: '17:00' }],
            overrides: {
              removals: [{ start: '12:00', end: '13:00' }],
            },
          },
        ],
        timezone: 'UTC',
      }
      const result = computeBaseAvailability(
        participant,
        [],
        [],
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle recurring weekday removals', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1, // Monday
            ranges: [{ start: '09:00', end: '17:00' }],
            overrides: {
              removals: [{ start: '12:00', end: '13:00' }],
            },
          },
        ],
        timezone: 'UTC',
      }
      const result = computeBaseAvailability(
        participant,
        [],
        [],
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle busy intervals that do not overlap', () => {
      const defaultIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const busyIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-16T12:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-16T13:00:00', { zone: timezone })
        ),
      ]
      const result = computeBaseAvailability(
        {},
        [],
        defaultIntervals,
        busyIntervals,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result).toHaveLength(1)
    })

    it('should handle busy time at start of interval', () => {
      const defaultIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const busyIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T10:00:00', { zone: timezone })
        ),
      ]
      const result = computeBaseAvailability(
        {},
        [],
        defaultIntervals,
        busyIntervals,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].start?.toISO()).toContain('10:00')
    })

    it('should handle busy time at end of interval', () => {
      const defaultIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const busyIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T16:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const result = computeBaseAvailability(
        {},
        [],
        defaultIntervals,
        busyIntervals,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].end?.toISO()).toContain('16:00')
    })
  })

  describe('computeAvailabilityWithOverrides', () => {
    const timezone = 'UTC'
    const monthStart = new Date('2024-01-01T00:00:00Z')
    const monthEnd = new Date('2024-01-31T23:59:59Z')

    it('should handle empty selected slots', () => {
      const result = computeAvailabilityWithOverrides(
        [],
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result).toEqual([])
    })

    it('should detect additions (selected slots not in base)', () => {
      const selectedSlots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
      ]
      const result = computeAvailabilityWithOverrides(
        selectedSlots,
        [],
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].overrides?.additions).toBeDefined()
    })

    it('should detect removals (base slots not selected)', () => {
      const baseAvailability = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const selectedSlots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T12:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
      ]
      const result = computeAvailabilityWithOverrides(
        selectedSlots,
        baseAvailability,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
      const hasRemovals = result.some(slot => slot.overrides?.removals)
      expect(hasRemovals).toBe(true)
    })

    it('should handle gaps in coverage', () => {
      const baseAvailability = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const selectedSlots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
        {
          start: DateTime.fromISO('2024-01-15T12:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T13:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
      ]
      const result = computeAvailabilityWithOverrides(
        selectedSlots,
        baseAvailability,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle selected slots that match base exactly', () => {
      const baseAvailability = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone })
        ),
      ]
      const selectedSlots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T17:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
      ]
      const result = computeAvailabilityWithOverrides(
        selectedSlots,
        baseAvailability,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should merge time ranges in final result', () => {
      const selectedSlots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
        {
          start: DateTime.fromISO('2024-01-15T10:00:00', { zone: timezone }),
          end: DateTime.fromISO('2024-01-15T11:00:00', { zone: timezone }),
          date: '2024-01-15',
        },
      ]
      const baseAvailability = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: timezone }),
          DateTime.fromISO('2024-01-15T11:00:00', { zone: timezone })
        ),
      ]
      const result = computeAvailabilityWithOverrides(
        selectedSlots,
        baseAvailability,
        monthStart,
        monthEnd,
        timezone
      )
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('subtractBusyTimesFromBlocks', () => {
    it('should return blocks when no busy times', () => {
      const blocks = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractBusyTimesFromBlocks(blocks, [])
      expect(result).toEqual(blocks)
    })

    it('should subtract overlapping busy time', () => {
      const blocks = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const busyTimes = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T13:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractBusyTimesFromBlocks(blocks, busyTimes)
      expect(result.length).toBe(2)
    })

    it('should handle busy time that completely covers block', () => {
      const blocks = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T13:00:00', { zone: 'UTC' })
        ),
      ]
      const busyTimes = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractBusyTimesFromBlocks(blocks, busyTimes)
      expect(result).toEqual([])
    })

    it('should handle non-overlapping busy times', () => {
      const blocks = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' })
        ),
      ]
      const busyTimes = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T15:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractBusyTimesFromBlocks(blocks, busyTimes)
      expect(result).toEqual(blocks)
    })
  })

  describe('subtractRemovalIntervals', () => {
    it('should return intervals when no removals', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractRemovalIntervals(intervals, [])
      expect(result).toEqual(intervals)
    })

    it('should subtract removal from interval', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const removals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T13:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractRemovalIntervals(intervals, removals)
      expect(result.length).toBe(2)
    })

    it('should handle removal that completely removes interval', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T13:00:00', { zone: 'UTC' })
        ),
      ]
      const removals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' })
        ),
      ]
      const result = subtractRemovalIntervals(intervals, removals)
      expect(result).toEqual([])
    })
  })

  describe('generateFullDayBlocks', () => {
    it('should generate blocks for date range', () => {
      const start = new Date('2024-01-15T00:00:00Z')
      const end = new Date('2024-01-17T23:59:59Z')
      const result = generateFullDayBlocks(start, end, 'UTC')
      expect(result.length).toBe(3) // 3 days
    })

    it('should handle single day', () => {
      const start = new Date('2024-01-15T00:00:00Z')
      const end = new Date('2024-01-15T23:59:59Z')
      const result = generateFullDayBlocks(start, end, 'UTC')
      expect(result.length).toBe(1)
    })

    it('should handle timezone conversion', () => {
      const start = new Date('2024-01-15T00:00:00Z')
      const end = new Date('2024-01-17T23:59:59Z')
      const result = generateFullDayBlocks(start, end, 'America/New_York')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('clipIntervalsToBounds', () => {
    it('should clip intervals to bounds', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-10T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-20T17:00:00', { zone: 'UTC' })
        ),
      ]
      const bounds = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T00:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-17T23:59:59', { zone: 'UTC' })
        ),
      ]
      const result = clipIntervalsToBounds(intervals, bounds)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].start?.toISO()).toContain('2024-01-15')
      expect(result[0].end?.toISO()).toContain('2024-01-17')
    })

    it('should filter out intervals completely outside bounds', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-01T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-05T17:00:00', { zone: 'UTC' })
        ),
      ]
      const bounds = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T00:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-17T23:59:59', { zone: 'UTC' })
        ),
      ]
      const result = clipIntervalsToBounds(intervals, bounds)
      expect(result).toEqual([])
    })

    it('should keep intervals completely inside bounds', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-16T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-16T17:00:00', { zone: 'UTC' })
        ),
      ]
      const bounds = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T00:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-17T23:59:59', { zone: 'UTC' })
        ),
      ]
      const result = clipIntervalsToBounds(intervals, bounds)
      expect(result).toHaveLength(1)
    })
  })

  describe('getMonthRange', () => {
    it('should return start and end of month', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const { monthStart, monthEnd } = getMonthRange(date, 'UTC')
      expect(monthStart.toISOString()).toContain('2024-01-01')
      expect(monthEnd.toISOString()).toContain('2024-01-31')
    })

    it('should handle different timezones', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const { monthStart, monthEnd } = getMonthRange(date, 'America/New_York')
      expect(monthStart).toBeInstanceOf(Date)
      expect(monthEnd).toBeInstanceOf(Date)
    })

    it('should handle December correctly', () => {
      const date = new Date('2024-12-15T12:00:00Z')
      const { monthStart, monthEnd } = getMonthRange(date, 'UTC')
      expect(monthStart.toISOString()).toContain('2024-12-01')
      expect(monthEnd.toISOString()).toContain('2024-12-31')
    })

    it('should handle February in leap year', () => {
      const date = new Date('2024-02-15T12:00:00Z')
      const { monthStart, monthEnd } = getMonthRange(date, 'UTC')
      expect(monthStart.toISOString()).toContain('2024-02-01')
      expect(monthEnd.toISOString()).toContain('2024-02-29')
    })
  })

  describe('convertBusySlotsToIntervals', () => {
    it('should convert empty array', () => {
      const result = convertBusySlotsToIntervals([])
      expect(result).toEqual([])
    })

    it('should convert busy slots to intervals', () => {
      const busySlots = [
        {
          start: '2024-01-15T09:00:00Z',
          end: '2024-01-15T10:00:00Z',
        },
      ]
      const result = convertBusySlotsToIntervals(busySlots)
      expect(result).toHaveLength(1)
      expect(result[0].isValid).toBe(true)
    })

    it('should handle multiple busy slots', () => {
      const busySlots = [
        {
          start: '2024-01-15T09:00:00Z',
          end: '2024-01-15T10:00:00Z',
        },
        {
          start: '2024-01-15T14:00:00Z',
          end: '2024-01-15T15:00:00Z',
        },
      ]
      const result = convertBusySlotsToIntervals(busySlots)
      expect(result).toHaveLength(2)
    })
  })

  describe('computeAvailabilitySlotsWithOverrides', () => {
    const monthStart = new Date('2024-01-01T00:00:00Z')
    const monthEnd = new Date('2024-01-31T23:59:59Z')

    it('should handle empty inputs', () => {
      const result = computeAvailabilitySlotsWithOverrides(
        [],
        [],
        monthStart,
        monthEnd,
        'UTC'
      )
      expect(result).toEqual([])
    })

    it('should compute availability with overrides', () => {
      const selectedSlots = [
        {
          start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          end: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
          date: '2024-01-15',
        },
      ]
      const result = computeAvailabilitySlotsWithOverrides(
        selectedSlots,
        [],
        monthStart,
        monthEnd,
        'UTC'
      )
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('doSlotsOverlapOrContain', () => {
    it('should detect overlapping slots', () => {
      const slot1 = {
        start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' }),
      }
      const slot2 = {
        start: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
      }
      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(true)
    })

    it('should detect non-overlapping slots', () => {
      const slot1 = {
        start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
      }
      const slot2 = {
        start: DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' }),
      }
      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(false)
    })

    it('should detect adjacent slots as non-overlapping', () => {
      const slot1 = {
        start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
      }
      const slot2 = {
        start: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
      }
      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(false)
    })

    it('should detect containment', () => {
      const slot1 = {
        start: DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' }),
      }
      const slot2 = {
        start: DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' }),
        end: DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
      }
      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(true)
    })
  })

  describe('convertAvailabilityToSelectedSlots', () => {
    it('should convert empty arrays', () => {
      const result = convertAvailabilityToSelectedSlots([], [])
      expect(result).toEqual([])
    })

    it('should convert availability intervals to selected slots', () => {
      const availabilityIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const renderedSlots = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' })
        ),
      ]
      const result = convertAvailabilityToSelectedSlots(
        availabilityIntervals,
        renderedSlots
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle multiple rendered slots', () => {
      const availabilityIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T17:00:00', { zone: 'UTC' })
        ),
      ]
      const renderedSlots = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' })
        ),
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T15:00:00', { zone: 'UTC' })
        ),
      ]
      const result = convertAvailabilityToSelectedSlots(
        availabilityIntervals,
        renderedSlots
      )
      expect(result.length).toBe(2)
    })

    it('should filter out non-overlapping slots', () => {
      const availabilityIntervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' })
        ),
      ]
      const renderedSlots = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T15:00:00', { zone: 'UTC' })
        ),
      ]
      const result = convertAvailabilityToSelectedSlots(
        availabilityIntervals,
        renderedSlots
      )
      expect(result).toEqual([])
    })
  })

  describe('mergeLuxonIntervals', () => {
    it('should return empty for empty input', () => {
      const result = mergeLuxonIntervals([])
      expect(result).toEqual([])
    })

    it('should merge overlapping intervals', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' })
        ),
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T14:00:00', { zone: 'UTC' })
        ),
      ]
      const result = mergeLuxonIntervals(intervals)
      expect(result).toHaveLength(1)
    })

    it('should not merge non-overlapping intervals', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' })
        ),
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T11:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T12:00:00', { zone: 'UTC' })
        ),
      ]
      const result = mergeLuxonIntervals(intervals)
      expect(result).toHaveLength(2)
    })

    it('should filter out invalid intervals', () => {
      const intervals = [
        Interval.fromDateTimes(
          DateTime.fromISO('2024-01-15T09:00:00', { zone: 'UTC' }),
          DateTime.fromISO('2024-01-15T10:00:00', { zone: 'UTC' })
        ),
        Interval.invalid('test'),
      ]
      const result = mergeLuxonIntervals(intervals)
      expect(result).toHaveLength(1)
    })
  })

  describe('mergeAvailabilitySlots', () => {
    it('should merge empty arrays', () => {
      const result = mergeAvailabilitySlots([], [])
      expect(result).toEqual([])
    })

    it('should merge non-overlapping slots from different arrays', () => {
      const slots1: AvailabilitySlot[] = [
        {
          weekday: 1,
          date: '2024-01-15',
          ranges: [{ start: '09:00', end: '12:00' }],
        },
      ]
      const slots2: AvailabilitySlot[] = [
        {
          weekday: 2,
          date: '2024-01-16',
          ranges: [{ start: '14:00', end: '17:00' }],
        },
      ]
      const result = mergeAvailabilitySlots(slots1, slots2)
      expect(result).toHaveLength(2)
    })

    it('should merge slots for same date', () => {
      const slots1: AvailabilitySlot[] = [
        {
          weekday: 1,
          date: '2024-01-15',
          ranges: [{ start: '09:00', end: '12:00' }],
        },
      ]
      const slots2: AvailabilitySlot[] = [
        {
          weekday: 1,
          date: '2024-01-15',
          ranges: [{ start: '14:00', end: '17:00' }],
        },
      ]
      const result = mergeAvailabilitySlots(slots1, slots2)
      expect(result.length).toBeGreaterThan(0)
      // The function merges ranges for the same date
      const slot = result.find(s => s.date === '2024-01-15')
      expect(slot).toBeDefined()
      expect(slot?.ranges.length).toBeGreaterThan(0)
    })
  })

  describe('convertAvailabilitySlotRangesToIntervals', () => {
    const monthStart = new Date('2024-01-01T00:00:00Z')
    const monthEnd = new Date('2024-01-31T23:59:59Z')

    it('should convert date-specific slot', () => {
      const slot: AvailabilitySlot = {
        weekday: 1,
        date: '2024-01-15',
        ranges: [{ start: '09:00', end: '17:00' }],
      }
      const result = convertAvailabilitySlotRangesToIntervals(
        slot,
        monthStart,
        monthEnd,
        'UTC',
        'UTC'
      )
      expect(result.length).toBeGreaterThan(0)
    })

    it('should convert recurring weekday slot', () => {
      const slot: AvailabilitySlot = {
        weekday: 1,
        ranges: [{ start: '09:00', end: '17:00' }],
      }
      const result = convertAvailabilitySlotRangesToIntervals(
        slot,
        monthStart,
        monthEnd,
        'UTC',
        'UTC'
      )
      expect(result.length).toBeGreaterThan(1) // Multiple Mondays
    })

    it('should handle empty ranges', () => {
      const slot: AvailabilitySlot = {
        weekday: 1,
        date: '2024-01-15',
        ranges: [],
      }
      const result = convertAvailabilitySlotRangesToIntervals(
        slot,
        monthStart,
        monthEnd,
        'UTC',
        'UTC'
      )
      expect(result).toEqual([])
    })

    it('should filter slots outside month range', () => {
      const slot: AvailabilitySlot = {
        weekday: 1,
        date: '2023-12-15',
        ranges: [{ start: '09:00', end: '17:00' }],
      }
      const result = convertAvailabilitySlotRangesToIntervals(
        slot,
        monthStart,
        monthEnd,
        'UTC',
        'UTC'
      )
      expect(result).toEqual([])
    })
  })

  describe('extractOverrideIntervals', () => {
    const monthStart = new Date('2024-01-01T00:00:00Z')
    const monthEnd = new Date('2024-01-31T23:59:59Z')

    it('should extract additions and removals for date-specific slot', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1,
            date: '2024-01-15',
            ranges: [{ start: '09:00', end: '17:00' }],
            overrides: {
              additions: [{ start: '08:00', end: '09:00' }],
              removals: [{ start: '12:00', end: '13:00' }],
            },
          },
        ],
        timezone: 'UTC',
      }
      const result = extractOverrideIntervals(
        participant,
        monthStart,
        monthEnd,
        'UTC'
      )
      expect(result.additions.length).toBe(1)
      expect(result.removals.length).toBe(1)
    })

    it('should handle slot without overrides', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1,
            date: '2024-01-15',
            ranges: [{ start: '09:00', end: '17:00' }],
          },
        ],
        timezone: 'UTC',
      }
      const result = extractOverrideIntervals(
        participant,
        monthStart,
        monthEnd,
        'UTC'
      )
      expect(result.additions).toEqual([])
      expect(result.removals).toEqual([])
    })

    it('should handle recurring weekday with overrides', () => {
      const participant = {
        available_slots: [
          {
            weekday: 1, // Monday
            ranges: [{ start: '09:00', end: '17:00' }],
            overrides: {
              removals: [{ start: '12:00', end: '13:00' }],
            },
          },
        ],
        timezone: 'UTC',
      }
      const result = extractOverrideIntervals(
        participant,
        monthStart,
        monthEnd,
        'UTC'
      )
      // Should create removals for all Mondays in January
      expect(result.removals.length).toBe(5) // 5 Mondays in January 2024
    })
  })

  describe('processPollParticipantAvailabilities', () => {
    it('should process empty poll data', () => {
      const pollData = { poll: { participants: [] } }
      const result = processPollParticipantAvailabilities(
        pollData as any,
        {},
        new Date('2024-01-15'),
        new Date('2024-01-20'),
        'UTC'
      )
      expect(result.size).toBe(0)
    })

    it('should process participant with available slots', () => {
      const pollData = {
        poll: {
          participants: [
            {
              id: 'p1',
              guest_email: 'test@example.com',
              available_slots: [
                {
                  weekday: 1,
                  date: '2024-01-15',
                  ranges: [{ start: '09:00', end: '17:00' }],
                },
              ],
              timezone: 'UTC',
              participant_type: QuickPollParticipantType.SCHEDULER,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'confirmed' as any,
            },
          ],
        },
      }
      const groupAvailability = {
        slot1: ['test@example.com'],
      }
      const result = processPollParticipantAvailabilities(
        pollData as any,
        groupAvailability,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'UTC',
        null,
        true
      )
      expect(result.size).toBe(1)
    })

    it('should handle participants without timezone', () => {
      const pollData = {
        poll: {
          participants: [
            {
              id: 'p1',
              guest_email: 'test@example.com',
              available_slots: [
                {
                  weekday: 1,
                  date: '2024-01-15',
                  ranges: [{ start: '09:00', end: '17:00' }],
                },
              ],
              participant_type: QuickPollParticipantType.SCHEDULER,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'confirmed' as any,
            },
          ],
        },
      }
      const groupAvailability = {
        slot1: ['test@example.com'],
      }
      const result = processPollParticipantAvailabilities(
        pollData as any,
        groupAvailability,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'UTC',
        null,
        true
      )
      expect(result.size).toBe(1)
    })
  })

  describe('createMockMeetingMembers', () => {
    it('should return all participants when user is host', () => {
      const pollData = {
        poll: {
          id: 'poll1',
          participants: [
            {
              id: 'p1',
              guest_email: 'host@example.com',
              participant_type: QuickPollParticipantType.SCHEDULER,
              account_address: '0xhost',
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'confirmed' as any,
              available_slots: [],
            },
            {
              id: 'p2',
              guest_email: 'guest@example.com',
              participant_type: QuickPollParticipantType.INVITEE,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'pending' as any,
              available_slots: [],
            },
          ],
        },
      }
      const result = createMockMeetingMembers(pollData as any, null, true)
      expect(result.length).toBe(2)
    })

    it('should return all participants when SEE_GUEST_LIST permission', () => {
      const pollData = {
        poll: {
          id: 'poll1',
          permissions: [MeetingPermissions.SEE_GUEST_LIST],
          participants: [
            {
              id: 'p1',
              guest_email: 'host@example.com',
              participant_type: QuickPollParticipantType.SCHEDULER,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'confirmed' as any,
              available_slots: [],
            },
            {
              id: 'p2',
              guest_email: 'guest@example.com',
              participant_type: QuickPollParticipantType.INVITEE,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'pending' as any,
              available_slots: [],
            },
          ],
        },
      }
      const result = createMockMeetingMembers(pollData as any, null, false)
      expect(result.length).toBe(2)
    })

    it('should return only host and current user when no permission', () => {
      const pollData = {
        poll: {
          id: 'poll1',
          permissions: [],
          participants: [
            {
              id: 'p1',
              guest_email: 'host@example.com',
              participant_type: QuickPollParticipantType.SCHEDULER,
              account_address: '0xhost',
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'confirmed' as any,
              available_slots: [],
            },
            {
              id: 'p2',
              guest_email: 'guest@example.com',
              participant_type: QuickPollParticipantType.INVITEE,
              account_address: '0xguest',
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'pending' as any,
              available_slots: [],
            },
          ],
        },
      }
      const currentAccount = { address: '0xguest' }
      const result = createMockMeetingMembers(
        pollData as any,
        currentAccount as any,
        false
      )
      expect(result.length).toBe(2)
    })

    it('should handle guest email identification', () => {
      const pollData = {
        poll: {
          id: 'poll1',
          permissions: [],
          participants: [
            {
              id: 'p1',
              guest_email: 'host@example.com',
              participant_type: QuickPollParticipantType.SCHEDULER,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'confirmed' as any,
              available_slots: [],
            },
            {
              id: 'p2',
              guest_email: 'current@example.com',
              participant_type: QuickPollParticipantType.INVITEE,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'pending' as any,
              available_slots: [],
            },
          ],
        },
      }
      const result = createMockMeetingMembers(
        pollData as any,
        null,
        false,
        'current@example.com'
      )
      // Should return host + current guest
      expect(result.length).toBeGreaterThan(0)
    })

    it('should use existing accounts map', () => {
      const existingAccounts = [
        {
          address: 'test@example.com',
          preferences: {
            name: 'Test User',
            timezone: 'America/New_York',
            availabilities: [],
            meetingProviders: [],
          },
        },
      ]
      const pollData = {
        poll: {
          id: 'poll1',
          participants: [
            {
              id: 'p1',
              guest_email: 'test@example.com',
              account_address: 'test@example.com',
              participant_type: QuickPollParticipantType.INVITEE,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'pending' as any,
              available_slots: [],
            },
          ],
        },
      }
      const result = createMockMeetingMembers(
        pollData as any,
        null,
        true,
        undefined,
        existingAccounts as any
      )
      expect(result.length).toBe(1)
      expect(result[0].preferences?.name).toBe('Test User')
    })

    it('should handle participant with guest_name', () => {
      const pollData = {
        poll: {
          id: 'poll1',
          participants: [
            {
              id: 'p1',
              guest_email: 'guest@example.com',
              guest_name: 'Guest Name',
              participant_type: QuickPollParticipantType.INVITEE,
              poll_id: 'poll1',
              created_at: '2024-01-01',
              status: 'pending' as any,
              available_slots: [],
            },
          ],
        },
      }
      const result = createMockMeetingMembers(pollData as any, null, true)
      expect(result.length).toBe(1)
      expect(result[0].preferences?.name).toBe('Guest Name')
    })
  })
})
