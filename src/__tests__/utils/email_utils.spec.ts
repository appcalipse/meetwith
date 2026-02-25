import {
  formatDateForEmail,
  formatDaysRemainingForEmail,
  getDisplayNameForEmail,
} from '@/utils/email_utils'

describe('email_utils', () => {
  describe('formatDateForEmail', () => {
    it('should format Date objects correctly', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = formatDateForEmail(date)
      expect(result).toMatch(/Jan/)
      expect(result).toMatch(/15/)
      expect(result).toMatch(/2024/)
    })

    it('should format date strings correctly', () => {
      const result = formatDateForEmail('2024-06-20T10:30:00Z')
      expect(result).toMatch(/Jun/)
      expect(result).toMatch(/20/)
      expect(result).toMatch(/2024/)
    })

    it('should return empty string for invalid dates', () => {
      expect(formatDateForEmail('invalid-date')).toBe('')
      expect(formatDateForEmail('not-a-date')).toBe('')
    })

    it('should handle different date formats', () => {
      const date = new Date('2024-12-31')
      const result = formatDateForEmail(date)
      expect(result).toMatch(/Dec/)
      expect(result).toMatch(/31/)
      expect(result).toMatch(/2024/)
    })
  })

  describe('getDisplayNameForEmail', () => {
    it('should return "there" for ellipsized addresses', () => {
      expect(getDisplayNameForEmail('0x123...abcde')).toBe('there')
      expect(getDisplayNameForEmail('0xABC...12345')).toBe('there')
      expect(getDisplayNameForEmail('0xabc...ABCDE')).toBe('there')
    })

    it('should return the name for non-ellipsized addresses', () => {
      expect(getDisplayNameForEmail('John Doe')).toBe('John Doe')
      expect(getDisplayNameForEmail('Alice')).toBe('Alice')
      expect(getDisplayNameForEmail('user@example.com')).toBe('user@example.com')
    })

    it('should return the name for full addresses', () => {
      expect(
        getDisplayNameForEmail('0x1234567890abcdef1234567890abcdef12345678')
      ).toBe('0x1234567890abcdef1234567890abcdef12345678')
    })

    it('should handle edge cases', () => {
      expect(getDisplayNameForEmail('0x12...abc')).toBe('0x12...abc')
      expect(getDisplayNameForEmail('0x1234...abcde')).toBe('0x1234...abcde')
      expect(getDisplayNameForEmail('123...abcde')).toBe('123...abcde')
    })
  })

  describe('formatDaysRemainingForEmail', () => {
    it('should return "today" for 0 days', () => {
      expect(formatDaysRemainingForEmail(0)).toBe('today')
    })

    it('should return "1 day" for 1 day', () => {
      expect(formatDaysRemainingForEmail(1)).toBe('1 day')
    })

    it('should return correct format for multiple days', () => {
      expect(formatDaysRemainingForEmail(2)).toBe('2 days')
      expect(formatDaysRemainingForEmail(5)).toBe('5 days')
      expect(formatDaysRemainingForEmail(30)).toBe('30 days')
      expect(formatDaysRemainingForEmail(365)).toBe('365 days')
    })

    it('should handle negative days', () => {
      expect(formatDaysRemainingForEmail(-1)).toBe('-1 days')
      expect(formatDaysRemainingForEmail(-5)).toBe('-5 days')
    })
  })
})
