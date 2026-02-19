import { Frequency } from 'rrule'
import {
  AttendeeStatus,
  EventStatus,
  UnifiedAttendee,
  UnifiedEvent,
} from '@/types/Calendar'
import {
  DateTimeTimeZone,
  ItemBody,
  MicrosoftGraphEvent,
} from '@/types/Office365'
import { TimeSlotSource } from '@/types/Meeting'
import { MeetingPermissions } from '@/utils/constants/schedule'
import { Office365EventMapper } from '@/utils/services/office.mapper'

describe('Office365EventMapper', () => {
  const mockCalendarId = 'calendar-123'
  const mockCalendarName = 'Test Calendar'
  const mockAccountEmail = 'test@example.com'

  describe('toUnified', () => {
    it('should transform a basic Office365 event to unified format', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        subject: 'Test Meeting',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        lastModifiedDateTime: '2024-01-01T09:00:00Z',
        isAllDay: false,
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.sourceEventId).toBe('event123')
      expect(result.title).toBe('Test Meeting')
      expect(result.source).toBe(TimeSlotSource.OFFICE)
      expect(result.calendarId).toBe(mockCalendarId)
      expect(result.calendarName).toBe(mockCalendarName)
      expect(result.accountEmail).toBe(mockAccountEmail)
    })

    it('should handle all-day events', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        subject: 'All Day Event',
        start: { dateTime: '2024-01-01T00:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-02T00:00:00', timeZone: 'UTC' },
        isAllDay: true,
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.isAllDay).toBe(true)
      expect(result.start).toBeInstanceOf(Date)
      expect(result.end).toBeInstanceOf(Date)
    })

    it('should handle missing optional fields', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.title).toBe('(No title)')
      expect(result.description).toBeUndefined()
      expect(result.attendees).toEqual([])
    })

    it('should map attendees correctly', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        attendees: [
          {
            emailAddress: {
              address: 'attendee1@example.com',
              name: 'Attendee One',
            },
            type: 'required',
            status: { response: 'accepted' },
          },
          {
            emailAddress: {
              address: 'attendee2@example.com',
              name: 'Attendee Two',
            },
            type: 'optional',
            status: { response: 'declined' },
          },
        ],
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
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
      expect(result.attendees[1].isOrganizer).toBe(false)
    })

    it('should set organizer permissions correctly', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        organizer: {
          emailAddress: {
            address: mockAccountEmail,
            name: 'Test User',
          },
        },
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.permissions).toContain(MeetingPermissions.SEE_GUEST_LIST)
      expect(result.permissions).toContain(MeetingPermissions.INVITE_GUESTS)
    })

    it('should handle hideAttendees permission', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        hideAttendees: true,
        organizer: {
          emailAddress: {
            address: 'other@example.com',
            name: 'Other User',
          },
        },
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.permissions).not.toContain(MeetingPermissions.SEE_GUEST_LIST)
    })

    it('should extract meeting URL from onlineMeeting', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        onlineMeeting: {
          joinUrl: 'https://teams.microsoft.com/meet/abc123',
        },
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://teams.microsoft.com/meet/abc123')
    })

    it('should extract meeting URL from onlineMeetingUrl', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        onlineMeetingUrl: 'https://teams.microsoft.com/meet/xyz789',
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://teams.microsoft.com/meet/xyz789')
    })

    it('should extract meeting URL from location', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        location: {
          displayName: 'https://zoom.us/j/123456789',
        },
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.meeting_url).toBe('https://zoom.us/j/123456789')
    })

    it('should map event status correctly', async () => {
      const cancelledEvent: MicrosoftGraphEvent = {
        id: 'event1',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        isCancelled: true,
      }

      const declinedEvent: MicrosoftGraphEvent = {
        id: 'event2',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        responseStatus: { response: 'declined' },
      }

      const tentativeEvent: MicrosoftGraphEvent = {
        id: 'event3',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        responseStatus: { response: 'tentativelyAccepted' },
      }

      expect(
        (
          await Office365EventMapper.toUnified(
            cancelledEvent,
            mockCalendarId,
            mockCalendarName,
            mockAccountEmail
          )
        ).status
      ).toBe(EventStatus.CANCELLED)

      expect(
        (
          await Office365EventMapper.toUnified(
            declinedEvent,
            mockCalendarId,
            mockCalendarName,
            mockAccountEmail
          )
        ).status
      ).toBe(EventStatus.DECLINED)

      expect(
        (
          await Office365EventMapper.toUnified(
            tentativeEvent,
            mockCalendarId,
            mockCalendarName,
            mockAccountEmail
          )
        ).status
      ).toBe(EventStatus.TENTATIVE)
    })

    it('should handle recurrence rules', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        recurrence: {
          pattern: {
            type: 'daily',
            interval: 1,
          },
          range: {
            type: 'numbered',
            numberOfOccurrences: 10,
            startDate: '2024-01-01',
          },
        },
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.recurrence).toBeDefined()
      expect(result.recurrence?.frequency).toBe(Frequency.DAILY)
      expect(result.recurrence?.interval).toBe(1)
      expect(result.recurrence?.occurrenceCount).toBe(10)
    })

    it('should map weekly recurrence with days', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        recurrence: {
          pattern: {
            type: 'weekly',
            interval: 1,
            daysOfWeek: ['monday', 'wednesday', 'friday'],
          },
          range: {
            type: 'noEnd',
            startDate: '2024-01-01',
          },
        },
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.recurrence).toBeDefined()
      expect(result.recurrence?.frequency).toBe(Frequency.WEEKLY)
      expect(result.recurrence?.daysOfWeek).toHaveLength(3)
    })

    it('should preserve Office365-specific provider data', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        importance: 'high',
        sensitivity: 'private',
        showAs: 'busy',
        isReminderOn: true,
        reminderMinutesBeforeStart: 15,
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.providerData?.office365?.importance).toBe('high')
      expect(result.providerData?.office365?.sensitivity).toBe('private')
      expect(result.providerData?.office365?.showAs).toBe('busy')
      expect(result.providerData?.office365?.isReminderOn).toBe(true)
      expect(result.providerData?.office365?.reminderMinutesBeforeStart).toBe(15)
    })

    it('should handle attendee status mapping', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        attendees: [
          {
            emailAddress: { address: 'a1@example.com', name: 'A1' },
            type: 'required',
            status: { response: 'accepted' },
          },
          {
            emailAddress: { address: 'a2@example.com', name: 'A2' },
            type: 'optional',
            status: { response: 'declined' },
          },
          {
            emailAddress: { address: 'a3@example.com', name: 'A3' },
            type: 'required',
            status: { response: 'tentativelyAccepted' },
          },
          {
            emailAddress: { address: 'a4@example.com', name: 'A4' },
            type: 'optional',
            status: { response: 'none' },
          },
        ],
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.attendees[0].status).toBe(AttendeeStatus.ACCEPTED)
      expect(result.attendees[1].status).toBe(AttendeeStatus.DECLINED)
      expect(result.attendees[2].status).toBe(AttendeeStatus.TENTATIVE)
      expect(result.attendees[3].status).toBe(AttendeeStatus.NEEDS_ACTION)
    })

    it('should handle organizer attendee status', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        attendees: [
          {
            emailAddress: { address: 'organizer@example.com', name: 'Organizer' },
            type: 'required',
            status: { response: 'organizer' },
          },
        ],
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.attendees[0].status).toBe(AttendeeStatus.ACCEPTED)
    })

    it('should handle empty attendees array', async () => {
      const o365Event: MicrosoftGraphEvent = {
        id: 'event123',
        start: { dateTime: '2024-01-01T10:00:00', timeZone: 'UTC' },
        end: { dateTime: '2024-01-01T11:00:00', timeZone: 'UTC' },
        isAllDay: false,
        attendees: [],
      }

      const result = await Office365EventMapper.toUnified(
        o365Event,
        mockCalendarId,
        mockCalendarName,
        mockAccountEmail
      )

      expect(result.attendees).toEqual([])
    })
  })

  describe('fromUnified', () => {
    it('should convert unified event back to Office365 format', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.id).toBe('office-event-123')
      expect(result.subject).toBe('Test Meeting')
      expect(result.isAllDay).toBe(false)
      expect(result.start?.dateTime).toBeDefined()
      expect(result.end?.dateTime).toBeDefined()
    })

    it('should convert all-day events correctly', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'All Day Event',
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-02T00:00:00Z'),
        isAllDay: true,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.isAllDay).toBe(true)
      expect(result.start?.dateTime).toBeDefined()
      expect(result.end?.dateTime).toBeDefined()
    })

    it('should convert attendees correctly', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Meeting with Attendees',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [
          {
            email: 'attendee1@example.com',
            name: 'Attendee One',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: true,
            providerData: { office365: {} },
          },
          {
            email: 'attendee2@example.com',
            name: 'Attendee Two',
            status: AttendeeStatus.TENTATIVE,
            isOrganizer: false,
            providerData: { office365: {} },
          },
        ],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.attendees).toHaveLength(2)
      expect(result.attendees?.[0].emailAddress.address).toBe('attendee1@example.com')
      expect(result.attendees?.[0].emailAddress.name).toBe('Attendee One')
      expect(result.attendees?.[0].status?.response).toBe('accepted')
      expect(result.attendees?.[0].type).toBe('required')
      expect(result.attendees?.[1].status?.response).toBe('tentativelyAccepted')
      expect(result.attendees?.[1].type).toBe('optional')
    })

    it('should preserve Office365 provider data', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
        providerData: {
          office365: {
            importance: 'high',
            sensitivity: 'confidential',
            isReminderOn: true,
            reminderMinutesBeforeStart: 30,
          },
        },
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.importance).toBe('high')
      expect(result.sensitivity).toBe('confidential')
      expect(result.isReminderOn).toBe(true)
      expect(result.reminderMinutesBeforeStart).toBe(30)
    })

    it('should map unified attendee status to Office365 status', () => {
      const baseEvent: Partial<UnifiedEvent> = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Test',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const accepted = Office365EventMapper.fromUnified({
        ...baseEvent,
        attendees: [
          {
            email: 'test@example.com',
            name: 'Test',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: false,
            providerData: { office365: {} },
          },
        ],
      } as UnifiedEvent)
      expect(accepted.attendees?.[0].status?.response).toBe('accepted')

      const declined = Office365EventMapper.fromUnified({
        ...baseEvent,
        attendees: [
          {
            email: 'test@example.com',
            name: 'Test',
            status: AttendeeStatus.DECLINED,
            isOrganizer: false,
            providerData: { office365: {} },
          },
        ],
      } as UnifiedEvent)
      expect(declined.attendees?.[0].status?.response).toBe('declined')

      const tentative = Office365EventMapper.fromUnified({
        ...baseEvent,
        attendees: [
          {
            email: 'test@example.com',
            name: 'Test',
            status: AttendeeStatus.TENTATIVE,
            isOrganizer: false,
            providerData: { office365: {} },
          },
        ],
      } as UnifiedEvent)
      expect(tentative.attendees?.[0].status?.response).toBe('tentativelyAccepted')

      const needsAction = Office365EventMapper.fromUnified({
        ...baseEvent,
        attendees: [
          {
            email: 'test@example.com',
            name: 'Test',
            status: AttendeeStatus.NEEDS_ACTION,
            isOrganizer: false,
            providerData: { office365: {} },
          },
        ],
      } as UnifiedEvent)
      expect(needsAction.attendees?.[0].status?.response).toBe('none')
    })

    it('should handle empty description', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
        description: '',
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.body).toBeUndefined()
    })

    it('should set location from meeting_url', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Test Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
        meeting_url: 'https://teams.microsoft.com/meet/abc123',
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.location?.displayName).toBe('https://teams.microsoft.com/meet/abc123')
    })

    it('should handle attendee without name', () => {
      const unifiedEvent: UnifiedEvent = {
        id: 'unified-123',
        sourceEventId: 'office-event-123',
        title: 'Meeting',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        isAllDay: false,
        calendarId: mockCalendarId,
        calendarName: mockCalendarName,
        accountEmail: mockAccountEmail,
        source: TimeSlotSource.OFFICE,
        status: EventStatus.CONFIRMED,
        attendees: [
          {
            email: 'attendee@example.com',
            name: null,
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: false,
            providerData: { office365: {} },
          },
        ],
        permissions: [],
        lastModified: new Date(),
        isReadOnlyCalendar: false,
      }

      const result = Office365EventMapper.fromUnified(unifiedEvent)

      expect(result.attendees?.[0].emailAddress.address).toBe('attendee@example.com')
      expect(result.attendees?.[0].emailAddress.name).toBe('')
    })
  })
})
