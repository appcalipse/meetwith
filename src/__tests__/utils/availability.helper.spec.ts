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
      expect(getHoursPerWeek([{ ranges: [], weekday: 0 }])).toBe('0hrs/week')
    })

    it('calculates total hours correctly for single day', () => {
      const availabilities = [
        {
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: 1,
        },
      ]
      expect(getHoursPerWeek(availabilities)).toBe('8hrs/week')
    })

    it('calculates total hours correctly for multiple days', () => {
      const availabilities = [
        {
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: 1,
        },
        {
          ranges: [{ end: '18:00', start: '10:00' }],
          weekday: 2,
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
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: 1,
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0].weekdays).toBe('Mon')
      expect(result[0].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })

    it('groups consecutive days with same time', () => {
      const availabilities = [
        {
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: 1,
        },
        {
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: 2,
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0].weekdays).toBe('Mon - Tue')
      expect(result[0].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })

    // Tests for the multi-range fix
    it('formats multiple ranges for a single day', () => {
      const availabilities = [
        {
          ranges: [
            { end: '17:00', start: '09:00' },
            { end: '23:00', start: '20:00' },
          ],
          weekday: 1,
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0].weekdays).toBe('Mon')
      expect(result[0].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm],\s?\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })

    it('groups consecutive days that share identical multi-range sets', () => {
      const availabilities = [
        {
          ranges: [
            { end: '17:00', start: '09:00' },
            { end: '23:00', start: '20:00' },
          ],
          weekday: 1,
        },
        {
          ranges: [
            { end: '17:00', start: '09:00' },
            { end: '23:00', start: '20:00' },
          ],
          weekday: 2,
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0].weekdays).toBe('Mon - Tue')
      expect(result[0].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm],\s?\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })

    it('does not group days when multi-range sets differ', () => {
      const availabilities = [
        {
          ranges: [
            { end: '17:00', start: '09:00' },
            { end: '23:00', start: '20:00' },
          ],
          weekday: 1,
        },
        {
          ranges: [
            { end: '17:00', start: '09:00' },
            // Missing the evening range on Tuesday
          ],
          weekday: 2,
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(2)
      expect(result[0].weekdays).toBe('Mon')
      expect(result[0].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm],\s?\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
      expect(result[1].weekdays).toBe('Tue')
      expect(result[1].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })

    it('treats range order as irrelevant when grouping', () => {
      const availabilities = [
        {
          ranges: [
            // Intentionally reversed order
            { end: '23:00', start: '20:00' },
            { end: '17:00', start: '09:00' },
          ],
          weekday: 1,
        },
        {
          ranges: [
            { end: '17:00', start: '09:00' },
            { end: '23:00', start: '20:00' },
          ],
          weekday: 2,
        },
      ]
      const result = getFormattedSchedule(availabilities)
      expect(result.length).toBe(1)
      expect(result[0].weekdays).toBe('Mon - Tue')
      expect(result[0].timeRange).toMatch(
        /\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm],\s?\d{1,2}:\d{2}\s?[AaPp][Mm]\s?-\s?\d{1,2}:\d{2}\s?[AaPp][Mm]/
      )
    })
  })

  describe('formatDayGroup', () => {
    it('returns empty object for empty days array', () => {
      expect(formatDayGroup([], '09:00 - 17:00')).toEqual({
        timeRange: '',
        weekdays: '',
      })
    })

    it('formats single day correctly', () => {
      expect(formatDayGroup([1], '09:00 - 17:00')).toEqual({
        timeRange: '09:00 - 17:00',
        weekdays: 'Mon',
      })
    })

    it('formats consecutive days with dash', () => {
      expect(formatDayGroup([1, 2], '09:00 - 17:00')).toEqual({
        timeRange: '09:00 - 17:00',
        weekdays: 'Mon - Tue',
      })
    })

    it('formats non-consecutive days with comma', () => {
      expect(formatDayGroup([1, 3], '09:00 - 17:00')).toEqual({
        timeRange: '09:00 - 17:00',
        weekdays: 'Mon, Wed',
      })
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
          ranges: [{ end: '17:00', start: '09:00' }],
          weekday: 1,
        },
      ])
      expect(result.isValid).toBe(true)
    })
  })

  describe('getCurrentEditingBlock', () => {
    const mockBlocks: AvailabilityBlock[] = [
      {
        id: '1',
        isDefault: false,
        timezone: 'UTC',
        title: 'Block 1',
        weekly_availability: [],
      },
      {
        id: '2',
        isDefault: false,
        timezone: 'UTC',
        title: 'Block 2',
        weekly_availability: [],
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
        { ranges: [], weekday: 0 }, // Sunday
        { ranges: [], weekday: 6 }, // Saturday
        { ranges: [], weekday: 3 }, // Wednesday
        { ranges: [], weekday: 1 }, // Monday
        { ranges: [], weekday: 5 }, // Friday
        { ranges: [], weekday: 2 }, // Tuesday
        { ranges: [], weekday: 4 }, // Thursday
      ]

      const sorted = sortAvailabilitiesByWeekday(availabilities)
      const weekdays = sorted.map(a => a.weekday)

      expect(weekdays).toEqual([1, 2, 3, 4, 5, 6, 0]) // Mon, Tue, Wed, Thu, Fri, Sat, Sun
    })

    it('preserves original data structure', () => {
      const availabilities = [
        { ranges: [{ end: '17:00', start: '09:00' }], weekday: 0 },
        { ranges: [{ end: '18:00', start: '10:00' }], weekday: 1 },
      ]

      const sorted = sortAvailabilitiesByWeekday(availabilities)

      expect(sorted[0].weekday).toBe(1)
      expect(sorted[0].ranges).toEqual([{ end: '18:00', start: '10:00' }])
      expect(sorted[1].weekday).toBe(0)
      expect(sorted[1].ranges).toEqual([{ end: '17:00', start: '09:00' }])
    })

    it('handles empty array', () => {
      const result = sortAvailabilitiesByWeekday([])
      expect(result).toEqual([])
    })

    it('handles single item', () => {
      const availabilities = [{ ranges: [], weekday: 3 }]
      const result = sortAvailabilitiesByWeekday(availabilities)
      expect(result).toEqual(availabilities)
    })
  })

  describe('handleCopyToDays', () => {
    const mockAvailabilities = [
      { ranges: [], weekday: 0 },
      { ranges: [], weekday: 1 },
      { ranges: [], weekday: 2 },
      { ranges: [], weekday: 3 },
      { ranges: [], weekday: 4 },
      { ranges: [], weekday: 5 },
      { ranges: [], weekday: 6 },
    ]

    const mockRanges = [{ end: '17:00', start: '09:00' }]
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
