import {
  mockUnifiedAttendee,
  mockUnifiedEvent,
  mockWebDAVEvent,
} from '@/testing/mocks'
import { AttendeeStatus, EventStatus } from '@/types/Calendar'
import { TimeSlotSource } from '@/types/Meeting'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { WebDAVEventMapper } from '@/utils/services/caldav.mapper'

describe('WebDAVEventMapper', () => {
  const mockCalendarId = 'calendar-123'
  const mockCalendarName = 'Test Calendar'
  const mockAccountEmail = 'test@example.com'

  describe('toUnified', () => {
    it('should transform a basic WebDAV event to unified format', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        url: 'https://caldav.server.com/event123',
        summary: 'Test Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        lastModified: '2024-01-01T09:00:00Z',
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.sourceEventId).toBe('event123')
      expect(result.title).toBe('Test Meeting')
      expect(result.source).toBe(TimeSlotSource.WEBDAV)
      expect(result.calendarId).toBe(mockCalendarId)
      expect(result.calendarName).toBe(mockCalendarName)
      expect(result.accountEmail).toBe(mockAccountEmail)
    })

    it('should handle all-day events', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'All Day Event',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-02T00:00:00Z'),
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.isAllDay).toBe(true)
      expect(result.start).toBeInstanceOf(Date)
      expect(result.end).toBeInstanceOf(Date)
    })

    it('should handle missing optional fields', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: '',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.title).toBe('(No title)')
      expect(result.description).toBeUndefined()
      expect(result.attendees).toEqual([])
    })

    it('should map attendees from string array format', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        attendees: [
          [
            'mailto:attendee1@example.com',
            'CN=Attendee One',
            'PARTSTAT=ACCEPTED',
            'ROLE=CHAIR',
          ],
          [
            'mailto:attendee2@example.com',
            'CN=Attendee Two',
            'PARTSTAT=DECLINED',
          ],
        ],
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      const attendees = result.attendees ?? []
      expect(attendees).toHaveLength(2)
      expect(attendees[0].email).toBe('attendee1@example.com')
      expect(attendees[0].name).toBe('Attendee One')
      expect(attendees[0].status).toBe(AttendeeStatus.ACCEPTED)
      expect(attendees[0].isOrganizer).toBe(true)
      expect(attendees[1].status).toBe(AttendeeStatus.DECLINED)
    })

    it('should extract email from simple string format', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        attendees: [['mailto:simple@example.com']],
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      const attendees = result.attendees ?? []
      expect(attendees).toHaveLength(1)
      expect(attendees[0].email).toBe('simple@example.com')
    })

    it('should set organizer permissions when user is organizer', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'My Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        organizer: mockAccountEmail,
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.permissions).toContain(MeetingPermissions.EDIT_MEETING)
      expect(result.permissions).toContain(MeetingPermissions.INVITE_GUESTS)
      expect(result.permissions).toContain(MeetingPermissions.SEE_GUEST_LIST)
    })

    it('should set guest permissions when user is not organizer', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        organizer: 'other@example.com',
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.permissions).toContain(MeetingPermissions.SEE_GUEST_LIST)
      expect(result.permissions).not.toContain(MeetingPermissions.EDIT_MEETING)
      expect(result.permissions).not.toContain(MeetingPermissions.INVITE_GUESTS)
    })

    it('should map event status correctly', () => {
      const confirmedEvent = mockWebDAVEvent({
        uid: 'event1',
        url: 'https://caldav.server.com/event1',
        summary: 'Confirmed',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        status: 'CONFIRMED',
      })

      const tentativeEvent = mockWebDAVEvent({
        uid: 'event2',
        url: 'https://caldav.server.com/event2',
        summary: 'Tentative',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        status: 'TENTATIVE',
      })

      const cancelledEvent = mockWebDAVEvent({
        uid: 'event3',
        url: 'https://caldav.server.com/event3',
        summary: 'Cancelled',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        status: 'CANCELLED',
      })

      expect(
        WebDAVEventMapper.toUnified(
          confirmedEvent,
          mockCalendarId,
          mockCalendarName,
          mockAccountEmail
        ).status
      ).toBe(EventStatus.CONFIRMED)

      expect(
        WebDAVEventMapper.toUnified(
          tentativeEvent,
          mockCalendarId,
          mockCalendarName,
          mockAccountEmail
        ).status
      ).toBe(EventStatus.TENTATIVE)

      expect(
        WebDAVEventMapper.toUnified(
          cancelledEvent,
          mockCalendarId,
          mockCalendarName,
          mockAccountEmail
        ).status
      ).toBe(EventStatus.CANCELLED)
    })

    it('should handle recurrence rules', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Recurring Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        rrule: null,
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      // CalDAV mapper returns null for recurrence when rrule is null
      expect(result.recurrence).toBeNull()
    })

    it('should preserve WebDAV-specific provider data', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        sequence: 3,
        timezone: 'America/New_York',
        duration: { hours: 1, minutes: 30 },
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.providerData?.webdav?.sequence).toBe(3)
      expect(result.providerData?.webdav?.timezone).toBe('America/New_York')
      expect(result.providerData?.webdav?.duration).toEqual({
        hours: 1,
        minutes: 30,
      })
    })

    it('should handle location field', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        location: 'https://zoom.us/j/123456789',
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://zoom.us/j/123456789')
    })

    it('should handle attendee status mapping', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        attendees: [
          ['mailto:a1@example.com', 'PARTSTAT=ACCEPTED'],
          ['mailto:a2@example.com', 'PARTSTAT=DECLINED'],
          ['mailto:a3@example.com', 'PARTSTAT=TENTATIVE'],
          ['mailto:a4@example.com', 'PARTSTAT=NEEDS-ACTION'],
        ],
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      const attendees = result.attendees ?? []
      expect(attendees[0].status).toBe(AttendeeStatus.ACCEPTED)
      expect(attendees[1].status).toBe(AttendeeStatus.DECLINED)
      expect(attendees[2].status).toBe(AttendeeStatus.TENTATIVE)
      expect(attendees[3].status).toBe(AttendeeStatus.NEEDS_ACTION)
    })

    it('should handle attendees with CUTYPE', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        attendees: [
          ['mailto:attendee@example.com', 'CUTYPE=INDIVIDUAL', 'RSVP=TRUE'],
        ],
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      const attendees = result.attendees ?? []
      expect(attendees[0].providerData?.webdav?.cutype).toBe('INDIVIDUAL')
      expect(attendees[0].providerData?.webdav?.rsvp).toBe(true)
    })

    it('should handle empty attendees array', () => {
      const webdavEvent = mockWebDAVEvent({
        uid: 'event123',
        summary: 'Solo Meeting',
        startDate: new Date('2024-01-01T10:00:00Z'),
        endDate: new Date('2024-01-01T11:00:00Z'),
        attendees: [],
      })

      const result = WebDAVEventMapper.toUnified(
        webdavEvent,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.attendees).toEqual([])
    })
  })

  describe('fromUnified', () => {
    it('should convert unified event back to WebDAV format', () => {
      const unifiedEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Test Meeting',
        description: null,
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        status: EventStatus.CONFIRMED,
        attendees: [],
        lastModified: new Date('2024-01-01T09:00:00Z'),
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
          },
        },
      })

      const result = WebDAVEventMapper.fromUnified(unifiedEvent)

      expect(result.uid).toBe('webdav-event-123')
      expect(result.summary).toBe('Test Meeting')
      expect(result.status).toBe('CONFIRMED')
      expect(result.url).toBe('https://caldav.server.com/event123')
    })

    it('should convert attendees correctly', () => {
      const unifiedEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Meeting with Attendees',
        description: null,
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        status: EventStatus.CONFIRMED,
        attendees: [
          mockUnifiedAttendee({
            email: 'attendee1@example.com',
            name: 'Attendee One',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: true,
            providerData: { webdav: {} },
          }),
          mockUnifiedAttendee({
            email: 'attendee2@example.com',
            name: 'Attendee Two',
            status: AttendeeStatus.TENTATIVE,
            isOrganizer: false,
            providerData: { webdav: {} },
          }),
        ],
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
          },
        },
      })

      const result = WebDAVEventMapper.fromUnified(unifiedEvent)

      const attendees = result.attendees ?? []
      expect(attendees).toHaveLength(2)
      expect(attendees[0]).toContain('mailto:attendee1@example.com')
      expect(attendees[0]).toContain('CN="Attendee One"')
      expect(attendees[0]).toContain('PARTSTAT=ACCEPTED')
      expect(attendees[0]).toContain('ROLE=CHAIR')
      expect(attendees[1]).toContain('PARTSTAT=TENTATIVE')
      expect(attendees[1]).toContain('ROLE=REQ-PARTICIPANT')
    })

    it('should preserve WebDAV provider data', () => {
      const unifiedEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Test Meeting',
        description: null,
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        status: EventStatus.CONFIRMED,
        attendees: [],
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
            sequence: 5,
            timezone: 'America/Los_Angeles',
            duration: { hours: 2 },
          },
        },
      })

      const result = WebDAVEventMapper.fromUnified(unifiedEvent)

      expect(result.sequence).toBe(5)
      expect(result.timezone).toBe('America/Los_Angeles')
      expect(result.duration).toEqual({ hours: 2 })
    })

    it('should map unified status to WebDAV status', () => {
      const baseEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Test',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        attendees: [],
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
          },
        },
      })

      const confirmed = WebDAVEventMapper.fromUnified({
        ...baseEvent,
        status: EventStatus.CONFIRMED,
      })
      expect(confirmed.status).toBe('CONFIRMED')

      const tentative = WebDAVEventMapper.fromUnified({
        ...baseEvent,
        status: EventStatus.TENTATIVE,
      })
      expect(tentative.status).toBe('TENTATIVE')

      const cancelled = WebDAVEventMapper.fromUnified({
        ...baseEvent,
        status: EventStatus.CANCELLED,
      })
      expect(cancelled.status).toBe('CANCELLED')
    })

    it('should handle attendee without name', () => {
      const unifiedEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Meeting',
        description: null,
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        status: EventStatus.CONFIRMED,
        attendees: [
          mockUnifiedAttendee({
            email: 'attendee@example.com',
            name: null,
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: false,
            providerData: { webdav: {} },
          }),
        ],
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
          },
        },
      })

      const result = WebDAVEventMapper.fromUnified(unifiedEvent)

      const attendees = result.attendees ?? []
      expect(attendees[0]).toContain('mailto:attendee@example.com')
      expect(attendees[0]).toContain('PARTSTAT=ACCEPTED')
      expect(
        attendees[0].find((item: string) => item.startsWith('CN='))
      ).toBeUndefined()
    })

    it('should handle attendee with RSVP', () => {
      const unifiedEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Meeting',
        description: null,
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        status: EventStatus.CONFIRMED,
        attendees: [
          mockUnifiedAttendee({
            email: 'attendee@example.com',
            name: 'Attendee',
            status: AttendeeStatus.NEEDS_ACTION,
            isOrganizer: false,
            providerData: { webdav: { rsvp: true, cutype: 'INDIVIDUAL' } },
          }),
        ],
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
          },
        },
      })

      const result = WebDAVEventMapper.fromUnified(unifiedEvent)

      const attendees = result.attendees ?? []
      expect(attendees[0]).toContain('RSVP=TRUE')
      expect(attendees[0]).toContain('CUTYPE=INDIVIDUAL')
    })

    it('should set location from meeting_url', () => {
      const unifiedEvent = mockUnifiedEvent({
        id: 'unified-123',
        sourceEventId: 'webdav-event-123',
        title: 'Meeting',
        description: null,
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        status: EventStatus.CONFIRMED,
        attendees: [],
        meeting_url: 'https://teams.microsoft.com/meet/abc123',
        providerData: {
          webdav: {
            url: 'https://caldav.server.com/event123',
            rrule: null,
          },
        },
      })

      const result = WebDAVEventMapper.fromUnified(unifiedEvent)

      expect(result.location).toBe('https://teams.microsoft.com/meet/abc123')
    })
  })
})
