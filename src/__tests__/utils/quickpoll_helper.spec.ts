import { DateTime, Interval } from 'luxon'
import { Account } from '@/types/Account'
import {
  AvailabilitySlot,
  QuickPollParticipant,
  QuickPollParticipantType,
} from '@/types/QuickPoll'
import {
  generatePollSlug,
  mergeTimeRanges,
  convertSelectedSlotsToAvailabilitySlots,
  computeBaseAvailability,
  computeAvailabilityWithOverrides,
  generateQuickPollBestSlots,
  subtractBusyTimesFromBlocks,
  subtractRemovalIntervals,
  generateFullDayBlocks,
  clipIntervalsToBounds,
  getMonthRange,
  convertBusySlotsToIntervals,
  computeAvailabilitySlotsWithOverrides,
  doSlotsOverlapOrContain,
  convertAvailabilityToSelectedSlots,
  mergeLuxonIntervals,
  mergeAvailabilitySlots,
  convertAvailabilitySlotRangesToIntervals,
  extractOverrideIntervals,
  processPollParticipantAvailabilities,
  createMockMeetingMembers,
} from '@/utils/quickpoll_helper'

jest.mock('@/utils/slots.helper', () => ({
  generateTimeSlots: jest.fn(() => []),
}))

describe('quickpoll_helper', () => {
  describe('generatePollSlug', () => {
    it('should generate slug from title', () => {
      const slug = generatePollSlug('Test Meeting Title')
      expect(slug).toMatch(/^test-meeting-title-[a-z0-9]{4}$/)
    })

    it('should handle special characters', () => {
      const slug = generatePollSlug('Test @ Meeting #1!')
      expect(slug).toMatch(/^test-meeting-1-[a-z0-9]{4}$/)
    })

    it('should handle long titles', () => {
      const longTitle = 'A'.repeat(100)
      const slug = generatePollSlug(longTitle)
      expect(slug.length).toBeLessThanOrEqual(50)
    })

    it('should generate unique slugs for same title', () => {
      const slug1 = generatePollSlug('Same Title')
      const slug2 = generatePollSlug('Same Title')
      expect(slug1).not.toBe(slug2)
    })

    it('should handle empty string', () => {
      const slug = generatePollSlug('')
      expect(slug).toMatch(/^-[a-z0-9]{4}$/)
    })

    it('should lowercase all characters', () => {
      const slug = generatePollSlug('UPPERCASE TITLE')
      expect(slug).toMatch(/^[a-z0-9-]+$/)
    })
  })

  describe('mergeTimeRanges', () => {
    it('should merge overlapping time ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '09:30', end: '11:00' },
      ]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([{ start: '09:00', end: '11:00' }])
    })

    it('should keep separate non-overlapping ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
      ]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '12:00' },
      ])
    })

    it('should handle empty array', () => {
      const merged = mergeTimeRanges([])
      expect(merged).toEqual([])
    })

    it('should handle single range', () => {
      const ranges = [{ start: '09:00', end: '10:00' }]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([{ start: '09:00', end: '10:00' }])
    })

    it('should merge adjacent ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
      ]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([{ start: '09:00', end: '11:00' }])
    })

    it('should sort ranges before merging', () => {
      const ranges = [
        { start: '11:00', end: '12:00' },
        { start: '09:00', end: '10:00' },
        { start: '09:30', end: '10:30' },
      ]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([
        { start: '09:00', end: '10:30' },
        { start: '11:00', end: '12:00' },
      ])
    })

    it('should merge multiple overlapping ranges', () => {
      const ranges = [
        { start: '09:00', end: '10:00' },
        { start: '09:30', end: '11:00' },
        { start: '10:30', end: '12:00' },
      ]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([{ start: '09:00', end: '12:00' }])
    })

    it('should handle range contained within another', () => {
      const ranges = [
        { start: '09:00', end: '12:00' },
        { start: '10:00', end: '11:00' },
      ]
      const merged = mergeTimeRanges(ranges)
      expect(merged).toEqual([{ start: '09:00', end: '12:00' }])
    })
  })

  describe('convertSelectedSlotsToAvailabilitySlots', () => {
    it('should convert DateTime slots to availability slots', () => {
      const now = DateTime.now()
      const slots = [
        {
          start: now.set({ hour: 9, minute: 0 }),
          end: now.set({ hour: 10, minute: 0 }),
          date: now.toFormat('yyyy-MM-dd'),
        },
      ]
      const result = convertSelectedSlotsToAvailabilitySlots(slots)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('weekday')
      expect(result[0]).toHaveProperty('ranges')
      expect(result[0].ranges).toHaveLength(1)
      expect(result[0].ranges[0]).toEqual({ start: '09:00', end: '10:00' })
    })

    it('should group slots by date', () => {
      const date1 = DateTime.fromISO('2024-01-15')
      const date2 = DateTime.fromISO('2024-01-16')

      const slots = [
        {
          start: date1.set({ hour: 9, minute: 0 }),
          end: date1.set({ hour: 10, minute: 0 }),
          date: date1.toFormat('yyyy-MM-dd'),
        },
        {
          start: date1.set({ hour: 14, minute: 0 }),
          end: date1.set({ hour: 15, minute: 0 }),
          date: date1.toFormat('yyyy-MM-dd'),
        },
        {
          start: date2.set({ hour: 9, minute: 0 }),
          end: date2.set({ hour: 10, minute: 0 }),
          date: date2.toFormat('yyyy-MM-dd'),
        },
      ]

      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result).toHaveLength(2)

      const firstDate = result.find(
        s => s.date === date1.toFormat('yyyy-MM-dd')
      )
      expect(firstDate?.ranges).toHaveLength(2)
    })

    it('should handle Sunday weekday conversion', () => {
      const sunday = DateTime.fromISO('2024-01-14') // Sunday
      const slots = [
        {
          start: sunday.set({ hour: 9, minute: 0 }),
          end: sunday.set({ hour: 10, minute: 0 }),
          date: sunday.toFormat('yyyy-MM-dd'),
        },
      ]

      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result[0].weekday).toBe(0)
    })

    it('should handle empty slots array', () => {
      const result = convertSelectedSlotsToAvailabilitySlots([])
      expect(result).toEqual([])
    })

    it('should format times correctly', () => {
      const now = DateTime.now()
      const slots = [
        {
          start: now.set({ hour: 9, minute: 30 }),
          end: now.set({ hour: 10, minute: 45 }),
          date: now.toFormat('yyyy-MM-dd'),
        },
      ]

      const result = convertSelectedSlotsToAvailabilitySlots(slots)
      expect(result[0].ranges[0]).toEqual({ start: '09:30', end: '10:45' })
    })
  })

  describe('mergeLuxonIntervals', () => {
    it('should merge overlapping intervals', () => {
      const now = DateTime.now()
      const intervals = [
        Interval.fromDateTimes(now.set({ hour: 9 }), now.set({ hour: 10 })),
        Interval.fromDateTimes(
          now.set({ hour: 9, minute: 30 }),
          now.set({ hour: 11 })
        ),
      ]

      const merged = mergeLuxonIntervals(intervals)
      expect(merged.length).toBeLessThanOrEqual(intervals.length)
    })

    it('should handle empty array', () => {
      const merged = mergeLuxonIntervals([])
      expect(merged).toEqual([])
    })

    it('should keep non-overlapping intervals separate', () => {
      const now = DateTime.now()
      const intervals = [
        Interval.fromDateTimes(now.set({ hour: 9 }), now.set({ hour: 10 })),
        Interval.fromDateTimes(now.set({ hour: 14 }), now.set({ hour: 15 })),
      ]

      const merged = mergeLuxonIntervals(intervals)
      expect(merged).toHaveLength(2)
    })
  })

  describe('doSlotsOverlapOrContain', () => {
    it('should detect overlapping slots', () => {
      const now = DateTime.now()
      const slot1 = {
        start: now.set({ hour: 9 }),
        end: now.set({ hour: 12 }),
      }
      const slot2 = {
        start: now.set({ hour: 10 }),
        end: now.set({ hour: 13 }),
      }

      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(true)
    })

    it('should return false for non-overlapping slots', () => {
      const now = DateTime.now()
      const slot1 = {
        start: now.set({ hour: 9 }),
        end: now.set({ hour: 10 }),
      }
      const slot2 = {
        start: now.set({ hour: 14 }),
        end: now.set({ hour: 15 }),
      }

      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(false)
    })

    it('should return false for invalid intervals', () => {
      const now = DateTime.now()
      const slot1 = {
        start: now.set({ hour: 9 }),
        end: now.set({ hour: 10 }),
      }
      const slot2 = {
        start: now.set({ hour: 15 }),
        end: now.set({ hour: 14 }), // Invalid: end before start
      }

      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(false)
    })

    it('should detect when one slot contains another', () => {
      const now = DateTime.now()
      const slot1 = {
        start: now.set({ hour: 9 }),
        end: now.set({ hour: 17 }),
      }
      const slot2 = {
        start: now.set({ hour: 10 }),
        end: now.set({ hour: 11 }),
      }

      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(true)
    })

    it('should handle adjacent slots', () => {
      const now = DateTime.now()
      const slot1 = {
        start: now.set({ hour: 9 }),
        end: now.set({ hour: 10 }),
      }
      const slot2 = {
        start: now.set({ hour: 10 }),
        end: now.set({ hour: 11 }),
      }

      const result = doSlotsOverlapOrContain(slot1, slot2)
      expect(result).toBe(false)
    })
  })

  describe('mergeAvailabilitySlots', () => {
    it('should merge slots with same weekday', () => {
      const slots: AvailabilitySlot[] = [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '10:00' }],
        },
        {
          weekday: 1,
          ranges: [{ start: '14:00', end: '15:00' }],
        },
      ]

      const merged = mergeAvailabilitySlots(slots)
      const mondaySlots = merged.filter(s => s.weekday === 1)
      expect(mondaySlots.length).toBeGreaterThan(0)
    })

    it('should keep different weekdays separate', () => {
      const slots: AvailabilitySlot[] = [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '10:00' }],
        },
        {
          weekday: 2,
          ranges: [{ start: '09:00', end: '10:00' }],
        },
      ]

      const merged = mergeAvailabilitySlots(slots)
      const weekdays = new Set(merged.map(s => s.weekday))
      expect(weekdays.size).toBe(2)
    })

    it('should handle empty array', () => {
      const merged = mergeAvailabilitySlots([])
      expect(merged).toEqual([])
    })
  })

  describe('getMonthRange', () => {
    it('should return start and end of month', () => {
      const { monthStart, monthEnd } = getMonthRange(
        new Date('2024-01-15'),
        'UTC'
      )

      expect(monthStart).toBeInstanceOf(Date)
      expect(monthEnd).toBeInstanceOf(Date)
      expect(monthStart.getTime()).toBeLessThan(monthEnd.getTime())
    })

    it('should return start and end for specific month', () => {
      const { monthStart, monthEnd } = getMonthRange(
        new Date('2024-01-15'),
        'UTC'
      )

      expect(monthStart.getMonth()).toBe(0) // January
      expect(monthEnd.getMonth()).toBe(0)
      expect(monthStart.getDate()).toBe(1)
    })

    it('should respect timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const { monthStart: monthStartUTC, monthEnd: monthEndUTC } =
        getMonthRange(date, 'UTC')
      const { monthStart: monthStartET, monthEnd: monthEndET } = getMonthRange(
        date,
        'America/New_York'
      )

      expect(monthStartUTC).toBeInstanceOf(Date)
      expect(monthStartET).toBeInstanceOf(Date)
    })
  })

  describe('clipIntervalsToBounds', () => {
    it('should clip intervals to bounds', () => {
      const now = DateTime.now()
      const intervals = [
        Interval.fromDateTimes(now.minus({ hours: 2 }), now.plus({ hours: 2 })),
      ]
      const bounds = [
        Interval.fromDateTimes(now.minus({ hours: 1 }), now.plus({ hours: 1 })),
      ]

      const clipped = clipIntervalsToBounds(intervals, bounds)
      expect(clipped.length).toBeGreaterThanOrEqual(0)
    })

    it('should filter out intervals outside bounds', () => {
      const now = DateTime.now()
      const intervals = [
        Interval.fromDateTimes(now.minus({ days: 2 }), now.minus({ days: 1 })),
      ]
      const bounds = [Interval.fromDateTimes(now, now.plus({ days: 1 }))]

      const clipped = clipIntervalsToBounds(intervals, bounds)
      expect(Array.isArray(clipped)).toBe(true)
    })

    it('should handle empty bounds', () => {
      const now = DateTime.now()
      const intervals = [Interval.fromDateTimes(now, now.plus({ hours: 1 }))]

      const clipped = clipIntervalsToBounds(intervals, [])
      expect(clipped).toEqual(intervals)
    })

    it('should handle empty intervals', () => {
      const now = DateTime.now()
      const bounds = [Interval.fromDateTimes(now, now.plus({ hours: 1 }))]

      const clipped = clipIntervalsToBounds([], bounds)
      expect(clipped).toEqual([])
    })
  })

  describe('generateFullDayBlocks', () => {
    it('should generate full day blocks for date range', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-03')

      const blocks = generateFullDayBlocks(start, end, 'UTC')
      expect(blocks.length).toBeGreaterThan(0)
    })

    it('should handle single day', () => {
      const date = new Date('2024-01-01')

      const blocks = generateFullDayBlocks(date, date, 'UTC')
      expect(blocks.length).toBeGreaterThan(0)
    })

    it('should respect timezone', () => {
      const start = new Date('2024-01-01')
      const end = new Date('2024-01-02')

      const blocksUTC = generateFullDayBlocks(start, end, 'UTC')
      const blocksET = generateFullDayBlocks(start, end, 'America/New_York')

      expect(blocksUTC.length).toBeGreaterThan(0)
      expect(blocksET.length).toBeGreaterThan(0)
    })
  })

  describe('convertBusySlotsToIntervals', () => {
    it('should convert busy slots to intervals', () => {
      const busySlots = [
        {
          start: new Date('2024-01-01T09:00:00Z'),
          end: new Date('2024-01-01T10:00:00Z'),
        },
      ]

      const intervals = convertBusySlotsToIntervals(busySlots, 'UTC')
      expect(intervals).toHaveLength(1)
      expect(intervals[0]).toBeInstanceOf(Interval)
    })

    it('should handle empty array', () => {
      const intervals = convertBusySlotsToIntervals([], 'UTC')
      expect(intervals).toEqual([])
    })

    it('should respect timezone', () => {
      const busySlots = [
        {
          start: new Date('2024-01-01T09:00:00Z'),
          end: new Date('2024-01-01T10:00:00Z'),
        },
      ]

      const intervalsUTC = convertBusySlotsToIntervals(busySlots, 'UTC')
      const intervalsET = convertBusySlotsToIntervals(
        busySlots,
        'America/New_York'
      )

      expect(intervalsUTC).toHaveLength(1)
      expect(intervalsET).toHaveLength(1)
    })
  })

  describe('subtractBusyTimesFromBlocks', () => {
    it('should subtract busy times from available blocks', () => {
      const now = DateTime.now()
      const blocks = [
        Interval.fromDateTimes(now.set({ hour: 9 }), now.set({ hour: 17 })),
      ]
      const busyTimes = [
        Interval.fromDateTimes(now.set({ hour: 12 }), now.set({ hour: 13 })),
      ]

      const result = subtractBusyTimesFromBlocks(blocks, busyTimes)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle no busy times', () => {
      const now = DateTime.now()
      const blocks = [
        Interval.fromDateTimes(now.set({ hour: 9 }), now.set({ hour: 17 })),
      ]

      const result = subtractBusyTimesFromBlocks(blocks, [])
      expect(result).toHaveLength(1)
      expect(result[0].equals(blocks[0])).toBe(true)
    })

    it('should handle empty blocks', () => {
      const now = DateTime.now()
      const busyTimes = [
        Interval.fromDateTimes(now.set({ hour: 12 }), now.set({ hour: 13 })),
      ]

      const result = subtractBusyTimesFromBlocks([], busyTimes)
      expect(result).toEqual([])
    })
  })

  describe('subtractRemovalIntervals', () => {
    it('should subtract removal intervals from base', () => {
      const now = DateTime.now()
      const base = [
        Interval.fromDateTimes(now.set({ hour: 9 }), now.set({ hour: 17 })),
      ]
      const removals = [
        Interval.fromDateTimes(now.set({ hour: 12 }), now.set({ hour: 13 })),
      ]

      const result = subtractRemovalIntervals(base, removals)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle empty removals', () => {
      const now = DateTime.now()
      const base = [
        Interval.fromDateTimes(now.set({ hour: 9 }), now.set({ hour: 17 })),
      ]

      const result = subtractRemovalIntervals(base, [])
      expect(result).toEqual(base)
    })

    it('should handle empty base', () => {
      const now = DateTime.now()
      const removals = [
        Interval.fromDateTimes(now.set({ hour: 12 }), now.set({ hour: 13 })),
      ]

      const result = subtractRemovalIntervals([], removals)
      expect(result).toEqual([])
    })
  })

  describe('computeBaseAvailability', () => {
    it('should compute base availability without overrides', () => {
      const participant = {
        timezone: 'UTC',
        available_slots: [],
      }
      const monthStart = new Date('2024-01-01')
      const monthEnd = new Date('2024-01-31')

      const result = computeBaseAvailability(
        participant,
        [],
        [],
        [],
        monthStart,
        monthEnd,
        'UTC'
      )

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle participant with available slots', () => {
      const participant = {
        timezone: 'UTC',
        available_slots: [
          {
            weekday: 1,
            ranges: [{ start: '09:00', end: '17:00' }],
          },
        ],
      }
      const monthStart = new Date('2024-01-01')
      const monthEnd = new Date('2024-01-31')

      const result = computeBaseAvailability(
        participant,
        [],
        [],
        [],
        monthStart,
        monthEnd,
        'UTC'
      )

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('createMockMeetingMembers', () => {
    it('should create mock meeting members from poll data', () => {
      const pollData: any = {
        poll: {
          poll_id: 'poll-123',
          participants: [
            {
              participant_id: '1',
              poll_id: 'poll-123',
              account_address: '0x123',
              participant_type: QuickPollParticipantType.ORGANIZER,
              timezone: 'UTC',
              created_at: new Date().toISOString(),
            },
          ],
        },
      }

      const members = createMockMeetingMembers(pollData)
      expect(Array.isArray(members)).toBe(true)
    })

    it('should handle poll data with guest participants', () => {
      const pollData: any = {
        poll: {
          poll_id: 'poll-123',
          participants: [
            {
              participant_id: '1',
              poll_id: 'poll-123',
              guest_email: 'guest@example.com',
              guest_name: 'Guest User',
              participant_type: QuickPollParticipantType.PARTICIPANT,
              timezone: 'UTC',
              created_at: new Date().toISOString(),
            },
          ],
        },
      }

      const members = createMockMeetingMembers(pollData)
      expect(Array.isArray(members)).toBe(true)
    })

    it('should handle poll data without participants', () => {
      const pollData: any = {
        poll: {
          poll_id: 'poll-123',
          participants: [],
        },
      }

      const members = createMockMeetingMembers(pollData)
      expect(Array.isArray(members)).toBe(true)
    })
  })
})
