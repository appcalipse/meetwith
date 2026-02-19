import * as Sentry from '@sentry/nextjs'
import { Account } from '@/types/Account'
import { TimeSlotSource } from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import {
  DeleteInstanceRequest,
  MeetingCreationSyncRequest,
  MeetingInstanceCreationSyncRequest,
} from '@/types/Requests'
import {
  getCalendars,
  getCalendarPrimaryEmail,
  ExternalCalendarSync,
} from '@/utils/sync_helper'
import * as database from '@/utils/database'
import * as connectedCalendarsFactory from '@/utils/services/connected_calendars.factory'

jest.mock('@sentry/nextjs')
jest.mock('@/utils/database')
jest.mock('@/utils/services/connected_calendars.factory')

describe('sync_helper', () => {
  const mockAccount = '0x1234567890abcdef1234567890abcdef12345678'
  const mockCalendars = [
    {
      id: 'cal-1',
      account_address: mockAccount,
      email: 'test@gmail.com',
      provider: TimeSlotSource.GOOGLE,
      calendars: [
        {
          calendarId: 'primary',
          enabled: true,
          sync: true,
          isReadOnly: false,
        },
      ],
      payload: {},
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
      mockCalendars
    )
  })

  describe('getCalendars', () => {
    it('should get connected calendars for account', async () => {
      const calendars = await getCalendars(mockAccount)

      expect(database.getConnectedCalendars).toHaveBeenCalledWith(
        mockAccount,
        { syncOnly: true }
      )
      expect(calendars).toEqual(mockCalendars)
    })

    it('should filter calendars by meeting type', async () => {
      const meetingTypeId = 'meeting-type-123'
      const mockMeetingType = {
        id: meetingTypeId,
        account_owner_address: mockAccount,
        calendars: [{ id: 'cal-1' }],
      }
      ;(database.getMeetingTypeFromDB as jest.Mock).mockResolvedValue(
        mockMeetingType
      )

      const calendars = await getCalendars(mockAccount, meetingTypeId)

      expect(database.getMeetingTypeFromDB).toHaveBeenCalledWith(meetingTypeId)
      expect(calendars).toHaveLength(1)
    })

    it('should not filter if meeting type has no calendars', async () => {
      const meetingTypeId = 'meeting-type-123'
      const mockMeetingType = {
        id: meetingTypeId,
        account_owner_address: mockAccount,
        calendars: null,
      }
      ;(database.getMeetingTypeFromDB as jest.Mock).mockResolvedValue(
        mockMeetingType
      )

      const calendars = await getCalendars(mockAccount, meetingTypeId)

      expect(calendars).toEqual(mockCalendars)
    })

    it('should not filter if meeting type owner does not match', async () => {
      const meetingTypeId = 'meeting-type-123'
      const mockMeetingType = {
        id: meetingTypeId,
        account_owner_address: '0xdifferent',
        calendars: [{ id: 'cal-1' }],
      }
      ;(database.getMeetingTypeFromDB as jest.Mock).mockResolvedValue(
        mockMeetingType
      )

      const calendars = await getCalendars(mockAccount, meetingTypeId)

      expect(calendars).toEqual(mockCalendars)
    })

    it('should handle NO_MEETING_TYPE', async () => {
      const calendars = await getCalendars(mockAccount, 'no_meeting_type')

      // NO_MEETING_TYPE is checked but not filtered
      expect(calendars).toBeDefined()
    })

    it('should return empty array if no calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      const calendars = await getCalendars(mockAccount)

      expect(calendars).toEqual([])
    })

    it('should filter out calendars not in meeting type', async () => {
      const meetingTypeId = 'meeting-type-123'
      const mockMeetingType = {
        id: meetingTypeId,
        account_owner_address: mockAccount,
        calendars: [{ id: 'cal-2' }],
      }
      ;(database.getMeetingTypeFromDB as jest.Mock).mockResolvedValue(
        mockMeetingType
      )

      const calendars = await getCalendars(mockAccount, meetingTypeId)

      expect(calendars).toEqual([])
    })
  })

  describe('getCalendarPrimaryEmail', () => {
    it('should return primary email from enabled sync calendar', async () => {
      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBe('test@gmail.com')
    })

    it('should skip read-only calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'primary',
              enabled: true,
              sync: true,
              isReadOnly: true,
            },
          ],
        },
      ])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBeUndefined()
    })

    it('should skip disabled calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'primary',
              enabled: false,
              sync: true,
              isReadOnly: false,
            },
          ],
        },
      ])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBeUndefined()
    })

    it('should skip non-sync calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'primary',
              enabled: true,
              sync: false,
              isReadOnly: false,
            },
          ],
        },
      ])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBeUndefined()
    })

    it('should return first valid email from multiple calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          id: 'cal-1',
          account_address: mockAccount,
          email: 'first@gmail.com',
          provider: TimeSlotSource.GOOGLE,
          calendars: [
            {
              calendarId: 'primary',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
          ],
          payload: {},
        },
        {
          id: 'cal-2',
          account_address: mockAccount,
          email: 'second@gmail.com',
          provider: TimeSlotSource.GOOGLE,
          calendars: [
            {
              calendarId: 'primary',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
          ],
          payload: {},
        },
      ])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBe('first@gmail.com')
    })

    it('should handle errors gracefully', async () => {
      const error = new Error('Database error')
      ;(database.getConnectedCalendars as jest.Mock).mockRejectedValue(error)

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(email).toBeUndefined()
    })

    it('should return undefined if no calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBeUndefined()
    })

    it('should handle calendars with no inner calendars', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          calendars: [],
        },
      ])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBeUndefined()
    })

    it('should work with meeting_type_id parameter', async () => {
      const meetingTypeId = 'meeting-type-123'
      const mockMeetingType = {
        id: meetingTypeId,
        account_owner_address: mockAccount,
        calendars: [{ id: 'cal-1' }],
      }
      ;(database.getMeetingTypeFromDB as jest.Mock).mockResolvedValue(
        mockMeetingType
      )

      const email = await getCalendarPrimaryEmail(mockAccount, meetingTypeId)

      expect(email).toBe('test@gmail.com')
    })
  })

  describe('ExternalCalendarSync', () => {
    it('should be defined', () => {
      expect(ExternalCalendarSync).toBeDefined()
    })

    it('should have create method', () => {
      expect(ExternalCalendarSync.create).toBeDefined()
      expect(typeof ExternalCalendarSync.create).toBe('function')
    })

    it('should have update method', () => {
      expect(ExternalCalendarSync.update).toBeDefined()
      expect(typeof ExternalCalendarSync.update).toBe('function')
    })

    it('should have delete method', () => {
      expect(ExternalCalendarSync.delete).toBeDefined()
      expect(typeof ExternalCalendarSync.delete).toBe('function')
    })

    it('should have deleteInstance method', () => {
      expect(ExternalCalendarSync.deleteInstance).toBeDefined()
      expect(typeof ExternalCalendarSync.deleteInstance).toBe('function')
    })

    it('should have updateInstance method', () => {
      expect(ExternalCalendarSync.updateInstance).toBeDefined()
      expect(typeof ExternalCalendarSync.updateInstance).toBe('function')
    })
  })

  describe('calendar provider handling', () => {
    it('should handle Google calendar provider', async () => {
      const calendars = await getCalendars(mockAccount)
      const googleCal = calendars.find(
        cal => cal.provider === TimeSlotSource.GOOGLE
      )

      expect(googleCal).toBeDefined()
      expect(googleCal?.email).toBe('test@gmail.com')
    })

    it('should handle Office calendar provider', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          email: 'test@outlook.com',
          provider: TimeSlotSource.OFFICE,
        },
      ])

      const calendars = await getCalendars(mockAccount)
      const officeCal = calendars.find(
        cal => cal.provider === TimeSlotSource.OFFICE
      )

      expect(officeCal).toBeDefined()
      expect(officeCal?.email).toBe('test@outlook.com')
    })

    it('should handle iCloud calendar provider', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          email: 'test@icloud.com',
          provider: TimeSlotSource.ICLOUD,
        },
      ])

      const calendars = await getCalendars(mockAccount)
      const iCloudCal = calendars.find(
        cal => cal.provider === TimeSlotSource.ICLOUD
      )

      expect(iCloudCal).toBeDefined()
    })

    it('should handle WebDAV calendar provider', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          email: 'test@webdav.com',
          provider: TimeSlotSource.WEBDAV,
        },
      ])

      const calendars = await getCalendars(mockAccount)
      const webdavCal = calendars.find(
        cal => cal.provider === TimeSlotSource.WEBDAV
      )

      expect(webdavCal).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('should handle null calendar payload', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          payload: null,
        },
      ])

      const calendars = await getCalendars(mockAccount)

      expect(calendars).toHaveLength(1)
    })

    it('should handle undefined calendars array', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([
        {
          ...mockCalendars[0],
          calendars: undefined,
        },
      ])

      const email = await getCalendarPrimaryEmail(mockAccount)

      expect(email).toBeUndefined()
    })

    it('should handle meeting type not found', async () => {
      const meetingTypeId = 'meeting-type-123'
      ;(database.getMeetingTypeFromDB as jest.Mock).mockResolvedValue(null)

      const calendars = await getCalendars(mockAccount, meetingTypeId)

      expect(calendars).toEqual(mockCalendars)
    })
  })

  describe('ExternalCalendarSync.create - comprehensive', () => {
    const createMockMeetingDetails = (): MeetingCreationSyncRequest => ({
      meeting_id: 'meeting-123',
      start: new Date('2024-01-15T10:00:00Z'),
      end: new Date('2024-01-15T11:00:00Z'),
      created_at: new Date('2024-01-10T10:00:00Z'),
      timezone: 'America/New_York',
      meeting_type_id: 'meeting-type-1',
      meeting_url: 'https://meet.example.com/123',
      title: 'Test Meeting',
      content: 'Meeting description',
      meetingProvider: 'zoom' as any,
      meetingReminders: [],
      meetingPermissions: [],
      rrule: [],
      participantActing: {
        account_address: mockAccount,
        name: 'Test User',
        timeZone: 'America/New_York',
      },
      participants: [
        {
          account_address: mockAccount,
          meeting_id: 'meeting-123',
          type: ParticipantType.Scheduler,
          privateInfo: {} as any,
          privateInfoHash: 'hash123',
          timeZone: 'America/New_York',
          name: 'Scheduler',
          status: ParticipationStatus.Accepted,
        },
      ],
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should create event with Google calendar', async () => {
      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).toHaveBeenCalledWith(
        mockAccount,
        expect.any(Object),
        expect.any(Date),
        'primary',
        true
      )
    })

    it('should create event with Office365 calendar', async () => {
      const officeCalendars = [
        {
          ...mockCalendars[0],
          provider: TimeSlotSource.OFFICE,
        },
      ]
      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ emailAddress: { address: 'test@outlook.com' } }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        officeCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).toHaveBeenCalled()
    })

    it('should create event with iCloud calendar', async () => {
      const icloudCalendars = [
        {
          ...mockCalendars[0],
          provider: TimeSlotSource.ICLOUD,
        },
      ]
      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@icloud.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        icloudCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).toHaveBeenCalled()
    })

    it('should create event with WebDAV calendar', async () => {
      const webdavCalendars = [
        {
          ...mockCalendars[0],
          provider: TimeSlotSource.WEBDAV,
        },
      ]
      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@webdav.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        webdavCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).toHaveBeenCalled()
    })

    it('should only add participants once for multiple calendars', async () => {
      const multiCalendars = [
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'cal1',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
            {
              calendarId: 'cal2',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
          ],
        },
      ]
      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        multiCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).toHaveBeenCalledTimes(2)
      expect(mockIntegration.createEvent).toHaveBeenNthCalledWith(
        1,
        mockAccount,
        expect.any(Object),
        expect.any(Date),
        'cal1',
        true
      )
      expect(mockIntegration.createEvent).toHaveBeenNthCalledWith(
        2,
        mockAccount,
        expect.any(Object),
        expect.any(Date),
        'cal2',
        false
      )
    })

    it('should create events for other participants', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
          email: 'participant@gmail.com',
        },
      ]

      const schedulerMockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [],
        }),
      }

      const participantMockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'participant@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      )
        .mockReturnValueOnce(schedulerMockIntegration)
        .mockReturnValueOnce(participantMockIntegration)

      await ExternalCalendarSync.create(meetingDetails)

      expect(schedulerMockIntegration.createEvent).toHaveBeenCalledTimes(1)
      expect(participantMockIntegration.createEvent).toHaveBeenCalledTimes(1)
    })

    it('should skip participants with duplicate emails', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
          email: 'test@gmail.com',
        },
      ]

      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(meetingDetails)

      expect(mockIntegration.createEvent).toHaveBeenCalledTimes(1)
    })

    it('should throw error when organizer not found', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants = [
        {
          account_address: mockAccount,
          meeting_id: 'meeting-123',
          type: ParticipantType.Owner,
          privateInfo: {} as any,
          privateInfoHash: 'hash123',
          timeZone: 'America/New_York',
          name: 'Owner',
          status: ParticipationStatus.Accepted,
        },
      ]
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      await expect(ExternalCalendarSync.create(meetingDetails)).rejects.toThrow(
        'Organizer Account not found for meeting calendar sync'
      )
    })

    it('should skip disabled calendars', async () => {
      const disabledCalendars = [
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'primary',
              enabled: false,
              sync: true,
              isReadOnly: false,
            },
          ],
        },
      ]
      const mockIntegration = {
        createEvent: jest.fn(),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        disabledCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).not.toHaveBeenCalled()
    })

    it('should skip non-sync calendars', async () => {
      const nonSyncCalendars = [
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'primary',
              enabled: true,
              sync: false,
              isReadOnly: false,
            },
          ],
        },
      ]
      const mockIntegration = {
        createEvent: jest.fn(),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        nonSyncCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(createMockMeetingDetails())

      expect(mockIntegration.createEvent).not.toHaveBeenCalled()
    })

    it('should fallback to owner when scheduler has no calendar', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants = [
        {
          account_address: mockAccount,
          meeting_id: 'meeting-123',
          type: ParticipantType.Scheduler,
          privateInfo: {} as any,
          privateInfoHash: 'hash123',
          timeZone: 'America/New_York',
          name: 'Scheduler',
          status: ParticipationStatus.Accepted,
        },
        {
          account_address: '0xOwner',
          meeting_id: 'meeting-123',
          type: ParticipantType.Owner,
          privateInfo: {} as any,
          privateInfoHash: 'hash456',
          timeZone: 'America/New_York',
          name: 'Owner',
          status: ParticipationStatus.Accepted,
        },
      ]

      const ownerCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xOwner',
          email: 'owner@gmail.com',
        },
      ]

      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'owner@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(ownerCalendars)
        .mockResolvedValueOnce([])
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.create(meetingDetails)

      expect(mockIntegration.createEvent).toHaveBeenCalled()
    })
  })

  describe('ExternalCalendarSync.update - comprehensive', () => {
    const createMockMeetingDetails = (): MeetingCreationSyncRequest => ({
      meeting_id: 'meeting-123',
      start: new Date('2024-01-15T10:00:00Z'),
      end: new Date('2024-01-15T11:00:00Z'),
      created_at: new Date('2024-01-10T10:00:00Z'),
      timezone: 'America/New_York',
      meeting_type_id: 'meeting-type-1',
      meeting_url: 'https://meet.example.com/123',
      title: 'Updated Meeting',
      content: 'Updated description',
      meetingProvider: 'zoom' as any,
      meetingReminders: [],
      meetingPermissions: [],
      rrule: [],
      participantActing: {
        account_address: mockAccount,
        name: 'Test User',
        timeZone: 'America/New_York',
      },
      participants: [
        {
          account_address: mockAccount,
          meeting_id: 'meeting-123',
          type: ParticipantType.Scheduler,
          privateInfo: {} as any,
          privateInfoHash: 'hash123',
          timeZone: 'America/New_York',
          name: 'Scheduler',
          status: ParticipationStatus.Accepted,
        },
      ],
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should update event with Google calendar', async () => {
      const mockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.update(createMockMeetingDetails())

      expect(mockIntegration.updateEvent).toHaveBeenCalledWith(
        mockAccount,
        expect.any(Object),
        'primary'
      )
    })

    it('should update event with Office365 calendar', async () => {
      const officeCalendars = [
        {
          ...mockCalendars[0],
          provider: TimeSlotSource.OFFICE,
        },
      ]
      const mockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [{ emailAddress: { address: 'test@outlook.com' } }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        officeCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.update(createMockMeetingDetails())

      expect(mockIntegration.updateEvent).toHaveBeenCalled()
    })

    it('should update event with WebDAV calendar', async () => {
      const webdavCalendars = [
        {
          ...mockCalendars[0],
          provider: TimeSlotSource.WEBDAV,
        },
      ]
      const mockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@webdav.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        webdavCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.update(createMockMeetingDetails())

      expect(mockIntegration.updateEvent).toHaveBeenCalled()
    })

    it('should update events for participants', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
          email: 'participant@gmail.com',
        },
      ]

      const schedulerMockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [],
        }),
      }

      const participantMockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'participant@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      )
        .mockReturnValueOnce(schedulerMockIntegration)
        .mockReturnValueOnce(participantMockIntegration)

      await ExternalCalendarSync.update(meetingDetails)

      expect(schedulerMockIntegration.updateEvent).toHaveBeenCalledTimes(1)
      expect(participantMockIntegration.updateEvent).toHaveBeenCalledTimes(1)
    })

    it('should handle participant update errors gracefully', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
          email: 'participant@gmail.com',
        },
      ]

      const schedulerMockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [],
        }),
      }

      const participantMockIntegration = {
        updateEvent: jest.fn().mockRejectedValue(new Error('Update failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      )
        .mockReturnValueOnce(schedulerMockIntegration)
        .mockReturnValueOnce(participantMockIntegration)

      await ExternalCalendarSync.update(meetingDetails)

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should recreate event when new scheduler is assigned', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.calendar_organizer_address = mockAccount
      meetingDetails.participants = [
        {
          account_address: mockAccount,
          meeting_id: 'meeting-123',
          type: ParticipantType.Scheduler,
          privateInfo: {} as any,
          privateInfoHash: 'hash123',
          timeZone: 'America/New_York',
          name: 'New Scheduler',
          status: ParticipationStatus.Accepted,
        },
      ]

      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
        deleteEvent: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.update(meetingDetails)

      expect(mockIntegration.deleteEvent).toHaveBeenCalled()
      expect(mockIntegration.createEvent).toHaveBeenCalled()
    })

    it('should handle delete errors when reassigning scheduler', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.calendar_organizer_address = mockAccount
      meetingDetails.participants = [
        {
          account_address: mockAccount,
          meeting_id: 'meeting-123',
          type: ParticipantType.Scheduler,
          privateInfo: {} as any,
          privateInfoHash: 'hash123',
          timeZone: 'America/New_York',
          name: 'New Scheduler',
          status: ParticipationStatus.Accepted,
        },
      ]

      const mockIntegration = {
        createEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
        deleteEvent: jest.fn().mockRejectedValue(new Error('Delete failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.update(meetingDetails)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(mockIntegration.createEvent).toHaveBeenCalled()
    })

    it('should skip participants with duplicate emails', async () => {
      const meetingDetails = createMockMeetingDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
          email: 'test@gmail.com',
        },
      ]

      const mockIntegration = {
        updateEvent: jest.fn().mockResolvedValue({
          attendees: [{ email: 'test@gmail.com' }],
        }),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.update(meetingDetails)

      expect(mockIntegration.updateEvent).toHaveBeenCalledTimes(1)
    })
  })

  describe('ExternalCalendarSync.delete - comprehensive', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should delete single event from all calendars', async () => {
      const mockIntegration = {
        deleteEvent: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(mockAccount, ['meeting-123'])

      expect(mockIntegration.deleteEvent).toHaveBeenCalledWith(
        'meeting-123',
        'primary'
      )
    })

    it('should delete multiple events from all calendars', async () => {
      const mockIntegration = {
        deleteEvent: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(mockAccount, [
        'meeting-123',
        'meeting-456',
      ])

      expect(mockIntegration.deleteEvent).toHaveBeenCalledTimes(2)
    })

    it('should handle delete errors gracefully', async () => {
      const mockIntegration = {
        deleteEvent: jest.fn().mockRejectedValue(new Error('Delete failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(mockAccount, ['meeting-123'])

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should skip disabled calendars', async () => {
      const disabledCalendars = [
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'primary',
              enabled: false,
              sync: true,
              isReadOnly: false,
            },
          ],
        },
      ]
      const mockIntegration = {
        deleteEvent: jest.fn(),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        disabledCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(mockAccount, ['meeting-123'])

      expect(mockIntegration.deleteEvent).not.toHaveBeenCalled()
    })

    it('should delete from multiple calendars', async () => {
      const multiCalendars = [
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'cal1',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
            {
              calendarId: 'cal2',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
          ],
        },
      ]
      const mockIntegration = {
        deleteEvent: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        multiCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(mockAccount, ['meeting-123'])

      expect(mockIntegration.deleteEvent).toHaveBeenCalledTimes(2)
    })
  })

  describe('ExternalCalendarSync.deleteInstance - comprehensive', () => {
    const mockDeleteRequest: DeleteInstanceRequest = {
      meeting_id: 'meeting-123',
      start: '2024-01-15T10:00:00Z',
      ical_uid: 'uid-123',
    }

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should delete event instance from all calendars', async () => {
      const mockIntegration = {
        deleteEventInstance: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.deleteInstance(mockAccount, mockDeleteRequest)

      expect(mockIntegration.deleteEventInstance).toHaveBeenCalledWith(
        'primary',
        mockDeleteRequest
      )
    })

    it('should handle delete instance errors gracefully', async () => {
      const mockIntegration = {
        deleteEventInstance: jest
          .fn()
          .mockRejectedValue(new Error('Delete failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.deleteInstance(mockAccount, mockDeleteRequest)

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should delete from multiple calendars', async () => {
      const multiCalendars = [
        {
          ...mockCalendars[0],
          calendars: [
            {
              calendarId: 'cal1',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
            {
              calendarId: 'cal2',
              enabled: true,
              sync: true,
              isReadOnly: false,
            },
          ],
        },
      ]
      const mockIntegration = {
        deleteEventInstance: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        multiCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.deleteInstance(mockAccount, mockDeleteRequest)

      expect(mockIntegration.deleteEventInstance).toHaveBeenCalledTimes(2)
    })
  })

  describe('ExternalCalendarSync.updateInstance - comprehensive', () => {
    const createMockInstanceDetails =
      (): MeetingInstanceCreationSyncRequest => ({
        meeting_id: 'meeting-123',
        start: new Date('2024-01-15T10:00:00Z'),
        end: new Date('2024-01-15T11:00:00Z'),
        created_at: new Date('2024-01-10T10:00:00Z'),
        timezone: 'America/New_York',
        meeting_type_id: 'meeting-type-1',
        meeting_url: 'https://meet.example.com/123',
        title: 'Updated Instance',
        content: 'Updated instance description',
        meetingProvider: 'zoom' as any,
        meetingReminders: [],
        meetingPermissions: [],
        rrule: [],
        original_start_time: new Date('2024-01-15T10:00:00Z'),
        participantActing: {
          account_address: mockAccount,
          name: 'Test User',
          timeZone: 'America/New_York',
        },
        participants: [
          {
            account_address: mockAccount,
            meeting_id: 'meeting-123',
            type: ParticipantType.Scheduler,
            privateInfo: {} as any,
            privateInfoHash: 'hash123',
            timeZone: 'America/New_York',
            name: 'Scheduler',
            status: ParticipationStatus.Accepted,
          },
        ],
      })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should update event instance for scheduler calendar', async () => {
      const mockIntegration = {
        updateEventInstance: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.updateInstance(createMockInstanceDetails())

      expect(mockIntegration.updateEventInstance).toHaveBeenCalledWith(
        mockAccount,
        expect.any(Object),
        'primary'
      )
    })

    it('should throw error when original_start_time is missing', async () => {
      const invalidDetails = createMockInstanceDetails()
      delete (invalidDetails as any).original_start_time

      await expect(
        ExternalCalendarSync.updateInstance(invalidDetails)
      ).rejects.toThrow(
        'original_start_time is required for recurring instance updates'
      )
    })

    it('should update instance for participants', async () => {
      const meetingDetails = createMockInstanceDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
        },
      ]

      const mockIntegration = {
        updateEventInstance: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.updateInstance(meetingDetails)

      expect(mockIntegration.updateEventInstance).toHaveBeenCalledTimes(2)
    })

    it('should handle update instance errors gracefully', async () => {
      const mockIntegration = {
        updateEventInstance: jest
          .fn()
          .mockRejectedValue(new Error('Update failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.updateInstance(createMockInstanceDetails())

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle participant instance update errors gracefully', async () => {
      const meetingDetails = createMockInstanceDetails()
      meetingDetails.participants.push({
        account_address: '0xParticipant',
        meeting_id: 'meeting-123',
        type: ParticipantType.Owner,
        privateInfo: {} as any,
        privateInfoHash: 'hash456',
        timeZone: 'America/New_York',
        name: 'Participant',
        status: ParticipationStatus.Accepted,
      })

      const participantCalendars = [
        {
          ...mockCalendars[0],
          account_address: '0xParticipant',
        },
      ]

      const mockIntegration = {
        updateEventInstance: jest
          .fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('Update failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(mockCalendars)
        .mockResolvedValueOnce(participantCalendars)
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.updateInstance(meetingDetails)

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    const createMockDeleteRequest = () => ({
      organizer_address: mockAccount,
      meeting_id: 'meeting-123',
      meeting_type_id: 'type-123',
      externalEventId: 'ext-event-123',
    })

    it('should delete event from connected calendars', async () => {
      const mockIntegration = {
        deleteEvent: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(createMockDeleteRequest())

      expect(mockIntegration.deleteEvent).toHaveBeenCalled()
    })

    it('should handle delete errors gracefully', async () => {
      const mockIntegration = {
        deleteEvent: jest.fn().mockRejectedValue(new Error('Delete failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.delete(createMockDeleteRequest())

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle missing calendars gracefully', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      // Should not throw
      await ExternalCalendarSync.delete(createMockDeleteRequest())
    })
  })

  describe('deleteInstance', () => {
    const createMockDeleteInstanceRequest = (): DeleteInstanceRequest => ({
      organizer_address: mockAccount,
      meeting_id: 'meeting-123',
      meeting_type_id: 'type-123',
      externalEventId: 'ext-event-123',
      instanceDate: new Date('2024-01-15T10:00:00Z'),
    })

    it('should delete instance from connected calendars', async () => {
      const mockIntegration = {
        deleteEventInstance: jest.fn().mockResolvedValue({}),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.deleteInstance(
        createMockDeleteInstanceRequest()
      )

      expect(mockIntegration.deleteEventInstance).toHaveBeenCalled()
    })

    it('should handle delete instance errors gracefully', async () => {
      const mockIntegration = {
        deleteEventInstance: jest
          .fn()
          .mockRejectedValue(new Error('Delete failed')),
      }
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue(
        mockCalendars
      )
      ;(
        connectedCalendarsFactory.getConnectedCalendarIntegration as jest.Mock
      ).mockReturnValue(mockIntegration)

      await ExternalCalendarSync.deleteInstance(
        createMockDeleteInstanceRequest()
      )

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should handle missing calendars gracefully', async () => {
      ;(database.getConnectedCalendars as jest.Mock).mockResolvedValue([])

      // Should not throw
      await ExternalCalendarSync.deleteInstance(
        createMockDeleteInstanceRequest()
      )
    })
  })
})
