import { calendar_v3 } from 'googleapis'
import { Frequency } from 'rrule'
import {
  AttendeeStatus,
  DayOfWeek,
  EventStatus,
  UnifiedAttendee,
  UnifiedEvent,
} from '@/types/Calendar'
import { TimeSlotSource } from '@/types/Meeting'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { GoogleEventMapper } from '@/utils/services/google.mapper'

describe('GoogleEventMapper', () => {
  const mockCalendarId = 'calendar-123'
  const mockCalendarName = 'Test Calendar'
  const mockAccountEmail = 'test@example.com'

  describe('toUnified', () => {
    it('should transform a basic Google event to unified format', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        summary: 'Test Meeting',
        start: { dateTime: '2024-01-01T10:00:00Z', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00Z', timeZone: 'UTC' },
        updated: '2024-01-01T09:00:00Z',
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.sourceEventId).toBe('event123')
      expect(result.title).toBe('Test Meeting')
      expect(result.source).toBe(TimeSlotSource.GOOGLE)
      expect(result.calendarId).toBe(mockCalendarId)
      expect(result.calendarName).toBe(mockCalendarName)
      expect(result.accountEmail).toBe(mockAccountEmail)
      expect(result.isAllDay).toBe(false)
    })

    it('should handle all-day events', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        summary: 'All Day Event',
        start: { date: '2024-01-01', timeZone: 'UTC' },
        end: { date: '2024-01-02', timeZone: 'UTC' },
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.isAllDay).toBe(true)
      expect(result.start).toBeInstanceOf(Date)
      expect(result.end).toBeInstanceOf(Date)
    })

    it('should handle missing optional fields', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.title).toBe('(No title)')
      expect(result.description).toBeUndefined()
      expect(result.attendees).toEqual([])
    })

    it('should map attendees correctly', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        attendees: [
          {
            email: 'attendee1@example.com',
            displayName: 'Attendee One',
            responseStatus: 'accepted',
            organizer: true,
          },
          {
            email: 'attendee2@example.com',
            displayName: 'Attendee Two',
            responseStatus: 'declined',
          },
        ],
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.attendees).toHaveLength(2)
      expect(result.attendees[0].email).toBe('attendee1@example.com')
      expect(result.attendees[0].name).toBe('Attendee One')
      expect(result.attendees[0].status).toBe(AttendeeStatus.ACCEPTED)
      expect(result.attendees[0].isOrganizer).toBe(true)
      expect(result.attendees[1].status).toBe(AttendeeStatus.DECLINED)
    })

    it('should set organizer permissions correctly', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        organizer: { self: true },
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.permissions).toContain(MeetingPermissions.EDIT_MEETING)
      expect(result.permissions).toContain(MeetingPermissions.INVITE_GUESTS)
      expect(result.permissions).toContain(MeetingPermissions.SEE_GUEST_LIST)
    })

    it('should set guest permissions when allowed', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        guestsCanModify: true,
        guestsCanInviteOthers: true,
        guestsCanSeeOtherGuests: true,
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.permissions).toContain(MeetingPermissions.EDIT_MEETING)
      expect(result.permissions).toContain(MeetingPermissions.INVITE_GUESTS)
      expect(result.permissions).toContain(MeetingPermissions.SEE_GUEST_LIST)
    })

    it('should extract meeting URL from conferenceData', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        conferenceData: {
          entryPoints: [{ uri: 'https://meet.google.com/abc-defg-hij' }],
        },
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://meet.google.com/abc-defg-hij')
    })

    it('should extract meeting URL from hangoutLink', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        hangoutLink: 'https://hangouts.google.com/call/xyz',
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://hangouts.google.com/call/xyz')
    })

    it('should extract meeting URL from location', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        location: 'https://zoom.us/j/123456789',
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://zoom.us/j/123456789')
    })

    it('should map event status correctly', () => {
      const confirmedEvent: calendar_v3.Schema$Event = {
        id: 'event1',
        status: 'confirmed',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
      }

      const tentativeEvent: calendar_v3.Schema$Event = {
        id: 'event2',
        status: 'tentative',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
      }

      const cancelledEvent: calendar_v3.Schema$Event = {
        id: 'event3',
        status: 'cancelled',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
      }

      expect(
        GoogleEventMapper.toUnified(
          confirmedEvent,
          mockCalendarId,
          mockCalendarName,
          mockAccountEmail
        ).status
      ).toBe(EventStatus.CONFIRMED)

      expect(
        GoogleEventMapper.toUnified(
          tentativeEvent,
          mockCalendarId,
          mockCalendarName,
          mockAccountEmail
        ).status
      ).toBe(EventStatus.TENTATIVE)

      expect(
        GoogleEventMapper.toUnified(
          cancelledEvent,
          mockCalendarId,
          mockCalendarName,
          mockAccountEmail
        ).status
      ).toBe(EventStatus.CANCELLED)
    })

    it('should handle recurrence rules', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        recurrence: ['RRULE:FREQ=DAILY;COUNT=10'],
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.recurrence).toBeDefined()
      expect(result.recurrence?.frequency).toBe(Frequency.DAILY)
      expect(result.recurrence?.occurrenceCount).toBe(10)
      expect(result.recurrence?.interval).toBe(1)
    })

    it('should handle weekly recurrence with days', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        recurrence: ['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=5'],
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.recurrence).toBeDefined()
      expect(result.recurrence?.frequency).toBe(Frequency.WEEKLY)
    })

    it('should preserve Google-specific provider data', () => {
      const googleEvent: calendar_v3.Schema$Event = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00Z' },
        end: { dateTime: '2024-01-01T11:00:00Z' },
        colorId: '5',
        visibility: 'private',
        transparency: 'opaque',
        iCalUID: 'ical-123@google.com',
      }

      const result = GoogleEventMapper.toUnified(
        googleEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.providerData?.google?.colorId).toBe('5')
      expect(result.providerData?.google?.visibility).toBe('private')
      expect(result.providerData?.google?.transparency).toBe('opaque')
      expect(result.providerData?.google?.iCalUID).toBe('ical-123@google.com')
    })
  })

  describe('fromUnified', () => {
    it('should convert unified event back to Google format', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = GoogleEventMapper.fromUnified(unifiedEvent)

      expect(result.id).toBe('google-event-123')
      expect(result.summary).toBe('Test Meeting')
      expect(result.status).toBe('confirmed')
      expect(result.start?.dateTime).toBeDefined()
      expect(result.end?.dateTime).toBeDefined()
    })

    it('should convert all-day events correctly', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'All Day Event',
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-02T00:00:00Z'),
        isAllDay: true,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = GoogleEventMapper.fromUnified(unifiedEvent)

      expect(result.start?.date).toBe('2024-01-01')
      expect(result.start?.dateTime).toBeUndefined()
      expect(result.end?.date).toBe('2024-01-02')
    })

    it('should convert attendees correctly', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'Meeting with Attendees',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        status: EventStatus.CONFIRMED,
        attendees: [
          {
            email: 'attendee1@example.com',
            name: 'Attendee One',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: true,
            providerData: { google: {} },
          },
          {
            email: 'attendee2@example.com',
            name: 'Attendee Two',
            status: AttendeeStatus.TENTATIVE,
            isOrganizer: false,
            providerData: { google: {} },
          },
        ],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = GoogleEventMapper.fromUnified(unifiedEvent)

      expect(result.attendees).toHaveLength(2)
      expect(result.attendees?.[0].email).toBe('attendee1@example.com')
      expect(result.attendees?.[0].displayName).toBe('Attendee One')
      expect(result.attendees?.[0].responseStatus).toBe('accepted')
      expect(result.attendees?.[0].organizer).toBe(true)
      expect(result.attendees?.[1].responseStatus).toBe('tentative')
    })

    it('should preserve Google provider data', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
        providerData: {
          google: {
            colorId: '7',
            visibility: 'public',
            guestsCanModify: true,
          },
        },
      }

      const result = GoogleEventMapper.fromUnified(unifiedEvent)

      expect(result.colorId).toBe('7')
      expect(result.visibility).toBe('public')
      expect(result.guestsCanModify).toBe(true)
    })

    it('should map unified status to Google status', () => {
      const baseEvent: Partial<UnifiedEvent> = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'Test',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const confirmed = GoogleEventMapper.fromUnified({
        ...baseEvent,
        status: EventStatus.CONFIRMED,
      } as UnifiedEvent)
      expect(confirmed.status).toBe('confirmed')

      const tentative = GoogleEventMapper.fromUnified({
        ...baseEvent,
        status: EventStatus.TENTATIVE,
      } as UnifiedEvent)
      expect(tentative.status).toBe('tentative')

      const cancelled = GoogleEventMapper.fromUnified({
        ...baseEvent,
        status: EventStatus.CANCELLED,
      } as UnifiedEvent)
      expect(cancelled.status).toBe('cancelled')
    })

    it('should handle empty description', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
        description: undefined,
      }

      const result = GoogleEventMapper.fromUnified(unifiedEvent)

      expect(result.description).toBe('')
    })

    it('should set location from meeting_url', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'google-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.GOOGLE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
        meeting_url: 'https://zoom.us/j/123456789',
      }

      const result = GoogleEventMapper.fromUnified(unifiedEvent)

      expect(result.location).toBe('https://zoom.us/j/123456789')
    })
  })
})
