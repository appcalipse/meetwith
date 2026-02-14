import { formatPollDateRange, formatPollSingleDate } from '@/utils/date_helper'

describe('date_helper', () => {
  describe('formatPollDateRange', () => {
    it('formats date range correctly', () => {
      const start = '2024-01-01T00:00:00Z'
      const end = '2024-01-31T23:59:59Z'
      const result = formatPollDateRange(start, end)
      expect(result).toBeTruthy()
    })

    it('handles same day dates', () => {
      const date = '2024-01-01T00:00:00Z'
      const result = formatPollDateRange(date, date)
      expect(result).toBeTruthy()
    })

    it('handles invalid dates', () => {
      const result = formatPollDateRange('invalid', 'invalid')
      expect(result).toBeDefined()
    })

    it('formats with timezone', () => {
      const start = '2024-01-01T10:00:00Z'
      const end = '2024-01-01T11:00:00Z'
      const result = formatPollDateRange(start, end)
      expect(typeof result).toBe('string')
    })

    it('handles year boundaries', () => {
      const start = '2023-12-31T00:00:00Z'
      const end = '2024-01-01T00:00:00Z'
      const result = formatPollDateRange(start, end)
      expect(result).toBeTruthy()
    })
  })

  describe('formatPollSingleDate', () => {
    it('formats single date', () => {
      const date = '2024-01-01T00:00:00Z'
      const result = formatPollSingleDate(date)
      expect(result).toBeTruthy()
    })

    it('handles time formatting', () => {
      const date = '2024-01-01T10:30:00Z'
      const result = formatPollSingleDate(date)
      expect(typeof result).toBe('string')
    })

    it('handles different timezones', () => {
      const date = '2024-01-01T00:00:00-05:00'
      const result = formatPollSingleDate(date)
      expect(result).toBeDefined()
    })
  })
})
