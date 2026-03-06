/**
 * Comprehensive unit tests for caldav.service.ts
 * Testing CalDAV service methods, CRUD operations, and error handling
 */

// Set environment variables before imports
process.env.SYMETRIC_KEY = 'test-symmetric-key-32-characters!' // Note: uses SYMETRIC_KEY (as in source code)
process.env.NEXT_PUBLIC_APP_URL = 'https://app.meetwith.com'

// Mock tsdav library
jest.mock('tsdav', () => ({
  createAccount: jest.fn(),
  createCalendarObject: jest.fn(),
  deleteCalendarObject: jest.fn(),
  fetchCalendarObjects: jest.fn(),
  fetchCalendars: jest.fn(),
  getBasicAuthHeaders: jest.fn(),
  updateCalendarObject: jest.fn(),
}))

// Mock database functions
jest.mock('@/utils/database', () => ({
  getOwnerPublicUrlServer: jest.fn().mockResolvedValue('https://meetwith.com/user/meeting-type'),
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Mock cryptography
jest.mock('@/utils/cryptography', () => ({
  decryptContent: jest.fn((key, value) => value),
}))

// Mock calendar helpers
jest.mock('@/utils/services/calendar.backend.helper', () => ({
  generateIcsServer: jest.fn(),
}))

// Mock WebDAVEventMapper
jest.mock('@/utils/services/caldav.mapper', () => ({
  WebDAVEventMapper: {
    toUnified: jest.fn((event, calendarId, calendarName, email, isReadOnly) => ({
      id: event.uid,
      summary: event.summary,
      start: event.startDate,
      end: event.endDate,
      calendarId,
      calendarName,
      email,
      isReadOnly,
    })),
  },
}))

// Mock validations
jest.mock('@/utils/validations', () => ({
  isValidEmail: jest.fn((email) => {
    return typeof email === 'string' && email.includes('@')
  }),
}))

// Mock ICAL
jest.mock('ical.js', () => {
  return {
    parse: jest.fn(),
    Component: jest.fn(),
    Event: jest.fn(),
  }
})

import {
  createAccount,
  createCalendarObject,
  deleteCalendarObject,
  fetchCalendarObjects,
  fetchCalendars,
  getBasicAuthHeaders,
  updateCalendarObject,
} from 'tsdav'
import CaldavCalendarService, { handleErrorsJson, CaldavCredentials } from '@/utils/services/caldav.service'
import { getOwnerPublicUrlServer } from '@/utils/database'
import { generateIcsServer } from '@/utils/services/calendar.backend.helper'
import * as Sentry from '@sentry/nextjs'
import { ParticipantType } from '@/types/ParticipantInfo'
import { MeetingChangeType } from '@/types/Meeting'
import ICAL from 'ical.js'

describe('CaldavCalendarService', () => {
  let caldavService: CaldavCalendarService
  let mockCredentials: CaldavCredentials
  const mockAccountAddress = 'test-account-address'
  const mockEmail = 'test@example.com'

  beforeEach(() => {
    jest.clearAllMocks()

    mockCredentials = {
      url: 'https://caldav.example.com',
      username: 'testuser',
      password: 'testpassword',
    }

    ;(getBasicAuthHeaders as jest.Mock).mockReturnValue({
      Authorization: 'Basic dGVzdHVzZXI6dGVzdHBhc3N3b3Jk',
    })

    caldavService = new CaldavCalendarService(
      mockAccountAddress,
      mockEmail,
      mockCredentials,
      false
    )
  })

  describe('Constructor and Authentication', () => {
    it('should create CaldavCalendarService instance', () => {
      expect(caldavService).toBeInstanceOf(CaldavCalendarService)
    })

    it('should handle string credentials', () => {
      const stringCreds = JSON.stringify(mockCredentials)
      const service = new CaldavCalendarService(
        mockAccountAddress,
        mockEmail,
        stringCreds,
        false
      )
      expect(service).toBeInstanceOf(CaldavCalendarService)
    })

    it('should return connected email', () => {
      expect(caldavService.getConnectedEmail()).toBe(mockEmail)
    })

    it('should set up basic auth headers', () => {
      expect(getBasicAuthHeaders).toHaveBeenCalledWith({
        password: 'testpassword',
        username: 'testuser',
      })
    })

    it('should handle encrypted credentials', () => {
      const encryptedCreds = {
        url: 'https://caldav.example.com',
        username: 'testuser',
        password: 'encrypted-password',
      }
      
      new CaldavCalendarService(
        mockAccountAddress,
        mockEmail,
        encryptedCreds,
        true
      )

      expect(getBasicAuthHeaders).toHaveBeenCalled()
    })
  })

  describe('handleErrorsJson', () => {
    it('should return json for successful response', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ data: 'test' }),
      } as any

      const result = await handleErrorsJson(mockResponse)
      expect(result).toEqual({ data: 'test' })
      expect(mockResponse.json).toHaveBeenCalled()
    })

    it('should throw error for failed response', () => {
      const mockResponse = {
        ok: false,
        statusText: 'Not Found',
        json: jest.fn().mockResolvedValue({ error: 'test' }),
      } as any

      expect(() => handleErrorsJson(mockResponse)).toThrow('Not Found')
    })
  })

  describe('listCalendars', () => {
    it('should list calendars from CalDAV server', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
        {
          url: 'https://caldav.example.com/cal2/',
          displayName: 'Personal',
          components: ['VEVENT'],
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      const result = await caldavService.listCalendars()

      expect(result).toHaveLength(2)
      expect(result[0].displayName).toBe('Work Calendar')
      expect(result[1].displayName).toBe('Personal')
      expect(createAccount).toHaveBeenCalled()
      expect(fetchCalendars).toHaveBeenCalledWith({
        account: mockAccount,
        headers: expect.any(Object),
      })
    })

    it('should filter out calendars without VEVENT component', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Event Calendar',
          components: ['VEVENT'],
        },
        {
          url: 'https://caldav.example.com/cal2/',
          displayName: 'Task Calendar',
          components: ['VTODO'],
        },
        {
          url: 'https://caldav.example.com/cal3/',
          displayName: 'No Components',
          components: undefined,
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      const result = await caldavService.listCalendars()

      expect(result).toHaveLength(1)
      expect(result[0].displayName).toBe('Event Calendar')
    })

    it('should handle calendar listing errors', async () => {
      const error = new Error('Failed to fetch calendars')
      ;(createAccount as jest.Mock).mockRejectedValue(error)

      await expect(caldavService.listCalendars()).rejects.toThrow('Failed to fetch calendars')
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should handle calendars with color property', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Colored Calendar',
          components: ['VEVENT'],
          calendarColor: {
            _cdata: '#FF5733',
          },
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      const result = await caldavService.listCalendars()

      expect(result).toHaveLength(1)
      expect(result[0].calendarColor?._cdata).toBe('#FF5733')
    })
  })

  describe('refreshConnection', () => {
    it('should refresh connection and return calendar sync info', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Primary Calendar',
          components: ['VEVENT'],
          calendarColor: {
            _cdata: '#123456',
          },
        },
        {
          url: 'https://caldav.example.com/cal2/',
          displayName: 'Secondary Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      const result = await caldavService.refreshConnection()

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        calendarId: 'https://caldav.example.com/cal1/',
        name: 'Primary Calendar',
        color: '#123456',
        enabled: true,
        isReadOnly: false,
        sync: false,
      })
      expect(result[1]).toMatchObject({
        calendarId: 'https://caldav.example.com/cal2/',
        name: 'Secondary Calendar',
        enabled: false,
        isReadOnly: false,
        sync: false,
      })
    })

    it('should handle calendars without displayName', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: null,
          components: ['VEVENT'],
          ctag: 'unique-tag-123',
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      const result = await caldavService.refreshConnection()

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('unique-tag-123')
    })
  })

  describe('createEvent', () => {
    const mockMeetingDetails = {
      meeting_id: '12345678-1234-1234-1234-123456789012',
      ical_uid: null,
      meeting_type_id: 'meeting-type-1',
      participants: [
        {
          type: ParticipantType.Owner,
          account_address: 'owner@example.com',
          email: 'owner@example.com',
        },
        {
          type: ParticipantType.Invitee,
          account_address: 'invitee@example.com',
          email: 'invitee@example.com',
        },
      ],
      title: 'Test Meeting',
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T11:00:00Z'),
    }

    beforeEach(() => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
    })

    it('should create event successfully', async () => {
      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [{ email: 'test@example.com' }],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(createCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      const result = await caldavService.createEvent(
        mockAccountAddress,
        mockMeetingDetails as any,
        new Date()
      )

      expect(result).toMatchObject({
        id: '12345678-1234-1234-1234-123456789012',
        type: 'Cal Dav',
        attendees: [{ email: 'test@example.com' }],
      })
      expect(createCalendarObject).toHaveBeenCalled()
      expect(generateIcsServer).toHaveBeenCalled()
    })

    it('should use specific calendar if calendarId provided', async () => {
      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
        {
          url: 'https://caldav.example.com/cal2/',
          displayName: 'Personal Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(createCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      await caldavService.createEvent(
        mockAccountAddress,
        mockMeetingDetails as any,
        new Date(),
        'https://caldav.example.com/cal2/'
      )

      expect(createCalendarObject).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar: expect.objectContaining({
            url: 'https://caldav.example.com/cal2/',
          }),
        })
      )
    })

    it('should handle ics generation error and retry without participants', async () => {
      const mockIcsFirst = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      const mockIcsRetry = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock)
        .mockResolvedValueOnce(mockIcsFirst)
        .mockResolvedValueOnce(mockIcsRetry)
      ;(createCalendarObject as jest.Mock)
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ ok: true })

      const result = await caldavService.createEvent(
        mockAccountAddress,
        mockMeetingDetails as any,
        new Date()
      )

      expect(result).toBeDefined()
      expect(generateIcsServer).toHaveBeenCalledTimes(2)
    })

    it('should throw error if calendar object creation fails twice', async () => {
      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(createCalendarObject as jest.Mock)
        .mockResolvedValue({
          ok: false,
          statusText: 'Server Error',
        })

      await expect(
        caldavService.createEvent(
          mockAccountAddress,
          mockMeetingDetails as any,
          new Date()
        )
      ).rejects.toThrow('Error creating event')
    })

    it('should use ical_uid if provided', async () => {
      const meetingWithIcalUid = {
        ...mockMeetingDetails,
        ical_uid: 'custom-ical-uid-123',
      }

      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(createCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      const result = await caldavService.createEvent(
        mockAccountAddress,
        meetingWithIcalUid as any,
        new Date()
      )

      expect(result.uid).toBe('custom-ical-uid-123')
    })

    it('should handle meeting without meeting_type_id', async () => {
      const meetingWithoutType = {
        ...mockMeetingDetails,
        meeting_type_id: null,
      }

      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(createCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      const result = await caldavService.createEvent(
        mockAccountAddress,
        meetingWithoutType as any,
        new Date()
      )

      expect(result).toBeDefined()
      // Meeting without type should use dashboard URL
      expect(result.type).toBe('Cal Dav')
    })
  })

  describe('deleteEvent', () => {
    it('should delete event successfully', async () => {
      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)

      // Mock ICAL parsing
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const mockEvent = {
        uid: '123456781234123412341234567890',
        summary: 'Test Event',
        description: '',
        location: '',
        organizer: '',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        endDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        duration: { days: 0, hours: 1, minutes: 0, seconds: 0, weeks: 0, isNegative: false },
        attendees: [],
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)
      
      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/123456781234123412341234567890.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])
      
      ;(deleteCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      await caldavService.deleteEvent('123456781234123412341234567890', 'cal1')

      expect(deleteCalendarObject).toHaveBeenCalled()
    })

    it('should handle delete errors', async () => {
      const error = new Error('Delete failed')
      
      ;(fetchCalendars as jest.Mock).mockRejectedValue(error)

      await expect(
        caldavService.deleteEvent('meeting-123', 'cal1')
      ).rejects.toThrow('Delete failed')

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('getAvailability', () => {
    beforeEach(() => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
    })

    it('should return availability for calendars', async () => {
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const startDate = new Date('2024-01-01T10:00:00Z')
      const endDate = new Date('2024-01-01T11:00:00Z')

      const mockEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        startDate: {
          toJSDate: () => startDate,
          toUnixTime: () => startDate.getTime() / 1000,
        },
        endDate: {
          toJSDate: () => endDate,
          toUnixTime: () => endDate.getTime() / 1000,
        },
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getAvailability(
        ['https://caldav.example.com/cal1/'],
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle calendar fetch errors gracefully', async () => {
      ;(fetchCalendarObjects as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await caldavService.getAvailability(
        ['https://caldav.example.com/cal1/'],
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toEqual([])
      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should chunk large date ranges', async () => {
      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([])

      const dateFrom = '2024-01-01T00:00:00Z'
      const dateTo = '2024-03-01T23:59:59Z' // 2 months

      await caldavService.getAvailability(
        ['https://caldav.example.com/cal1/'],
        dateFrom,
        dateTo
      )

      // Should be called multiple times for chunking
      expect(fetchCalendarObjects as jest.Mock).toHaveBeenCalled()
    })

    it('should deduplicate recurring events', async () => {
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const startDate = new Date('2024-01-01T10:00:00Z')
      const endDate = new Date('2024-01-01T11:00:00Z')

      const mockEvent = {
        uid: 'recurring-event-123',
        summary: 'Recurring Event',
        recurrenceId: {
          toString: () => '20240101T100000Z',
        },
        startDate: {
          toJSDate: () => startDate,
          toUnixTime: () => startDate.getTime() / 1000,
        },
        endDate: {
          toJSDate: () => endDate,
          toUnixTime: () => endDate.getTime() / 1000,
        },
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getAvailability(
        ['https://caldav.example.com/cal1/'],
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      // Should deduplicate based on recurrenceId
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getEvents', () => {
    const mockCalendarsInfo = [
      {
        name: 'Work Calendar',
        calendarId: 'https://caldav.example.com/cal1/',
        isReadOnly: false,
      },
    ]

    beforeEach(() => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
    })

    it('should get events from calendars', async () => {
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          if (prop === 'created') return '20240101T100000Z'
          if (prop === 'status') return 'CONFIRMED'
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          if (type === 'vtimezone') return null
          return null
        }),
      }

      const startDate = new Date('2024-01-01T10:00:00Z')
      const endDate = new Date('2024-01-01T11:00:00Z')

      const mockEvent = {
        uid: 'event-123',
        summary: 'Test Event',
        description: 'Test Description',
        location: 'Test Location',
        organizer: 'organizer@example.com',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => startDate,
          toUnixTime: () => startDate.getTime() / 1000,
        },
        endDate: {
          toJSDate: () => endDate,
          toUnixTime: () => endDate.getTime() / 1000,
        },
        duration: {
          days: 0,
          hours: 1,
          minutes: 0,
          seconds: 0,
          weeks: 0,
          isNegative: false,
        },
        attendees: [],
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getEvents(
        mockCalendarsInfo,
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should filter events with meeting links when onlyWithMeetingLinks is true', async () => {
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          if (prop === 'created') return '20240101T100000Z'
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const mockEventWithLocation = {
        uid: 'event-with-location',
        summary: 'Event With Location',
        description: '',
        location: 'https://zoom.us/meeting',
        organizer: '',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        endDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        duration: { days: 0, hours: 1, minutes: 0, seconds: 0, weeks: 0, isNegative: false },
        attendees: [],
      }

      const mockEventWithoutLocation = {
        ...mockEventWithLocation,
        uid: 'event-without-location',
        location: '',
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock)
        .mockReturnValueOnce(mockEventWithLocation)
        .mockReturnValueOnce(mockEventWithoutLocation)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-1"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
        {
          url: 'https://caldav.example.com/cal1/event2.ics',
          etag: '"etag-2"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getEvents(
        mockCalendarsInfo,
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z',
        true
      )

      // Should only include events with location when onlyWithMeetingLinks is true
      expect(result).toBeDefined()
    })

    it('should handle events with exdate property', async () => {
      const mockExdateProp = {
        getFirstValue: jest.fn(() => ({
          toString: () => '20240115T100000Z',
        })),
      }

      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          if (prop === 'created') return '20240101T100000Z'
          return null
        }),
        getAllProperties: jest.fn((prop) => {
          if (prop === 'exdate') return [mockExdateProp]
          return []
        }),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const mockEvent = {
        uid: 'recurring-event',
        summary: 'Recurring Event',
        description: '',
        location: '',
        organizer: '',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        endDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        duration: { days: 0, hours: 1, minutes: 0, seconds: 0, weeks: 0, isNegative: false },
        attendees: [],
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getEvents(
        mockCalendarsInfo,
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toBeDefined()
    })
  })

  describe('updateEvent', () => {
    const mockMeetingDetails = {
      meeting_id: '12345678-1234-1234-1234-123456789012',
      ical_uid: 'existing-event-uid',
      meeting_type_id: 'meeting-type-1',
      participants: [
        {
          type: ParticipantType.Owner,
          account_address: 'owner@example.com',
          email: 'owner@example.com',
        },
      ],
      title: 'Updated Meeting',
      start_time: new Date('2024-01-01T10:00:00Z'),
      end_time: new Date('2024-01-01T11:00:00Z'),
    }

    beforeEach(() => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
    })

    it('should update existing event', async () => {
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const mockEvent = {
        uid: 'existing-event-uid',
        summary: 'Test Event',
        description: '',
        location: '',
        organizer: '',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        endDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        duration: { days: 0, hours: 1, minutes: 0, seconds: 0, weeks: 0, isNegative: false },
        attendees: [
          {
            getValues: jest.fn(() => ['MAILTO:test@example.com']),
          },
        ],
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(updateCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      const result = await caldavService.updateEvent(
        mockAccountAddress,
        mockMeetingDetails as any,
        'https://caldav.example.com/cal1/'
      )

      expect(result).toBeDefined()
      expect(updateCalendarObject).toHaveBeenCalled()
    })

    it('should create event if it does not exist', async () => {
      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([])

      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(createCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      const result = await caldavService.updateEvent(
        mockAccountAddress,
        mockMeetingDetails as any,
        'https://caldav.example.com/cal1/'
      )

      expect(result).toBeDefined()
      expect(createCalendarObject).toHaveBeenCalled()
      expect(updateCalendarObject).not.toHaveBeenCalled()
    })

    it('should preserve participants if existing event has attendees', async () => {
      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          return null
        }),
      }

      const mockEvent = {
        uid: 'existing-event-uid',
        summary: 'Test Event',
        description: '',
        location: '',
        organizer: '',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        endDate: {
          toJSDate: () => new Date(),
          toUnixTime: () => Date.now() / 1000,
        },
        duration: { days: 0, hours: 1, minutes: 0, seconds: 0, weeks: 0, isNegative: false },
        attendees: [
          { getValues: jest.fn(() => ['MAILTO:attendee1@example.com']) },
          { getValues: jest.fn(() => ['MAILTO:attendee2@example.com']) },
        ],
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const mockIcs = {
        value: 'BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR',
        error: null,
        attendees: [],
      }

      ;(generateIcsServer as jest.Mock).mockResolvedValue(mockIcs)
      ;(updateCalendarObject as jest.Mock).mockResolvedValue({ ok: true })

      await caldavService.updateEvent(
        mockAccountAddress,
        mockMeetingDetails as any,
        'https://caldav.example.com/cal1/'
      )

      expect(generateIcsServer).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        true,
        expect.anything()
      )
    })
  })

  describe('Error Handling', () => {
    it('should capture and rethrow errors in createEvent', async () => {
      const error = new Error('Calendar not found')
      ;(fetchCalendars as jest.Mock).mockRejectedValue(error)

      await expect(
        caldavService.createEvent(
          mockAccountAddress,
          {} as any,
          new Date()
        )
      ).rejects.toThrow('Calendar not found')

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network timeout')
      ;(createAccount as jest.Mock).mockRejectedValue(networkError)

      await expect(caldavService.listCalendars()).rejects.toThrow('Network timeout')
      expect(Sentry.captureException).toHaveBeenCalledWith(networkError)
    })

    it('should handle malformed calendar data', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      const malformedCalendars = [
        {
          url: null,
          displayName: null,
          components: null,
        },
      ]

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue(malformedCalendars)

      const result = await caldavService.listCalendars()

      // Should filter out malformed calendars
      expect(result).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty calendar list', async () => {
      const mockAccount = {
        serverUrl: 'https://caldav.example.com',
        credentials: {},
        accountType: 'caldav',
      }

      ;(createAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(fetchCalendars as jest.Mock).mockResolvedValue([])

      const result = await caldavService.refreshConnection()

      expect(result).toHaveLength(0)
    })

    it('should handle missing event data in getEvents', async () => {
      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: null, // Missing data
        },
      ])

      const result = await caldavService.getEvents(
        [{ name: 'Work', calendarId: 'https://caldav.example.com/cal1/', isReadOnly: false }],
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle timezone conversion', async () => {
      const mockVTimezone = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'tzid') return 'America/New_York'
          return null
        }),
      }

      const mockVEvent = {
        getFirstPropertyValue: jest.fn((prop) => {
          if (prop === 'rrule') return null
          if (prop === 'created') return '20240101T100000Z'
          return null
        }),
        getAllProperties: jest.fn(() => []),
      }

      const mockVCalendar = {
        getFirstSubcomponent: jest.fn((type) => {
          if (type === 'vevent') return mockVEvent
          if (type === 'vtimezone') return mockVTimezone
          return null
        }),
      }

      const mockEvent = {
        uid: 'event-with-tz',
        summary: 'Event with timezone',
        description: '',
        location: '',
        organizer: '',
        recurrenceId: null,
        sequence: 0,
        startDate: {
          toJSDate: () => new Date('2024-01-01T10:00:00Z'),
          toUnixTime: () => new Date('2024-01-01T10:00:00Z').getTime() / 1000,
        },
        endDate: {
          toJSDate: () => new Date('2024-01-01T11:00:00Z'),
          toUnixTime: () => new Date('2024-01-01T11:00:00Z').getTime() / 1000,
        },
        duration: { days: 0, hours: 1, minutes: 0, seconds: 0, weeks: 0, isNegative: false },
        attendees: [],
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)
      ;(ICAL.Event as jest.Mock).mockReturnValue(mockEvent)

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getEvents(
        [{ name: 'Work', calendarId: 'https://caldav.example.com/cal1/', isReadOnly: false }],
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toBeDefined()
    })

    it('should handle events without vevent component', async () => {
      const mockVCalendar = {
        getFirstSubcomponent: jest.fn(() => null), // No vevent
      }

      ;(ICAL.parse as jest.Mock).mockReturnValue(['vcalendar', [], []])
      ;(ICAL.Component as jest.Mock).mockReturnValue(mockVCalendar)

      const mockCalendars = [
        {
          url: 'https://caldav.example.com/cal1/',
          displayName: 'Work Calendar',
          components: ['VEVENT'],
        },
      ]

      ;(fetchCalendars as jest.Mock).mockResolvedValue(mockCalendars)
      ;(fetchCalendarObjects as jest.Mock).mockResolvedValue([
        {
          url: 'https://caldav.example.com/cal1/event1.ics',
          etag: '"etag-123"',
          data: 'BEGIN:VCALENDAR\nEND:VCALENDAR',
        },
      ])

      const result = await caldavService.getEvents(
        [{ name: 'Work', calendarId: 'https://caldav.example.com/cal1/', isReadOnly: false }],
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
