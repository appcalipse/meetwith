import { DateTime, Interval } from 'luxon'

import {
  addMinutesToTime,
  buildHourlyTimeRangeLabelRows,
  calculateEffectiveDuration,
  compareTimes,
  durationToAddLabel,
  formatDurationCreateLabel,
  getLabelRowHeightPx,
  isValidDurationOption,
  LabelRow,
  parseDurationInput,
  subtractMinutesFromTime,
} from '@/utils/duration.helper'

describe('duration.helper', () => {
  describe('parseDurationInput', () => {
    it('should parse numeric minutes', () => {
      expect(parseDurationInput('30')).toBe(30)
      expect(parseDurationInput('60')).toBe(60)
      expect(parseDurationInput('90')).toBe(90)
    })

    it('should parse H:MM format', () => {
      expect(parseDurationInput('1:30')).toBe(90)
      expect(parseDurationInput('2:00')).toBe(120)
      expect(parseDurationInput('2:55')).toBe(175)
    })

    it('should handle edge cases', () => {
      expect(parseDurationInput('1')).toBe(1)
      expect(parseDurationInput('480')).toBe(480)
      expect(parseDurationInput('8:00')).toBe(480)
    })

    it('should return null for invalid inputs', () => {
      expect(parseDurationInput('')).toBeNull()
      expect(parseDurationInput('  ')).toBeNull()
      expect(parseDurationInput('abc')).toBeNull()
      expect(parseDurationInput('0')).toBeNull()
      expect(parseDurationInput('481')).toBeNull()
      expect(parseDurationInput('-10')).toBeNull()
    })

    it('should return null for invalid time format', () => {
      expect(parseDurationInput('1:60')).toBeNull()
      expect(parseDurationInput('1:70')).toBeNull()
      expect(parseDurationInput('1:2:3')).toBeNull()
      expect(parseDurationInput('::30')).toBeNull()
    })

    it('should handle whitespace', () => {
      expect(parseDurationInput(' 30 ')).toBe(30)
      expect(parseDurationInput(' 1:30 ')).toBe(90)
    })
  })

  describe('durationToAddLabel', () => {
    it('should format hours only', () => {
      expect(durationToAddLabel(60)).toBe('1 hour')
      expect(durationToAddLabel(120)).toBe('2 hours')
      expect(durationToAddLabel(180)).toBe('3 hours')
    })

    it('should format minutes only', () => {
      expect(durationToAddLabel(1)).toBe('1 minute')
      expect(durationToAddLabel(30)).toBe('30 minutes')
      expect(durationToAddLabel(45)).toBe('45 minutes')
    })

    it('should format hours and minutes', () => {
      expect(durationToAddLabel(90)).toBe('1 hour 30 minutes')
      expect(durationToAddLabel(135)).toBe('2 hours 15 minutes')
      expect(durationToAddLabel(175)).toBe('2 hours 55 minutes')
    })

    it('should handle edge cases', () => {
      expect(durationToAddLabel(61)).toBe('1 hour 1 minute')
      expect(durationToAddLabel(121)).toBe('2 hours 1 minute')
    })
  })

  describe('formatDurationCreateLabel', () => {
    it('should format valid durations', () => {
      expect(formatDurationCreateLabel('30')).toBe('Add 30 minutes')
      expect(formatDurationCreateLabel('60')).toBe('Add 1 hour')
      expect(formatDurationCreateLabel('90')).toBe('Add 1 hour 30 minutes')
      expect(formatDurationCreateLabel('2:55')).toBe('Add 2 hours 55 minutes')
    })

    it('should return invalid message for invalid inputs', () => {
      expect(formatDurationCreateLabel('abc')).toBe('Invalid duration')
      expect(formatDurationCreateLabel('500')).toBe('Invalid duration')
      expect(formatDurationCreateLabel('-10')).toBe('Invalid duration')
    })
  })

  describe('isValidDurationOption', () => {
    it('should return true for valid durations', () => {
      expect(isValidDurationOption('30')).toBe(true)
      expect(isValidDurationOption('60')).toBe(true)
      expect(isValidDurationOption('1:30')).toBe(true)
      expect(isValidDurationOption('480')).toBe(true)
    })

    it('should return false for invalid durations', () => {
      expect(isValidDurationOption('abc')).toBe(false)
      expect(isValidDurationOption('500')).toBe(false)
      expect(isValidDurationOption('-10')).toBe(false)
      expect(isValidDurationOption('')).toBe(false)
    })
  })

  describe('addMinutesToTime', () => {
    it('should add minutes correctly', () => {
      expect(addMinutesToTime('10:00', 30)).toBe('10:30')
      expect(addMinutesToTime('09:45', 30)).toBe('10:15')
      expect(addMinutesToTime('23:30', 15)).toBe('23:45')
    })

    it('should handle hour transitions', () => {
      expect(addMinutesToTime('10:50', 20)).toBe('11:10')
      expect(addMinutesToTime('23:50', 20)).toBe('24:00')
    })

    it('should cap at 24:00', () => {
      expect(addMinutesToTime('23:00', 120)).toBe('24:00')
      expect(addMinutesToTime('20:00', 300)).toBe('24:00')
    })

    it('should pad with zeros', () => {
      expect(addMinutesToTime('09:05', 5)).toBe('09:10')
      expect(addMinutesToTime('00:00', 30)).toBe('00:30')
    })
  })

  describe('subtractMinutesFromTime', () => {
    it('should subtract minutes correctly', () => {
      expect(subtractMinutesFromTime('10:30', 30)).toBe('10:00')
      expect(subtractMinutesFromTime('10:15', 30)).toBe('09:45')
      expect(subtractMinutesFromTime('23:45', 15)).toBe('23:30')
    })

    it('should handle hour transitions', () => {
      expect(subtractMinutesFromTime('11:10', 20)).toBe('10:50')
      expect(subtractMinutesFromTime('01:10', 20)).toBe('00:50')
    })

    it('should floor at 00:00', () => {
      expect(subtractMinutesFromTime('01:00', 120)).toBe('00:00')
      expect(subtractMinutesFromTime('05:00', 500)).toBe('00:00')
    })

    it('should pad with zeros', () => {
      expect(subtractMinutesFromTime('09:10', 5)).toBe('09:05')
      expect(subtractMinutesFromTime('01:00', 30)).toBe('00:30')
    })
  })

  describe('compareTimes', () => {
    it('should return negative when a < b', () => {
      expect(compareTimes('09:00', '10:00')).toBeLessThan(0)
      expect(compareTimes('09:30', '09:45')).toBeLessThan(0)
      expect(compareTimes('00:00', '23:59')).toBeLessThan(0)
    })

    it('should return zero when equal', () => {
      expect(compareTimes('10:00', '10:00')).toBe(0)
      expect(compareTimes('09:30', '09:30')).toBe(0)
    })

    it('should return positive when a > b', () => {
      expect(compareTimes('10:00', '09:00')).toBeGreaterThan(0)
      expect(compareTimes('09:45', '09:30')).toBeGreaterThan(0)
      expect(compareTimes('23:59', '00:00')).toBeGreaterThan(0)
    })
  })

  describe('getLabelRowHeightPx', () => {
    it('should use heightPx if provided', () => {
      const row: LabelRow = { label: 'Test', heightPx: 100 }
      expect(getLabelRowHeightPx(row, 30, 'preset')).toBe(100)
    })

    it('should calculate height for timeRange mode', () => {
      const row: LabelRow = { label: 'Test', heightMinutes: 60 }
      const result = getLabelRowHeightPx(row, 30, 'timeRange')
      expect(result).toBeGreaterThan(0)
    })

    it('should calculate height for preset mode with different slot durations', () => {
      const row: LabelRow = { label: 'Test' }
      const result30 = getLabelRowHeightPx(row, 30, 'preset')
      const result45 = getLabelRowHeightPx(row, 45, 'preset')
      expect(result30).toBeGreaterThan(0)
      expect(result45).toBeGreaterThan(0)
    })

    it('should handle custom mode', () => {
      const row: LabelRow = { label: 'Test' }
      const result = getLabelRowHeightPx(row, 30, 'custom')
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('buildHourlyTimeRangeLabelRows', () => {
    it('should create 24 hourly labels', () => {
      const slots: Array<Interval<true>> = []
      const result = buildHourlyTimeRangeLabelRows(slots, 'America/New_York')
      expect(result).toHaveLength(24)
      expect(result[0]).toHaveProperty('label')
      expect(result[0]).toHaveProperty('heightPx')
    })

    it('should format labels correctly', () => {
      const slots: Array<Interval<true>> = []
      const result = buildHourlyTimeRangeLabelRows(slots, 'America/New_York')
      expect(result[0].label).toMatch(/00:00/)
      expect(result[12].label).toMatch(/12:00/)
    })

    it('should calculate heights based on slots', () => {
      const start = DateTime.fromObject(
        { year: 2024, month: 1, day: 1, hour: 9, minute: 0 },
        { zone: 'America/New_York' }
      )
      const end = start.plus({ minutes: 30 })
      const slots = [Interval.fromDateTimes(start, end)]

      const result = buildHourlyTimeRangeLabelRows(slots, 'America/New_York')
      expect(result[9].heightPx).toBeGreaterThan(0)
    })
  })

  describe('calculateEffectiveDuration', () => {
    it('should return duration for preset mode', () => {
      expect(calculateEffectiveDuration('preset', 60, null)).toBe(60)
      expect(calculateEffectiveDuration('preset', 90, null)).toBe(90)
    })

    it('should return duration for custom mode', () => {
      expect(calculateEffectiveDuration('custom', 45, null)).toBe(45)
    })

    it('should calculate duration from timeRange', () => {
      const timeRange = { startTime: '09:00', endTime: '10:30' }
      expect(calculateEffectiveDuration('timeRange', 60, timeRange)).toBe(90)
    })

    it('should handle different time ranges', () => {
      const timeRange1 = { startTime: '08:00', endTime: '08:30' }
      expect(calculateEffectiveDuration('timeRange', 60, timeRange1)).toBe(30)

      const timeRange2 = { startTime: '14:15', endTime: '16:45' }
      expect(calculateEffectiveDuration('timeRange', 60, timeRange2)).toBe(150)
    })

    it('should return base duration if no timeRange provided in timeRange mode', () => {
      expect(calculateEffectiveDuration('timeRange', 60, null)).toBe(60)
    })
  })
})
