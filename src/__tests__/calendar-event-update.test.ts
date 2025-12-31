import { AttendeeStatus, EventStatus, UnifiedEvent } from '@/types/Calendar'
import { TimeSlotSource } from '@/types/Meeting'
import { getConnectedCalendars } from '@/utils/database'
import { CalendarBackendHelper } from '@/utils/services/calendar.backend.helper'
import { getConnectedCalendarIntegration } from '@/utils/services/connected_calendars.factory'

jest.mock('@/utils/database')
jest.mock('@/utils/services/connected_calendars.factory')

describe('Unified Calendar Event Update', () => {
  const mockAccountAddress = '0x1234567890abcdef'
  const mockEmail = 'test@example.com'

  const createMockEvent = (
    overrides?: Partial<UnifiedEvent>
  ): UnifiedEvent => ({
    id: 'event-123',
    sourceEventId: 'google-event-456',
    title: 'Test Event',
    description: 'Test Description',
    start: new Date('2024-01-15T14:00:00Z'),
    end: new Date('2024-01-15T15:00:00Z'),
    isAllDay: false,
    source: TimeSlotSource.GOOGLE,
    calendarId: 'primary',
    accountEmail: mockEmail,
    meeting_url: 'https://meet.google.com/abc-defg-hij',
    webLink: 'https://calendar.google.com/event?eid=abc123',
    attendees: [
      {
        email: 'attendee@example.com',
        name: 'John Doe',
        status: AttendeeStatus.ACCEPTED,
        isOrganizer: false,
        providerData: {},
      },
    ],
    status: EventStatus.CONFIRMED,
    lastModified: new Date('2024-01-10T12:00:00Z'),
    etag: '"3147483647000"',
    providerData: {
      google: {
        colorId: '1',
        visibility: 'default',
        guestsCanModify: true,
      },
    },
    ...overrides,
  })

  const mockIntegration = {
    updateEvent: jest.fn(),
    getEvents: jest.fn(),
    getConnectedEmail: jest.fn(() => mockEmail),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getConnectedCalendars as jest.Mock).mockResolvedValue([
      {
        id: 'cal-1',
        account_address: mockAccountAddress,
        email: mockEmail,
        provider: TimeSlotSource.GOOGLE,
        payload: { access_token: 'mock-token' },
        calendars: [
          {
            calendarId: 'primary',
            enabled: true,
            sync: true,
            name: 'Primary',
          },
        ],
      },
    ])
    ;(getConnectedCalendarIntegration as jest.Mock).mockReturnValue(
      mockIntegration
    )
  })

  describe('updateCalendarEvent', () => {
    it('should update a basic event successfully', async () => {
      const mockEvent = createMockEvent()
      const updatedMockEvent = createMockEvent({ title: 'Updated Title' })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([updatedMockEvent])

      const result = await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      expect(getConnectedCalendars).toHaveBeenCalledWith(mockAccountAddress, {
        activeOnly: true,
      })
      expect(mockIntegration.updateEvent).toHaveBeenCalled()
      expect(result).toEqual(updatedMockEvent)
    })

    it('should throw error if calendar not found', async () => {
      ;(getConnectedCalendars as jest.Mock).mockResolvedValue([])

      const mockEvent = createMockEvent()

      await expect(
        CalendarBackendHelper.updateCalendarEvent(mockAccountAddress, mockEvent)
      ).rejects.toThrow('Calendar not found or not enabled')
    })

    it('should throw error if calendar is disabled', async () => {
      ;(getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          account_address: mockAccountAddress,
          email: mockEmail,
          provider: TimeSlotSource.GOOGLE,
          payload: {},
          calendars: [
            {
              calendarId: 'primary',
              enabled: false, // Disabled
              sync: true,
            },
          ],
        },
      ])

      const mockEvent = createMockEvent()

      await expect(
        CalendarBackendHelper.updateCalendarEvent(mockAccountAddress, mockEvent)
      ).rejects.toThrow('Calendar not found or not enabled')
    })

    it('should handle missing required fields', async () => {
      const invalidEvent = createMockEvent({ sourceEventId: undefined } as any)

      await expect(
        CalendarBackendHelper.updateCalendarEvent(
          mockAccountAddress,
          invalidEvent
        )
      ).rejects.toThrow('Missing required fields')
    })

    it('should update event with attendees', async () => {
      const mockEvent = createMockEvent({
        attendees: [
          {
            email: 'alice@example.com',
            name: 'Alice',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: false,
            providerData: {},
          },
          {
            email: 'bob@example.com',
            name: 'Bob',
            status: AttendeeStatus.TENTATIVE,
            isOrganizer: false,
            providerData: {},
          },
        ],
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      const updateCall = mockIntegration.updateEvent.mock.calls[0]
      const meetingRequest = updateCall[1]

      expect(meetingRequest.participants).toHaveLength(2)
      expect(meetingRequest.participants[0].guest_email).toBe(
        'alice@example.com'
      )
      expect(meetingRequest.participants[1].guest_email).toBe('bob@example.com')
    })

    it('should preserve provider-specific data', async () => {
      const mockEvent = createMockEvent({
        providerData: {
          google: {
            colorId: '5',
            visibility: 'private',
            guestsCanModify: false,
            guestsCanInviteOthers: true,
          },
        },
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      const result = await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      expect(result.providerData?.google?.colorId).toBe('5')
      expect(result.providerData?.google?.visibility).toBe('private')
    })

    it('should handle Office365 events', async () => {
      ;(getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          account_address: mockAccountAddress,
          email: mockEmail,
          provider: TimeSlotSource.OFFICE,
          payload: {},
          calendars: [{ calendarId: 'cal-office', enabled: true }],
        },
      ])

      const mockEvent = createMockEvent({
        source: TimeSlotSource.OFFICE,
        calendarId: 'cal-office',
        providerData: {
          office365: {
            importance: 'high',
            sensitivity: 'normal',
            isOnlineMeeting: true,
          },
        },
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      const result = await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      expect(result.source).toBe(TimeSlotSource.OFFICE)
      expect(getConnectedCalendarIntegration).toHaveBeenCalledWith(
        mockAccountAddress,
        mockEmail,
        TimeSlotSource.OFFICE,
        expect.any(Object)
      )
    })

    it('should handle CalDAV/WebDAV events', async () => {
      ;(getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          account_address: mockAccountAddress,
          email: mockEmail,
          provider: TimeSlotSource.WEBDAV,
          payload: {},
          calendars: [{ calendarId: 'cal-webdav', enabled: true }],
        },
      ])

      const mockEvent = createMockEvent({
        source: TimeSlotSource.WEBDAV,
        calendarId: 'cal-webdav',
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      expect(getConnectedCalendarIntegration).toHaveBeenCalledWith(
        mockAccountAddress,
        mockEmail,
        TimeSlotSource.WEBDAV,
        expect.any(Object)
      )
    })

    it('should throw error if event not found after update', async () => {
      const mockEvent = createMockEvent()

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([]) // Empty result

      await expect(
        CalendarBackendHelper.updateCalendarEvent(mockAccountAddress, mockEvent)
      ).rejects.toThrow('Failed to retrieve updated event')
    })

    it('should handle provider update errors gracefully', async () => {
      const mockEvent = createMockEvent()

      mockIntegration.updateEvent.mockRejectedValue(
        new Error('Provider API error: Rate limit exceeded')
      )

      await expect(
        CalendarBackendHelper.updateCalendarEvent(mockAccountAddress, mockEvent)
      ).rejects.toThrow('Failed to update calendar event')
    })

    it('should use correct time window when re-fetching event', async () => {
      const mockEvent = createMockEvent({
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      const getEventsCall = mockIntegration.getEvents.mock.calls[0]
      const startWindow = new Date(getEventsCall[1])
      const endWindow = new Date(getEventsCall[2])

      // Should fetch 1 hour before start and 1 hour after end
      expect(startWindow.getTime()).toBeLessThan(mockEvent.start.getTime())
      expect(endWindow.getTime()).toBeGreaterThan(mockEvent.end.getTime())
    })

    it('should map attendee status correctly', async () => {
      const mockEvent = createMockEvent({
        attendees: [
          {
            name: 'Accepted User',
            email: 'accepted@example.com',
            status: AttendeeStatus.ACCEPTED,
            providerData: {},
          },
          {
            name: 'Accepted User',
            email: 'declined@example.com',
            status: AttendeeStatus.DECLINED,
            providerData: {},
          },
          {
            name: 'Accepted User',
            email: 'tentative@example.com',
            status: AttendeeStatus.TENTATIVE,
            providerData: {},
          },
          {
            name: 'Accepted User',
            email: 'pending@example.com',
            status: AttendeeStatus.NEEDS_ACTION,
            providerData: {},
          },
        ],
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      const updateCall = mockIntegration.updateEvent.mock.calls[0]
      const participants = updateCall[1].participants

      expect(participants[0].status).toBe('Accepted')
      expect(participants[1].status).toBe('Rejected')
      expect(participants[2].status).toBe('Pending')
      expect(participants[3].status).toBe('Pending')
    })

    it('should set organizer participant type correctly', async () => {
      const mockEvent = createMockEvent({
        attendees: [
          {
            email: 'organizer@example.com',
            name: 'Organizer',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: true,
            providerData: {},
          },
          {
            email: 'invitee@example.com',
            name: 'Invitee',
            status: AttendeeStatus.ACCEPTED,
            isOrganizer: false,
            providerData: {},
          },
        ],
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      const updateCall = mockIntegration.updateEvent.mock.calls[0]
      const participants = updateCall[1].participants

      expect(participants[0].type).toBe('owner')
      expect(participants[1].type).toBe('invitee')
    })

    it('should handle all-day events correctly', async () => {
      const mockEvent = createMockEvent({
        isAllDay: true,
        start: new Date('2024-01-15T00:00:00Z'),
        end: new Date('2024-01-16T00:00:00Z'),
      })

      mockIntegration.updateEvent.mockResolvedValue({})
      mockIntegration.getEvents.mockResolvedValue([mockEvent])

      const result = await CalendarBackendHelper.updateCalendarEvent(
        mockAccountAddress,
        mockEvent
      )

      expect(result.isAllDay).toBe(true)
    })
  })
})
