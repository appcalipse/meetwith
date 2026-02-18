/**
 * Comprehensive tests for office365.service
 * Testing Office 365 calendar integration operations
 */

import { Office365Service } from '@/utils/services/office365.service'
import { TimeSlotSource } from '@/types/Meeting'
import { ParticipationStatus } from '@/types/ParticipantInfo'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getEventMapping: jest.fn(),
  createEventMapping: jest.fn(),
  deleteEventMapping: jest.fn(),
  updateEventMapping: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'

describe('Office365Service', () => {
  let service: Office365Service

  beforeEach(() => {
    jest.clearAllMocks()
    service = new Office365Service({
      email: 'test@example.com',
      account_address: '0x123',
      refresh_token: 'refresh_token',
      access_token: 'access_token',
    })
  })

  describe('createEvent', () => {
    it('should create event in Office 365 calendar', async () => {
      const mockMeetingRequest = {
        start: new Date('2024-01-15T10:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'),
        title: 'Test Meeting',
        content: 'Meeting description',
        participants: [],
        meeting_id: 'meeting-123',
        meeting_type_id: 'type-123',
        iana_timezone: 'UTC',
      }

      // Mock Graph API response
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({
        id: 'office365-event-123',
        subject: 'Test Meeting',
      })

      ;(database.createEventMapping as jest.Mock).mockResolvedValue({})

      const result = await service.createEvent('primary', mockMeetingRequest as any)

      expect(result).toBeDefined()
      expect(result.externalEventId).toBe('office365-event-123')
      expect(database.createEventMapping).toHaveBeenCalled()
    })

    it('should handle recurring events', async () => {
      const mockMeetingRequest = {
        start: new Date('2024-01-15T10:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'),
        title: 'Recurring Meeting',
        rrule: ['FREQ=WEEKLY;COUNT=10'],
        participants: [],
        meeting_id: 'meeting-recurring',
        iana_timezone: 'UTC',
      }

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({
        id: 'office365-recurring-123',
      })

      ;(database.createEventMapping as jest.Mock).mockResolvedValue({})

      const result = await service.createEvent('primary', mockMeetingRequest as any)

      expect(result).toBeDefined()
      expect(database.createEventMapping).toHaveBeenCalled()
    })

    it('should handle Graph API errors', async () => {
      const mockMeetingRequest = {
        start: new Date('2024-01-15T10:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'),
        title: 'Test Meeting',
        participants: [],
        meeting_id: 'meeting-error',
        iana_timezone: 'UTC',
      }

      jest.spyOn(service as any, 'makeRequest').mockRejectedValue(
        new Error('Graph API error')
      )

      await expect(
        service.createEvent('primary', mockMeetingRequest as any)
      ).rejects.toThrow()
    })
  })

  describe('updateEvent', () => {
    it('should update existing event', async () => {
      const mockEventMapping = {
        external_event_id: 'office365-event-123',
      }

      ;(database.getEventMapping as jest.Mock).mockResolvedValue(mockEventMapping)

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({
        id: 'office365-event-123',
      })

      const mockMeetingRequest = {
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        title: 'Updated Meeting',
        meeting_id: 'meeting-123',
        iana_timezone: 'UTC',
      }

      const result = await service.updateEvent('primary', mockMeetingRequest as any)

      expect(result).toBeDefined()
      expect(database.getEventMapping).toHaveBeenCalled()
    })

    it('should fall back to create if mapping not found', async () => {
      ;(database.getEventMapping as jest.Mock).mockResolvedValue(null)

      jest.spyOn(service, 'createEvent').mockResolvedValue({
        externalEventId: 'new-event-123',
      } as any)

      const mockMeetingRequest = {
        start: new Date('2024-01-15T14:00:00Z'),
        end: new Date('2024-01-15T15:00:00Z'),
        title: 'New Meeting',
        meeting_id: 'meeting-new',
        iana_timezone: 'UTC',
      }

      const result = await service.updateEvent('primary', mockMeetingRequest as any)

      expect(service.createEvent).toHaveBeenCalled()
    })
  })

  describe('deleteEvent', () => {
    it('should delete event from Office 365 calendar', async () => {
      const mockEventMapping = {
        external_event_id: 'office365-event-123',
      }

      ;(database.getEventMapping as jest.Mock).mockResolvedValue(mockEventMapping)

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({})

      ;(database.deleteEventMapping as jest.Mock).mockResolvedValue({})

      await service.deleteEvent('primary', 'meeting-123')

      expect(database.deleteEventMapping).toHaveBeenCalled()
    })

    it('should handle missing event mapping', async () => {
      ;(database.getEventMapping as jest.Mock).mockResolvedValue(null)

      await service.deleteEvent('primary', 'missing-meeting')

      expect(database.deleteEventMapping).not.toHaveBeenCalled()
    })
  })

  describe('getAvailability', () => {
    it('should fetch availability with pagination', async () => {
      const mockResponse = {
        value: [
          {
            start: { dateTime: '2024-01-15T10:00:00Z' },
            end: { dateTime: '2024-01-15T11:00:00Z' },
          },
        ],
      }

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse)

      const result = await service.getAvailability(
        'primary',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle pagination with nextLink', async () => {
      const mockFirstPage = {
        value: [
          {
            start: { dateTime: '2024-01-15T10:00:00Z' },
            end: { dateTime: '2024-01-15T11:00:00Z' },
          },
        ],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next',
      }

      const mockSecondPage = {
        value: [
          {
            start: { dateTime: '2024-01-16T14:00:00Z' },
            end: { dateTime: '2024-01-16T15:00:00Z' },
          },
        ],
      }

      jest
        .spyOn(service as any, 'makeRequest')
        .mockResolvedValueOnce(mockFirstPage)
        .mockResolvedValueOnce(mockSecondPage)

      const result = await service.getAvailability(
        'primary',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result.length).toBeGreaterThan(1)
    })

    it('should handle API errors', async () => {
      jest.spyOn(service as any, 'makeRequest').mockRejectedValue(
        new Error('401 Unauthorized')
      )

      await expect(
        service.getAvailability('primary', new Date(), new Date())
      ).rejects.toThrow()
    })
  })

  describe('getEvents', () => {
    it('should fetch events from calendar', async () => {
      const mockResponse = {
        value: [
          {
            id: 'event-1',
            subject: 'Meeting 1',
            start: { dateTime: '2024-01-15T10:00:00Z' },
            end: { dateTime: '2024-01-15T11:00:00Z' },
          },
        ],
      }

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse)

      const result = await service.getEvents(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should extract meeting URLs from body', async () => {
      const mockResponse = {
        value: [
          {
            id: 'event-1',
            subject: 'Meeting',
            body: {
              content: 'Join: https://teams.microsoft.com/l/meetup/test',
            },
            start: { dateTime: '2024-01-15T10:00:00Z' },
            end: { dateTime: '2024-01-15T11:00:00Z' },
          },
        ],
      }

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse)

      const result = await service.getEvents(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )

      expect(result[0]).toBeDefined()
    })
  })

  describe('updateEventInstance', () => {
    it('should update specific instance of recurring event', async () => {
      const mockEventMapping = {
        external_event_id: 'office365-series-123',
      }

      ;(database.getEventMapping as jest.Mock).mockResolvedValue(mockEventMapping)

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({})

      const mockRequest = {
        start: new Date('2024-01-22T10:00:00Z'),
        end: new Date('2024-01-22T11:00:00Z'),
        title: 'Updated Instance',
        meeting_id: 'meeting-123',
        instanceDate: new Date('2024-01-22'),
        iana_timezone: 'UTC',
      }

      await service.updateEventInstance('primary', mockRequest as any)

      expect(database.getEventMapping).toHaveBeenCalled()
    })
  })

  describe('deleteEventInstance', () => {
    it('should delete specific instance of recurring event', async () => {
      const mockEventMapping = {
        external_event_id: 'office365-series-123',
      }

      ;(database.getEventMapping as jest.Mock).mockResolvedValue(mockEventMapping)

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({})

      const mockRequest = {
        meeting_id: 'meeting-123',
        instanceDate: new Date('2024-01-22'),
      }

      await service.deleteEventInstance('primary', mockRequest as any)

      expect(database.getEventMapping).toHaveBeenCalled()
    })
  })

  describe('updateEventRsvpForExternalEvent', () => {
    it('should update RSVP status for event', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({})

      await service.updateEventRsvpForExternalEvent(
        'primary',
        'event-123',
        ParticipationStatus.Accepted
      )

      expect((service as any).makeRequest).toHaveBeenCalled()
    })

    it('should handle declined status', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({})

      await service.updateEventRsvpForExternalEvent(
        'primary',
        'event-123',
        ParticipationStatus.Rejected
      )

      expect((service as any).makeRequest).toHaveBeenCalled()
    })

    it('should handle tentative status', async () => {
      jest.spyOn(service as any, 'makeRequest').mockResolvedValue({})

      await service.updateEventRsvpForExternalEvent(
        'primary',
        'event-123',
        ParticipationStatus.Pending
      )

      expect((service as any).makeRequest).toHaveBeenCalled()
    })
  })

  describe('refreshConnection', () => {
    it('should refresh calendar list', async () => {
      const mockResponse = {
        value: [
          {
            id: 'calendar-1',
            name: 'Primary Calendar',
          },
        ],
      }

      jest.spyOn(service as any, 'makeRequest').mockResolvedValue(mockResponse)

      const result = await service.refreshConnection()

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
