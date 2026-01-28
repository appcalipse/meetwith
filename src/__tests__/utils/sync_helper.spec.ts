import * as Sentry from '@sentry/nextjs'
import { Account } from '@/types/Account'
import { TimeSlotSource } from '@/types/Meeting'
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
})
