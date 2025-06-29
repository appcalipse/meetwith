import { AvailabilityBlock } from '@/types/availability'
import {
  formatDayGroup,
  formatTime,
  getCurrentEditingBlock,
  getDayName,
  getFormattedSchedule,
  getHoursPerWeek,
  handleCopyToDays,
  initializeEmptyAvailabilities,
  sortAvailabilitiesByWeekday,
  validateAvailabilityBlock,
  validateTimeFormat,
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
        weekly_availability: [],
        isDefault: false,
      },
      {
        id: '2',
        title: 'Block 2',
        timezone: 'UTC',
        weekly_availability: [],
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

  describe('getDayName', () => {
    it('returns correct day names for all weekdays', () => {
      expect(getDayName(0)).toBe('Sunday')
      expect(getDayName(1)).toBe('Monday')
      expect(getDayName(2)).toBe('Tuesday')
      expect(getDayName(3)).toBe('Wednesday')
      expect(getDayName(4)).toBe('Thursday')
      expect(getDayName(5)).toBe('Friday')
      expect(getDayName(6)).toBe('Saturday')
    })

    it('handles out of range weekdays gracefully', () => {
      expect(getDayName(-1)).toBeUndefined()
      expect(getDayName(7)).toBeUndefined()
    })
  })

  describe('validateTimeFormat', () => {
    it('validates correct time formats', () => {
      expect(validateTimeFormat('00:00')).toBe(true)
      expect(validateTimeFormat('09:30')).toBe(true)
      expect(validateTimeFormat('12:00')).toBe(true)
      expect(validateTimeFormat('23:59')).toBe(true)
    })

    it('rejects invalid time formats', () => {
      expect(validateTimeFormat('24:00')).toBe(false)
      expect(validateTimeFormat('12:60')).toBe(false)
      expect(validateTimeFormat('09:5')).toBe(false)
      expect(validateTimeFormat('invalid')).toBe(false)
      expect(validateTimeFormat('')).toBe(false)
    })

    it('handles edge cases', () => {
      expect(validateTimeFormat('00:00')).toBe(true)
      expect(validateTimeFormat('23:59')).toBe(true)
      expect(validateTimeFormat('00:59')).toBe(true)
      expect(validateTimeFormat('23:00')).toBe(true)
    })
  })

  describe('sortAvailabilitiesByWeekday', () => {
    it('sorts availabilities correctly - Monday to Friday first, then Sunday and Saturday', () => {
      const availabilities = [
        { weekday: 0, ranges: [] }, // Sunday
        { weekday: 6, ranges: [] }, // Saturday
        { weekday: 3, ranges: [] }, // Wednesday
        { weekday: 1, ranges: [] }, // Monday
        { weekday: 5, ranges: [] }, // Friday
        { weekday: 2, ranges: [] }, // Tuesday
        { weekday: 4, ranges: [] }, // Thursday
      ]

      const sorted = sortAvailabilitiesByWeekday(availabilities)
      const weekdays = sorted.map(a => a.weekday)

      expect(weekdays).toEqual([1, 2, 3, 4, 5, 0, 6]) // Mon, Tue, Wed, Thu, Fri, Sun, Sat
    })

    it('preserves original data structure', () => {
      const availabilities = [
        { weekday: 0, ranges: [{ start: '09:00', end: '17:00' }] },
        { weekday: 1, ranges: [{ start: '10:00', end: '18:00' }] },
      ]

      const sorted = sortAvailabilitiesByWeekday(availabilities)

      expect(sorted[0].weekday).toBe(1)
      expect(sorted[0].ranges).toEqual([{ start: '10:00', end: '18:00' }])
      expect(sorted[1].weekday).toBe(0)
      expect(sorted[1].ranges).toEqual([{ start: '09:00', end: '17:00' }])
    })

    it('handles empty array', () => {
      const result = sortAvailabilitiesByWeekday([])
      expect(result).toEqual([])
    })

    it('handles single item', () => {
      const availabilities = [{ weekday: 3, ranges: [] }]
      const result = sortAvailabilitiesByWeekday(availabilities)
      expect(result).toEqual(availabilities)
    })
  })

  describe('handleCopyToDays', () => {
    const mockAvailabilities = [
      { weekday: 0, ranges: [] },
      { weekday: 1, ranges: [] },
      { weekday: 2, ranges: [] },
      { weekday: 3, ranges: [] },
      { weekday: 4, ranges: [] },
      { weekday: 5, ranges: [] },
      { weekday: 6, ranges: [] },
    ]

    const mockRanges = [{ start: '09:00', end: '17:00' }]
    const mockOnChange = jest.fn()

    beforeEach(() => {
      mockOnChange.mockClear()
    })

    it('copies to all other days when copyType is "all"', () => {
      const result = handleCopyToDays(
        1,
        mockRanges,
        'all',
        mockAvailabilities,
        mockOnChange
      )

      expect(mockOnChange).toHaveBeenCalledTimes(6) // All days except Monday (1)
      expect(mockOnChange).toHaveBeenCalledWith(0, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(2, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(3, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(4, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(5, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(6, mockRanges)
      expect(result.copyTypeText).toBe('all other days')
    })

    it('copies to weekdays when copyType is "weekdays"', () => {
      const result = handleCopyToDays(
        1,
        mockRanges,
        'weekdays',
        mockAvailabilities,
        mockOnChange
      )

      expect(mockOnChange).toHaveBeenCalledTimes(5) // Monday to Friday
      expect(mockOnChange).toHaveBeenCalledWith(1, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(2, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(3, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(4, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(5, mockRanges)
      expect(result.copyTypeText).toBe('weekdays (Mon-Fri)')
    })

    it('copies to weekends when copyType is "weekends"', () => {
      const result = handleCopyToDays(
        1,
        mockRanges,
        'weekends',
        mockAvailabilities,
        mockOnChange
      )

      expect(mockOnChange).toHaveBeenCalledTimes(2) // Sunday and Saturday
      expect(mockOnChange).toHaveBeenCalledWith(0, mockRanges)
      expect(mockOnChange).toHaveBeenCalledWith(6, mockRanges)
      expect(result.copyTypeText).toBe('weekends (Sat-Sun)')
    })

    it('creates new range arrays to avoid mutation', () => {
      handleCopyToDays(
        1,
        mockRanges,
        'weekdays',
        mockAvailabilities,
        mockOnChange
      )

      // Verify that new arrays are created (not the same reference)
      const calls = mockOnChange.mock.calls
      calls.forEach(([_weekday, ranges]) => {
        expect(ranges).not.toBe(mockRanges) // Different reference
        expect(ranges).toEqual(mockRanges) // Same content
      })
    })
  })
})
