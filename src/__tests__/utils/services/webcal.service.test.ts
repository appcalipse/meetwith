/**
 * Comprehensive tests for webcal.service
 * Testing WebCal/ICS feed calendar integration
 */

import WebCalService from '@/utils/services/webcal.service'
import * as Sentry from '@sentry/nextjs'

// Mock dependencies
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Mock fetch globally
global.fetch = jest.fn()

describe('WebCalService', () => {
  let service: WebCalService
  const mockEmail = 'test@example.com'
  const mockIcsUrl = 'webcal://example.com/calendar.ics'
  const mockPayload = JSON.stringify({ url: mockIcsUrl })

  beforeEach(() => {
    jest.clearAllMocks()
    service = new WebCalService('0x123', mockEmail, mockPayload)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('constructor', () => {
    it('should convert webcal:// URLs to https://', () => {
      const svc = new WebCalService('0x123', mockEmail, mockPayload)
      expect((svc as any).feedUrl).toBe('https://example.com/calendar.ics')
    })

    it('should preserve https:// URLs', () => {
      const httpsPayload = JSON.stringify({ url: 'https://example.com/cal.ics' })
      const svc = new WebCalService('0x123', mockEmail, httpsPayload)
      expect((svc as any).feedUrl).toBe('https://example.com/cal.ics')
    })

    it('should preserve http:// URLs', () => {
      const httpPayload = JSON.stringify({ url: 'http://example.com/cal.ics' })
      const svc = new WebCalService('0x123', mockEmail, httpPayload)
      expect((svc as any).feedUrl).toBe('http://example.com/cal.ics')
    })
  })

  describe('getConnectedEmail', () => {
    it('should return the connected email', () => {
      expect(service.getConnectedEmail()).toBe(mockEmail)
    })
  })

  describe('refreshConnection', () => {
    it('should validate feed with HEAD request', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        statusText: 'OK',
      })

      const result = await service.refreshConnection()

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.com/calendar.ics',
        expect.objectContaining({
          method: 'HEAD',
          headers: expect.objectContaining({
            'User-Agent': 'MeetWithWallet/1.0',
          }),
        })
      )

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        calendarId: 'https://example.com/calendar.ics',
        enabled: true,
        isReadOnly: true,
        sync: false,
      })
    })

    it('should throw error if feed is unavailable', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(service.refreshConnection()).rejects.toThrow(
        'Failed to connect to ICS feed'
      )

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      await expect(service.refreshConnection()).rejects.toThrow(
        'Failed to connect to ICS feed'
      )

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('getAvailability', () => {
    const mockIcsData = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20240115T100000Z
DTEND:20240115T110000Z
SUMMARY:Test Meeting
END:VEVENT
END:VCALENDAR`

    it('should fetch and parse ICS events', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockIcsData),
        headers: {
          get: jest.fn().mockReturnValue('text/calendar'),
        },
      })

      const result = await service.getAvailability(
        ['calendar-id'],
        '2024-01-01',
        '2024-01-31'
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle fetch errors gracefully', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Fetch failed'))

      await expect(
        service.getAvailability(['calendar-id'], '2024-01-01', '2024-01-31')
      ).rejects.toThrow('Failed to fetch events from ICS feed')

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle empty ICS data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(''),
        headers: {
          get: jest.fn().mockReturnValue('text/calendar'),
        },
      })

      const result = await service.getAvailability(
        ['calendar-id'],
        '2024-01-01',
        '2024-01-31'
      )

      expect(result).toEqual([])
    })
  })

  describe('getEvents', () => {
    const mockIcsWithRecurrence = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:recurring@example.com
DTSTART:20240101T140000Z
DTEND:20240101T150000Z
SUMMARY:Weekly Meeting
RRULE:FREQ=WEEKLY;COUNT=4
END:VEVENT
END:VCALENDAR`

    it('should fetch and parse events', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockIcsWithRecurrence),
        headers: {
          get: jest.fn().mockReturnValue('text/calendar'),
        },
      })

      const result = await service.getEvents('2024-01-01', '2024-12-31')

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle invalid ICS data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('INVALID ICS DATA'),
        headers: {
          get: jest.fn().mockReturnValue('text/calendar'),
        },
      })

      await expect(service.getEvents('2024-01-01', '2024-12-31')).rejects.toThrow()
    })
  })

  describe('read-only operations', () => {
    it('createEvent should warn and return undefined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await service.createEvent('calendar-id', {} as any)

      expect(result).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })

    it('updateEvent should warn and return undefined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await service.updateEvent('calendar-id', {} as any)

      expect(result).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })

    it('deleteEvent should warn and return undefined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      await service.deleteEvent('calendar-id', 'meeting-id')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })

    it('updateEventInstance should warn and return undefined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await service.updateEventInstance('calendar-id', {} as any)

      expect(result).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })

    it('deleteEventInstance should warn', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      await service.deleteEventInstance('calendar-id', {} as any)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })

    it('deleteExternalEvent should warn', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      await service.deleteExternalEvent('calendar-id', 'event-id')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })

    it('updateEventRsvpForExternalEvent should warn and return undefined', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

      const result = await service.updateEventRsvpForExternalEvent(
        'calendar-id',
        'event-id',
        'accepted'
      )

      expect(result).toBeUndefined()
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('read-only')
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('fetchIcsData - content validation', () => {
    it('should accept text/calendar content-type', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
        headers: {
          get: jest.fn().mockReturnValue('text/calendar'),
        },
      })

      const result = await (service as any).fetchIcsData()

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should accept text/plain content-type for ICS data', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue('BEGIN:VCALENDAR\nEND:VCALENDAR'),
        headers: {
          get: jest.fn().mockReturnValue('text/plain'),
        },
      })

      const result = await (service as any).fetchIcsData()

      expect(result).toBeDefined()
    })
  })
})
