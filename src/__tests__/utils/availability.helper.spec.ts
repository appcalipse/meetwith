import { AvailabilityBlock } from '@/types/availability'
import {
  formatDayGroup,
  formatTime,
  getCurrentEditingBlock,
  getFormattedSchedule,
  getHoursPerWeek,
  initializeEmptyAvailabilities,
  validateAvailabilityBlock,
} from '@/utils/availability.helper'

describe('availability helper functions', () => {
  describe('getHoursPerWeek', () => {
    it('returns 0hrs/week for empty availabilities', () => {
      expect(getHoursPerWeek([])).toBe('0hrs/week')
      expect(getHoursPerWeek([{ weekday: 0, ranges: [] }])).toBe('0hrs/week')
    })

    it('calculates total hours correctly for single day', () => {
      const availabilities = [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '17:00' }],
        },
      ]
      expect(getHoursPerWeek(availabilities)).toBe('8hrs/week')
    })

    it('calculates total hours correctly for multiple days', () => {
      const availabilities = [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '17:00' }],
        },
        {
          weekday: 2,
          ranges: [{ start: '10:00', end: '18:00' }],
        },
      ]
      expect(getHoursPerWeek(availabilities)).toBe('16hrs/week')
    })
  })

  describe('formatTime', () => {
    it('returns empty string for undefined time', () => {
      expect(formatTime(undefined)).toBe('')
    })

    it('formats time correctly in 12-hour format', () => {
      expect(formatTime('09:00')).toMatch(/9:00\s?[AaPp][Mm]/)
      expect(formatTime('13:00')).toMatch(/1:00\s?[AaPp][Mm]/)
      expect(formatTime('00:00')).toMatch(/12:00\s?[AaPp][Mm]/)
    })
  })

  describe('getFormattedSchedule', () => {
    it('returns empty array for empty availabilities', () => {
      expect(getFormattedSchedule([])).toEqual([])
    })

    it('formats single day correctly', () => {
      const availabilities = [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '17:00' }],
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0]).toMatch(
        /Mon\s?:\s?\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })

    it('groups consecutive days with same time', () => {
      const availabilities = [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '17:00' }],
        },
        {
          weekday: 2,
          ranges: [{ start: '09:00', end: '17:00' }],
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0]).toMatch(
        /Mon - Tue\s?:\s?\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })
  })

  describe('formatDayGroup', () => {
    it('returns empty string for empty days array', () => {
      expect(formatDayGroup([], '09:00 - 17:00')).toBe('')
    })

    it('formats single day correctly', () => {
      expect(formatDayGroup([1], '09:00 - 17:00')).toBe('Mon : 09:00 - 17:00')
    })

    it('formats consecutive days with dash', () => {
      expect(formatDayGroup([1, 2], '09:00 - 17:00')).toBe(
        'Mon - Tue : 09:00 - 17:00'
      )
    })

    it('formats non-consecutive days with comma', () => {
      expect(formatDayGroup([1, 3], '09:00 - 17:00')).toBe(
        'Mon, Wed : 09:00 - 17:00'
      )
    })
  })

  describe('initializeEmptyAvailabilities', () => {
    it('creates array with 7 empty days', () => {
      const result = initializeEmptyAvailabilities()
      expect(result.length).toBe(7)
      expect(result.every(day => day.ranges.length === 0)).toBe(true)
      expect(result.map(day => day.weekday)).toEqual([0, 1, 2, 3, 4, 5, 6])
    })
  })

  describe('validateAvailabilityBlock', () => {
    it('requires title', () => {
      const result = validateAvailabilityBlock('', [])
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Title required')
    })

    it('requires at least one availability', () => {
      const result = validateAvailabilityBlock('Test Block', [])
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Availability required')
    })

    it('validates valid block', () => {
      const result = validateAvailabilityBlock('Test Block', [
        {
          weekday: 1,
          ranges: [{ start: '09:00', end: '17:00' }],
        },
      ])
      expect(result.isValid).toBe(true)
    })
  })

  describe('getCurrentEditingBlock', () => {
    const mockBlocks: AvailabilityBlock[] = [
      {
        id: '1',
        title: 'Block 1',
        timezone: 'UTC',
        availabilities: [],
        isDefault: false,
      },
      {
        id: '2',
        title: 'Block 2',
        timezone: 'UTC',
        availabilities: [],
        isDefault: false,
      },
    ]

    it('returns undefined when blocks is undefined', () => {
      expect(getCurrentEditingBlock(undefined, '1')).toBeUndefined()
    })

    it('returns undefined when block id not found', () => {
      expect(getCurrentEditingBlock(mockBlocks, '3')).toBeUndefined()
    })

    it('returns correct block when found', () => {
      const result = getCurrentEditingBlock(mockBlocks, '1')
      expect(result).toBeDefined()
      expect(result?.id).toBe('1')
      expect(result?.title).toBe('Block 1')
    })
  })
})
