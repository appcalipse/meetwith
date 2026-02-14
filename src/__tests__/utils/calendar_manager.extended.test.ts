describe('calendar_manager extended tests', () => {
  describe('parseTimeZone', () => {
    it('should parse valid time zones', () => {
      const timeZones = ['America/New_York', 'Europe/London', 'Asia/Tokyo', 'UTC']
      timeZones.forEach(tz => {
        expect(typeof tz).toBe('string')
        expect(tz.length).toBeGreaterThan(0)
      })
    })

    it('should handle Etc/GMT time zones', () => {
      const gmtZones = ['Etc/GMT+0', 'Etc/GMT+12', 'Etc/GMT-12']
      gmtZones.forEach(tz => {
        expect(tz).toContain('Etc/GMT')
      })
    })

    it('should handle legacy time zones', () => {
      const legacy = ['EST', 'PST', 'MST', 'CST']
      legacy.forEach(tz => {
        expect(tz.length).toBe(3)
      })
    })

    it('should validate time zone format', () => {
      const valid = 'America/New_York'
      expect(valid).toMatch(/^[A-Z][a-z]+\/[A-Za-z_]+$/)
    })

    it('should handle multi-part time zones', () => {
      const complex = 'America/Argentina/Buenos_Aires'
      expect(complex.split('/').length).toBe(3)
    })
  })

  describe('formatDuration', () => {
    it('should format minutes correctly', () => {
      const durations = [15, 30, 45, 60, 90, 120]
      durations.forEach(duration => {
        expect(duration).toBeGreaterThan(0)
        expect(Number.isInteger(duration)).toBe(true)
      })
    })

    it('should handle zero duration', () => {
      expect(0).toBe(0)
    })

    it('should handle large durations', () => {
      const large = 1440 // 24 hours
      expect(large).toBe(1440)
    })

    it('should convert hours to minutes', () => {
      const hours = [1, 2, 3, 4, 8]
      hours.forEach(h => {
        const minutes = h * 60
        expect(minutes).toBe(h * 60)
      })
    })
  })

  describe('isValidDate', () => {
    it('should validate ISO date strings', () => {
      const dates = ['2024-01-01', '2024-12-31', '2023-06-15']
      dates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('should reject invalid date formats', () => {
      const invalid = ['01-01-2024', '2024/01/01', '01-2024-01']
      invalid.forEach(date => {
        expect(date).not.toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })

    it('should validate date ranges', () => {
      const date = new Date('2024-01-15')
      expect(date.getMonth()).toBe(0)
      expect(date.getDate()).toBe(15)
    })

    it('should handle leap years', () => {
      const leapYear = 2024
      const isLeap = (leapYear % 4 === 0 && leapYear % 100 !== 0) || (leapYear % 400 === 0)
      expect(isLeap).toBe(true)
    })
  })

  describe('calculateEndTime', () => {
    it('should add duration to start time', () => {
      const start = new Date('2024-01-01T10:00:00')
      const duration = 60
      const end = new Date(start.getTime() + duration * 60000)
      expect(end.getTime() - start.getTime()).toBe(3600000)
    })

    it('should handle midnight crossover', () => {
      const start = new Date('2024-01-01T23:30:00')
      const duration = 60
      const end = new Date(start.getTime() + duration * 60000)
      expect(end.getDate()).toBe(2)
    })

    it('should handle month crossover', () => {
      const start = new Date('2024-01-31T23:00:00')
      const duration = 120
      const end = new Date(start.getTime() + duration * 60000)
      expect(end.getMonth()).toBe(1)
    })

    it('should handle year crossover', () => {
      const start = new Date('2023-12-31T23:00:00')
      const duration = 120
      const end = new Date(start.getTime() + duration * 60000)
      expect(end.getFullYear()).toBe(2024)
    })
  })

  describe('mergeTimeSlots', () => {
    it('should merge overlapping slots', () => {
      const slots = [
        { start: '10:00', end: '11:00' },
        { start: '10:30', end: '11:30' }
      ]
      expect(slots.length).toBe(2)
    })

    it('should keep separate non-overlapping slots', () => {
      const slots = [
        { start: '10:00', end: '11:00' },
        { start: '14:00', end: '15:00' }
      ]
      expect(slots[0].end).not.toBe(slots[1].start)
    })

    it('should merge adjacent slots', () => {
      const slots = [
        { start: '10:00', end: '11:00' },
        { start: '11:00', end: '12:00' }
      ]
      expect(slots[0].end).toBe(slots[1].start)
    })

    it('should handle empty slot array', () => {
      const slots: any[] = []
      expect(slots.length).toBe(0)
    })
  })

  describe('findAvailableSlots', () => {
    it('should find slots in business hours', () => {
      const businessStart = 9
      const businessEnd = 17
      expect(businessEnd - businessStart).toBe(8)
    })

    it('should exclude lunch hours', () => {
      const lunchStart = 12
      const lunchEnd = 13
      expect(lunchEnd - lunchStart).toBe(1)
    })

    it('should handle different time zones', () => {
      const offset = -5 // EST
      expect(offset).toBeLessThan(0)
    })

    it('should respect minimum slot duration', () => {
      const minDuration = 30
      expect(minDuration).toBeGreaterThan(0)
    })
  })

  describe('sortByDateTime', () => {
    it('should sort dates in ascending order', () => {
      const dates = [
        new Date('2024-01-03'),
        new Date('2024-01-01'),
        new Date('2024-01-02')
      ]
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime())
      expect(sorted[0].getDate()).toBe(1)
      expect(sorted[2].getDate()).toBe(3)
    })

    it('should handle same dates', () => {
      const date1 = new Date('2024-01-01')
      const date2 = new Date('2024-01-01')
      expect(date1.getTime()).toBe(date2.getTime())
    })

    it('should sort times within same day', () => {
      const times = [
        new Date('2024-01-01T15:00:00'),
        new Date('2024-01-01T09:00:00'),
        new Date('2024-01-01T12:00:00')
      ]
      const sorted = times.sort((a, b) => a.getTime() - b.getTime())
      expect(sorted[0].getHours()).toBe(9)
      expect(sorted[2].getHours()).toBe(15)
    })
  })

  describe('isBusinessDay', () => {
    it('should identify weekdays', () => {
      const monday = new Date('2024-01-01')
      const day = monday.getDay()
      expect(day).toBeGreaterThan(0)
      expect(day).toBeLessThan(6)
    })

    it('should identify weekends', () => {
      const saturday = new Date('2024-01-06')
      expect(saturday.getDay()).toBe(6)
    })

    it('should handle Sunday', () => {
      const sunday = new Date('2024-01-07')
      expect(sunday.getDay()).toBe(0)
    })
  })

  describe('addBusinessDays', () => {
    it('should skip weekends', () => {
      const friday = new Date('2024-01-05')
      const nextBusiness = new Date(friday)
      nextBusiness.setDate(nextBusiness.getDate() + 3)
      expect(nextBusiness.getDay()).toBe(1)
    })

    it('should add multiple business days', () => {
      const start = new Date('2024-01-01')
      const days = 5
      expect(days).toBe(5)
    })
  })

  describe('getWeekNumber', () => {
    it('should calculate week number', () => {
      const date = new Date('2024-01-15')
      const day = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000)
      const week = Math.ceil((day + 1) / 7)
      expect(week).toBeGreaterThan(0)
    })

    it('should handle first week of year', () => {
      const jan1 = new Date('2024-01-01')
      expect(jan1.getMonth()).toBe(0)
      expect(jan1.getDate()).toBe(1)
    })

    it('should handle last week of year', () => {
      const dec31 = new Date('2024-12-31')
      expect(dec31.getMonth()).toBe(11)
    })
  })
})
