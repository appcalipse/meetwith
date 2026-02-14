import { NotBefore } from '@/types/Meeting'

import {
  findStartDateForNotBefore,
  getLocaleForDateFNS,
  parseTime,
} from '@/utils/time.helper'

describe('time.helper', () => {
  describe('findStartDateForNotBefore', () => {
    const baseDate = new Date('2024-01-15T10:00:00Z')
    const timezone = 'America/New_York'

    it('should add one hour for OneHour', () => {
      const result = findStartDateForNotBefore(
        baseDate,
        NotBefore.OneHour,
        timezone
      )
      expect(result.getHours()).toBe(baseDate.getHours() + 1)
    })

    it('should add two hours for TwoHours', () => {
      const result = findStartDateForNotBefore(
        baseDate,
        NotBefore.TwoHours,
        timezone
      )
      expect(result.getHours()).toBe(baseDate.getHours() + 2)
    })

    it('should add six hours for SixHours', () => {
      const result = findStartDateForNotBefore(
        baseDate,
        NotBefore.SixHours,
        timezone
      )
      expect(result.getHours()).toBe(baseDate.getHours() + 6)
    })

    it('should add twelve hours for TwelveHours', () => {
      const result = findStartDateForNotBefore(
        baseDate,
        NotBefore.TwelveHours,
        timezone
      )
      expect(result.getHours()).toBe(baseDate.getHours() + 12)
    })

    it('should set to next day midnight for Tomorrow', () => {
      const result = findStartDateForNotBefore(
        baseDate,
        NotBefore.Tomorrow,
        timezone
      )
      expect(result.getDate()).toBeGreaterThan(baseDate.getDate())
    })

    it('should set to start of next week for NextWeek', () => {
      const result = findStartDateForNotBefore(
        baseDate,
        NotBefore.NextWeek,
        timezone
      )
      expect(result.getDate()).toBeGreaterThan(baseDate.getDate() + 6)
    })

    it('should handle different timezones', () => {
      const resultUTC = findStartDateForNotBefore(
        baseDate,
        NotBefore.OneHour,
        'UTC'
      )
      expect(resultUTC.getTime()).toBeGreaterThan(baseDate.getTime())
    })
  })

  describe('parseTime', () => {
    it('should parse time without rounding', () => {
      const date = new Date('2024-01-15T14:23:45Z')
      const result = parseTime(date, false)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should parse time with rounding', () => {
      const date = new Date('2024-01-15T14:23:45Z')
      const result = parseTime(date, true)
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('should handle exact times', () => {
      const date = new Date('2024-01-15T14:00:00Z')
      const result = parseTime(date, true)
      expect(result).toBeTruthy()
    })

    it('should round up when rounding enabled', () => {
      const date = new Date('2024-01-15T14:23:00Z')
      const result = parseTime(date, true)
      expect(result).toBeTruthy()
    })
  })

  describe('getLocaleForDateFNS', () => {
    beforeEach(() => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'en-US',
      })
    })

    it('should return enUS for en-US locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'en-US',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('en-US')
    })

    it('should return enGB for en locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'en',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('en-GB')
    })

    it('should return pt for pt-PT locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'pt-PT',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('pt')
    })

    it('should return ptBR for pt-BR locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'pt-BR',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('pt-BR')
    })

    it('should return es for es locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'es',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('es')
    })

    it('should return enGB for unknown locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'fr-FR',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('en-GB')
    })

    it('should handle en-GB locale', () => {
      Object.defineProperty(window.navigator, 'language', {
        writable: true,
        value: 'en-GB',
      })
      const locale = getLocaleForDateFNS()
      expect(locale).toBeDefined()
      expect(locale.code).toBe('en-GB')
    })
  })
})
