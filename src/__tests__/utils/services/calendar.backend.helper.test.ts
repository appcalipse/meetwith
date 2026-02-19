/**
 * Comprehensive tests for calendar.backend.helper
 * Testing calendar event operations, busy slots, and RSVP functions
 */

import { TimeSlotSource } from '@/types/Meeting'
import { ParticipationStatus } from '@/types/ParticipantInfo'
import {
  CalendarBackendHelper,
  generateIcsServer,
} from '@/utils/services/calendar.backend.helper'

// Mock dependencies
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/database', () => ({
  getConnectedCalendars: jest.fn(),
  getQuickPollCalendars: jest.fn(),
  getSlotsForAccount: jest.fn(),
}))

jest.mock('@/utils/sync_helper', () => ({
  getCalendarPrimaryEmail: jest.fn(),
}))

jest.mock('@/utils/services/connected_calendars.factory', () => ({
  getConnectedCalendarIntegration: jest.fn(),
}))

jest.mock('@/utils/calendar_manager', () => ({
  createAlarm: jest.fn(),
  getCalendarRegularUrl: jest.fn(),
  participantStatusToICSStatus: jest.fn(),
}))

import * as database from '@/utils/database'
import * as connectedCalendarsFactory from '@/utils/services/connected_calendars.factory'
import * as Sentry from '@sentry/nextjs'

describe('CalendarBackendHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('deleteEventFromCalendar', () => {
    it('should delete event from connected calendar', async () => {
      const mockCalendar = {
        account_address: '0x123',
        email: 'test@example.com',
        provider: TimeSlotSource.GOOGLE,
        payload: {},
        calendars: [
          {
            calendarId: 'primary',
            enabled: true,
          },
        ],
      }

      const mockIntegration = {
        deleteExternalEvent: jest.fn().mockResolvedValue({}),
      }

      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        mockCalendar,
      ])
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await CalendarBackendHelper.deleteEventFromCalendar(
        '0x123',
        'primary',
        'event-123'
      )

      expect(mockIntegration.deleteExternalEvent).toHaveBeenCalledWith(
        'primary',
        'event-123'
      )
    })

    it('should throw error if calendar not found', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      await expect(
        CalendarBackendHelper.deleteEventFromCalendar(
          '0x123',
          'nonexistent',
          'event-123'
        )
      ).rejects.toThrow('Calendar not found')
    })

    it('should throw error if calendar is disabled', async () => {
      const mockCalendar = {
        account_address: '0x123',
        calendars: [
          {
            calendarId: 'primary',
            enabled: false,
          },
        ],
      }

      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        mockCalendar,
      ])

      await expect(
        CalendarBackendHelper.deleteEventFromCalendar(
          '0x123',
          'primary',
          'event-123'
        )
      ).rejects.toThrow()
    })
  })

  describe('getBusySlotsForAccount', () => {
    it('should fetch busy slots from MWW and calendars', async () => {
      const startDate = new Date('2024-01-01T00:00:00Z')
      const endDate = new Date('2024-01-31T23:59:59Z')

      const mockMeetings = [
        {
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T11:00:00Z',
        },
      ]

      const mockCalendar = {
        account_address: '0x123',
        email: 'test@example.com',
        provider: TimeSlotSource.GOOGLE,
        payload: {},
        calendars: [
          {
            calendarId: 'primary',
            enabled: true,
            sync: true,
          },
        ],
      }

      const mockIntegration = {
        getBusySlots: jest.fn().mockResolvedValue([
          {
            start: new Date('2024-01-16T14:00:00Z'),
            end: new Date('2024-01-16T15:00:00Z'),
          },
        ]),
      }

      ;(database.getSlotsForAccount as jest.Mock).mockResolvedValue(
        mockMeetings
      )
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        mockCalendar,
      ])
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      const result = await CalendarBackendHelper.getBusySlotsForAccount(
        '0x123',
        startDate,
        endDate
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle empty results', async () => {
      ;(database.getSlotsForAccount as jest.Mock).mockResolvedValue([])
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      const result = await CalendarBackendHelper.getBusySlotsForAccount(
        '0x123',
        new Date(),
        new Date()
      )

      expect(result).toEqual([])
    })

    it('should handle integration errors gracefully', async () => {
      const mockCalendar = {
        account_address: '0x123',
        calendars: [
          {
            calendarId: 'primary',
            enabled: true,
            sync: true,
          },
        ],
      }

      const mockIntegration = {
        getBusySlots: jest.fn().mockRejectedValue(new Error('API error')),
      }

      ;(database.getSlotsForAccount as jest.Mock).mockResolvedValue([])
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        mockCalendar,
      ])
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      const result = await CalendarBackendHelper.getBusySlotsForAccount(
        '0x123',
        new Date(),
        new Date()
      )

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('getBusySlotsForMultipleAccounts', () => {
    it('should fetch busy slots for multiple accounts', async () => {
      const accounts = ['0x123', '0x456']
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      ;(database.getSlotsForAccount as jest.Mock).mockResolvedValue([])
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      const result = await CalendarBackendHelper.getBusySlotsForMultipleAccounts(
        accounts,
        startDate,
        endDate
      )

      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
      expect(Object.keys(result)).toHaveLength(2)
    })

    it('should handle empty account list', async () => {
      const result = await CalendarBackendHelper.getBusySlotsForMultipleAccounts(
        [],
        new Date(),
        new Date()
      )

      expect(result).toEqual({})
    })
  })

  describe('updateCalendarEvent', () => {
    it('should update calendar event', async () => {
      const mockCalendar = {
        account_address: '0x123',
        email: 'test@example.com',
        provider: TimeSlotSource.GOOGLE,
        payload: {},
        calendars: [
          {
            calendarId: 'primary',
            enabled: true,
          },
        ],
      }

      const mockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({}),
      }

      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        mockCalendar,
      ])
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await CalendarBackendHelper.updateCalendarEvent(
        '0x123',
        'primary',
        'event-123',
        {
          title: 'Updated Meeting',
          start: new Date('2024-01-15T10:00:00Z'),
          end: new Date('2024-01-15T11:00:00Z'),
        }
      )

      expect(mockIntegration.updateEvent).toHaveBeenCalled()
    })
  })

  describe('updateCalendarRsvpStatus', () => {
    it('should update RSVP status for calendar event', async () => {
      const mockCalendar = {
        account_address: '0x123',
        email: 'test@example.com',
        provider: TimeSlotSource.GOOGLE,
        payload: {},
        calendars: [
          {
            calendarId: 'primary',
            enabled: true,
          },
        ],
      }

      const mockIntegration = {
        updateRsvpStatus: jest.fn().mockResolvedValue({}),
      }

      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        mockCalendar,
      ])
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await CalendarBackendHelper.updateCalendarRsvpStatus(
        '0x123',
        'primary',
        'event-123',
        ParticipationStatus.Accepted
      )

      expect(mockIntegration.updateRsvpStatus).toHaveBeenCalledWith(
        'primary',
        'event-123',
        expect.anything()
      )
    })
  })

  describe('mergeSlotsUnion', () => {
    it('should merge overlapping time slots', () => {
      const slots = [
        {
          start: new Date('2024-01-15T10:00:00Z'),
          end: new Date('2024-01-15T11:00:00Z'),
        },
        {
          start: new Date('2024-01-15T10:30:00Z'),
          end: new Date('2024-01-15T11:30:00Z'),
        },
      ]

      const result = CalendarBackendHelper.mergeSlotsUnion(slots as any)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty slots', () => {
      const result = CalendarBackendHelper.mergeSlotsUnion([])

      expect(result).toEqual([])
    })

    it('should handle non-overlapping slots', () => {
      const slots = [
        {
          start: new Date('2024-01-15T10:00:00Z'),
          end: new Date('2024-01-15T11:00:00Z'),
        },
        {
          start: new Date('2024-01-15T14:00:00Z'),
          end: new Date('2024-01-15T15:00:00Z'),
        },
      ]

      const result = CalendarBackendHelper.mergeSlotsUnion(slots as any)

      expect(result.length).toBe(2)
    })
  })

  describe('mergeSlotsIntersection', () => {
    it('should find intersection of time slots', () => {
      const accountSlots = {
        '0x123': [
          {
            start: new Date('2024-01-15T10:00:00Z'),
            end: new Date('2024-01-15T12:00:00Z'),
          },
        ],
        '0x456': [
          {
            start: new Date('2024-01-15T11:00:00Z'),
            end: new Date('2024-01-15T13:00:00Z'),
          },
        ],
      }

      const result = CalendarBackendHelper.mergeSlotsIntersection(
        accountSlots as any
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty account slots', () => {
      const result = CalendarBackendHelper.mergeSlotsIntersection({})

      expect(result).toEqual([])
    })
  })
})

describe('generateIcsServer', () => {
  it('should generate ICS file for server-side events', async () => {
    const mockMeeting = {
      title: 'Test Meeting',
      content: 'Meeting description',
      start: new Date('2024-01-15T10:00:00Z'),
      end: new Date('2024-01-15T11:00:00Z'),
      meeting_url: 'https://meet.example.com/test',
      participants: [
        {
          privateInfo: { email: 'test@example.com' },
          type: 'owner',
        },
      ],
      iana_timezone: 'UTC',
      reminders: [],
      meeting_id: 'meeting-123',
    }

    const result = await generateIcsServer(mockMeeting as any, 'organizer@example.com')

    expect(result).toBeDefined()
    expect(result.error).toBeUndefined()
  })

  it('should handle invalid email addresses', async () => {
    const mockMeeting = {
      title: 'Test Meeting',
      start: new Date('2024-01-15T10:00:00Z'),
      end: new Date('2024-01-15T11:00:00Z'),
      participants: [
        {
          privateInfo: { email: 'invalid-email' },
        },
      ],
      iana_timezone: 'UTC',
      reminders: [],
    }

    const result = await generateIcsServer(mockMeeting as any, 'organizer@example.com')

    expect(result).toBeDefined()
  })

  it('should handle missing URLs gracefully', async () => {
    const mockMeeting = {
      title: 'Test Meeting',
      start: new Date('2024-01-15T10:00:00Z'),
      end: new Date('2024-01-15T11:00:00Z'),
      participants: [],
      iana_timezone: 'UTC',
      reminders: [],
    }

    const result = await generateIcsServer(mockMeeting as any, 'organizer@example.com')

    expect(result).toBeDefined()
  })
})
