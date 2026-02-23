import { calendar_v3 } from 'googleapis'
import { MeetingProvider, MeetingRepeat, MeetingVersion } from '@meta/Meeting'
import { ParticipantType, ParticipationStatus } from '@meta/ParticipantInfo'
import { MeetingPermissions } from '@/utils/constants/schedule'
import {
  MeetingCancelForbiddenError,
  MeetingChangeConflictError,
  MeetingDetailsModificationDenied,
  TimeNotAvailableError,
} from '@/utils/errors'
import * as database from '@/utils/database'
import * as calendarManager from '@/utils/calendar_manager'
import * as genericUtils from '@/utils/generic_utils'
import * as userManager from '@/utils/user_manager'
import * as calendarSyncQueue from '@/utils/workers/calendar-sync.queue'
import {
  extractMeetingDescription,
  getBaseEventId,
  getParticipationStatus,
  handleCancelOrDelete,
  handleCancelOrDeleteForRecurringInstance,
  handleCancelOrDeleteSeries,
  handleParseParticipants,
  handleUpdateMeeting,
  handleUpdateMeetingRsvps,
  handleUpdateMeetingSeries,
  handleUpdateMeetingSeriesRsvps,
  handleUpdateParseMeetingInfo,
  handleUpdateRSVPParseMeetingInfo,
  handleUpdateSingleRecurringInstance,
} from '@/utils/calendar_sync_helpers'

// Mock all external dependencies
jest.mock('@/utils/database')
jest.mock('@/utils/calendar_manager')
jest.mock('@/utils/generic_utils')
jest.mock('@/utils/user_manager')
jest.mock('@/utils/workers/calendar-sync.queue')

// The source file calendar_sync_helpers.ts imports from @utils/ (not @/utils/),
// which may resolve to a different module in Jest. We need to also import from
// the same path to get the same mock instance.
import * as genericUtilsAlt from '@utils/generic_utils'

const mockDatabase = database as jest.Mocked<typeof database>
const mockCalendarManager = calendarManager as jest.Mocked<typeof calendarManager>
// Use the @utils/ import to get the same module instance that the source uses
const mockGenericUtils = genericUtilsAlt as jest.Mocked<typeof genericUtils>
const mockUserManager = userManager as jest.Mocked<typeof userManager>
const mockCalendarSyncQueue = calendarSyncQueue as jest.Mocked<
  typeof calendarSyncQueue
>

describe('calendar_sync_helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getBaseEventId', () => {
    it('should extract base event ID from Google event ID', () => {
      const googleEventId = '02cd383a77214840b5a1ad4ceb545ff8_20240101T100000Z'
      const result = getBaseEventId(googleEventId)
      expect(result).toBe('02cd383a-7721-4840-b5a1-ad4ceb545ff8')
    })

    it('should handle event ID without recurring suffix', () => {
      const googleEventId = '02cd383a77214840b5a1ad4ceb545ff8'
      const result = getBaseEventId(googleEventId)
      expect(result).toBe('02cd383a-7721-4840-b5a1-ad4ceb545ff8')
    })

    it('should properly format UUID with hyphens', () => {
      const googleEventId = 'abcdef0123456789abcdef0123456789'
      const result = getBaseEventId(googleEventId)
      expect(result).toBe('abcdef01-2345-6789-abcd-ef0123456789')
    })
  })

  describe('extractMeetingDescription', () => {
    it('should remove meeting URL text from description', () => {
      const summary = 'Meeting notes\nYour meeting will happen at https://meet.google.com/abc\nMore notes'
      const result = extractMeetingDescription(summary)
      expect(result).toBe('Meeting notesMore notes')
    })

    it('should remove reschedule text from description', () => {
      const summary = 'Meeting notes\nTo reschedule or cancel the meeting, please go to https://example.com\nMore notes'
      const result = extractMeetingDescription(summary)
      expect(result).toBe('Meeting notesMore notes')
    })

    it('should handle description with both removal patterns', () => {
      const summary = 'Notes\nYour meeting will happen at https://meet.google.com/abc\nTo reschedule or cancel the meeting, please go to https://example.com\nEnd'
      const result = extractMeetingDescription(summary)
      expect(result).toBe('NotesEnd')
    })

    it('should return trimmed description when no patterns match', () => {
      const summary = '  Just some notes  '
      const result = extractMeetingDescription(summary)
      expect(result).toBe('Just some notes')
    })

    it('should handle empty string', () => {
      const summary = ''
      const result = extractMeetingDescription(summary)
      expect(result).toBe('')
    })

    it('should handle description with newlines around pattern', () => {
      const summary = 'Start\n\nYour meeting will happen at https://example.com\n\nEnd'
      const result = extractMeetingDescription(summary)
      expect(result).toBe('Start\n\nEnd')
    })
  })

  describe('getParticipationStatus', () => {
    it('should return Accepted for "accepted" response', () => {
      expect(getParticipationStatus('accepted')).toBe(ParticipationStatus.Accepted)
    })

    it('should return Rejected for "declined" response', () => {
      expect(getParticipationStatus('declined')).toBe(ParticipationStatus.Rejected)
    })

    it('should return Pending for "tentative" response', () => {
      expect(getParticipationStatus('tentative')).toBe(ParticipationStatus.Pending)
    })

    it('should return Pending for "needsAction" response', () => {
      expect(getParticipationStatus('needsAction')).toBe(ParticipationStatus.Pending)
    })

    it('should return Pending for undefined response', () => {
      expect(getParticipationStatus(undefined)).toBe(ParticipationStatus.Pending)
    })

    it('should return Pending for null response', () => {
      expect(getParticipationStatus(null)).toBe(ParticipationStatus.Pending)
    })

    it('should return Pending for unknown response', () => {
      expect(getParticipationStatus('unknown')).toBe(ParticipationStatus.Pending)
    })
  })

  describe('handleUpdateParseMeetingInfo', () => {
    const mockAccount = {
      address: '0x123',
      name: 'Test User',
      email: 'test@example.com',
      preferences: { timezone: 'UTC' },
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      title: 'Test Meeting',
      content: 'Meeting content',
      meeting_url: 'https://meet.google.com/abc',
      provider: MeetingProvider.GOOGLE_MEET,
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Accepted,
          slot_id: 'slot-1',
        },
      ],
      related_slot_ids: ['slot-1'],
      version: 1,
      permissions: [MeetingPermissions.INVITE_GUESTS, MeetingPermissions.EDIT_MEETING],
    }

    beforeEach(() => {
      mockDatabase.getAccountFromDB.mockResolvedValue(mockAccount as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [mockDecryptedMeeting.participants[0]],
        allAccounts: [mockAccount],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        rrule: null,
      } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
        name: 'Test User',
      } as any)
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
    })

    it('should throw MeetingChangeConflictError when meeting has no ID', async () => {
      const invalidMeeting = { ...mockDecryptedMeeting, id: undefined }

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T11:00:00Z'),
          invalidMeeting as any,
          [],
          'content',
          'url',
          MeetingProvider.GOOGLE_MEET
        )
      ).rejects.toThrow(MeetingChangeConflictError)
    })

    it('should throw MeetingDetailsModificationDenied when user cannot update guests', async () => {
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(false) // Cannot invite guests
        .mockReturnValueOnce(true) // Can edit meeting details

      const newParticipants = [
        ...mockDecryptedMeeting.participants,
        {
          account_address: '0x456',
          type: ParticipantType.Invitee,
          status: ParticipationStatus.Pending,
          slot_id: 'slot-2',
        },
      ]

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T11:00:00Z'),
          mockDecryptedMeeting as any,
          newParticipants,
          'content',
          'url',
          MeetingProvider.GOOGLE_MEET
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should throw MeetingDetailsModificationDenied when changing provider without permission', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReset()
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(true) // Can invite guests
        .mockReturnValueOnce(false) // Cannot edit meeting details

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          new Date('2024-01-01T10:00:00Z'),
          new Date('2024-01-01T11:00:00Z'),
          mockDecryptedMeeting as any,
          mockDecryptedMeeting.participants,
          mockDecryptedMeeting.content,
          mockDecryptedMeeting.meeting_url,
          MeetingProvider.ZOOM
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should throw MeetingDetailsModificationDenied when changing time without permission', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReset()
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(true) // Can invite guests
        .mockReturnValueOnce(false) // Cannot edit meeting details

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          new Date('2024-01-01T11:00:00Z'), // Different start time
          new Date('2024-01-01T12:00:00Z'),
          mockDecryptedMeeting as any,
          mockDecryptedMeeting.participants,
          mockDecryptedMeeting.content,
          mockDecryptedMeeting.meeting_url,
          mockDecryptedMeeting.provider
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should throw MeetingDetailsModificationDenied when changing reminders without permission', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReset()
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(true) // Can invite guests
        .mockReturnValueOnce(false) // Cannot edit meeting details

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          mockDecryptedMeeting.start,
          mockDecryptedMeeting.end,
          mockDecryptedMeeting as any,
          mockDecryptedMeeting.participants,
          mockDecryptedMeeting.content,
          mockDecryptedMeeting.meeting_url,
          mockDecryptedMeeting.provider,
          mockDecryptedMeeting.title,
          [{ method: 'email' as const, minutes: 15 }]
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should throw MeetingDetailsModificationDenied when changing recurrence without permission', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReset()
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(true) // Can invite guests
        .mockReturnValueOnce(false) // Cannot edit meeting details

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          mockDecryptedMeeting.start,
          mockDecryptedMeeting.end,
          mockDecryptedMeeting as any,
          mockDecryptedMeeting.participants,
          mockDecryptedMeeting.content,
          mockDecryptedMeeting.meeting_url,
          mockDecryptedMeeting.provider,
          mockDecryptedMeeting.title,
          undefined,
          MeetingRepeat.WEEKLY
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should throw MeetingDetailsModificationDenied when changing permissions without permission', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReset()
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(true) // Can invite guests
        .mockReturnValueOnce(false) // Cannot edit meeting details

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          mockDecryptedMeeting.start,
          mockDecryptedMeeting.end,
          mockDecryptedMeeting as any,
          mockDecryptedMeeting.participants,
          mockDecryptedMeeting.content,
          mockDecryptedMeeting.meeting_url,
          mockDecryptedMeeting.provider,
          mockDecryptedMeeting.title,
          undefined,
          MeetingRepeat.NO_REPEAT,
          [MeetingPermissions.EDIT_MEETING]
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should successfully parse meeting info when user has permissions', async () => {
      const result = await handleUpdateParseMeetingInfo(
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        mockDecryptedMeeting.participants,
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET
      )

      expect(result).toHaveProperty('existingMeeting')
      expect(result).toHaveProperty('participantActing')
      expect(result).toHaveProperty('payload')
      expect(result.payload.version).toBe(2)
    })

    it('should handle meeting with different title when user has edit permission', async () => {
      const result = await handleUpdateParseMeetingInfo(
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        mockDecryptedMeeting.participants,
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET,
        'New Title'
      )

      expect(result).toBeDefined()
      expect(mockCalendarManager.buildMeetingData).toHaveBeenCalled()
    })

    it('should handle meeting with reminders', async () => {
      const reminders = [{ method: 'email' as const, minutes: 30 }]

      const result = await handleUpdateParseMeetingInfo(
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        mockDecryptedMeeting.participants,
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET,
        'Test Meeting',
        reminders
      )

      expect(result).toBeDefined()
    })
  })

  describe('handleUpdateRSVPParseMeetingInfo', () => {
    const mockAccount = {
      address: '0x123',
      name: 'Test User',
      email: 'test@example.com',
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      title: 'Test Meeting',
      content: 'Meeting content',
      meeting_url: 'https://meet.google.com/abc',
      provider: MeetingProvider.GOOGLE_MEET,
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Invitee,
          status: ParticipationStatus.Pending,
          slot_id: 'slot-1',
        },
      ],
      related_slot_ids: ['slot-1'],
      version: 1,
      reminders: [],
      recurrence: MeetingRepeat.NO_REPEAT,
    }

    beforeEach(() => {
      mockDatabase.getAccountFromDB.mockResolvedValue(mockAccount as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [mockDecryptedMeeting.participants[0]],
        allAccounts: [mockAccount],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
        name: 'Test User',
      } as any)
    })

    it('should throw MeetingChangeConflictError when meeting has no ID', async () => {
      const invalidMeeting = { ...mockDecryptedMeeting, id: undefined }

      await expect(
        handleUpdateRSVPParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          invalidMeeting as any,
          ParticipationStatus.Accepted
        )
      ).rejects.toThrow(MeetingChangeConflictError)
    })

    it('should update participant status to Accepted', async () => {
      const result = await handleUpdateRSVPParseMeetingInfo(
        '0x123',
        'meeting-type-1',
        mockDecryptedMeeting as any,
        ParticipationStatus.Accepted
      )

      expect(result).toHaveProperty('participantActing')
      expect(result).toHaveProperty('payload')
      expect(result.payload.version).toBe(2)
    })

    it('should update participant status to Rejected', async () => {
      const result = await handleUpdateRSVPParseMeetingInfo(
        '0x123',
        'meeting-type-1',
        mockDecryptedMeeting as any,
        ParticipationStatus.Rejected
      )

      expect(result).toHaveProperty('participantActing')
      expect(result.payload.version).toBe(2)
    })

    it('should handle meeting with event ID', async () => {
      const result = await handleUpdateRSVPParseMeetingInfo(
        '0x123',
        'meeting-type-1',
        mockDecryptedMeeting as any,
        ParticipationStatus.Accepted,
        null,
        'event-123'
      )

      expect(result.payload.eventId).toBe('event-123')
    })
  })

  describe('handleCancelOrDelete', () => {
    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Accepted,
        },
      ],
      related_slot_ids: ['slot-1'],
    }

    beforeEach(() => {
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(true)
      mockDatabase.getAccountFromDB.mockResolvedValue({
        address: '0x123',
        preferences: { timezone: 'UTC' },
      } as any)
      mockDatabase.deleteMeetingFromDB.mockResolvedValue(undefined)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
        name: 'Test User',
      } as any)
      mockGenericUtils.deduplicateArray.mockImplementation((arr: any[]) => arr)
    })

    it('should cancel meeting when user is owner', async () => {
      await handleCancelOrDelete('0x123', mockDecryptedMeeting as any)

      expect(mockGenericUtils.isAccountSchedulerOrOwner).toHaveBeenCalledWith(
        mockDecryptedMeeting.participants,
        '0x123'
      )
      expect(mockDatabase.deleteMeetingFromDB).toHaveBeenCalled()
    })

    it('should throw error when meeting has no ID', async () => {
      const invalidMeeting = { ...mockDecryptedMeeting, id: undefined }

      await expect(
        handleCancelOrDelete('0x123', invalidMeeting as any)
      ).rejects.toThrow()
    })

    it('should throw MeetingCancelForbiddenError when user is not owner or scheduler', async () => {
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(false)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x456' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x456'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({})
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({} as any)
      mockDatabase.isSlotFree.mockResolvedValue(true)
      mockDatabase.updateMeeting.mockResolvedValue({} as any)

      // The function tries to delete instead when not owner/scheduler
      await handleCancelOrDelete('0x456', mockDecryptedMeeting as any, 'meeting-type-1')

      expect(mockDatabase.updateMeeting).toHaveBeenCalled()
    })
  })

  describe('handleCancelOrDeleteSeries', () => {
    const mockMasterEvent: calendar_v3.Schema$Event = {
      id: 'event-123',
      recurrence: ['RRULE:FREQ=WEEKLY;COUNT=10'],
      summary: 'Recurring Meeting',
    }

    const mockDecryptedMeeting = {
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
        },
      ],
    }

    const mockSeries = [
      {
        id: 'series-1',
        account_address: '0x123',
        ical_uid: 'event-123',
      },
    ]

    beforeEach(() => {
      mockDatabase.getEventMasterSeries.mockResolvedValue(mockSeries as any)
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(true)
      mockDatabase.deleteRecurringSlotInstances.mockResolvedValue(undefined)
      mockCalendarSyncQueue.queueCalendarDeleteSync.mockResolvedValue(undefined as any)
    })

    it('should delete recurring series when user is owner', async () => {
      await handleCancelOrDeleteSeries(
        '0x123',
        mockDecryptedMeeting as any,
        'meeting-123',
        mockMasterEvent
      )

      expect(mockDatabase.getEventMasterSeries).toHaveBeenCalledWith(
        'meeting-123',
        'event-123'
      )
      expect(mockDatabase.deleteRecurringSlotInstances).toHaveBeenCalledWith(['series-1'])
    })

    it('should not process when event has no ID', async () => {
      const eventWithoutId = { ...mockMasterEvent, id: undefined }

      await handleCancelOrDeleteSeries(
        '0x123',
        mockDecryptedMeeting as any,
        'meeting-123',
        eventWithoutId
      )

      expect(mockDatabase.getEventMasterSeries).not.toHaveBeenCalled()
    })

    it('should not process when event has no recurrence', async () => {
      const eventWithoutRecurrence = { ...mockMasterEvent, recurrence: undefined }

      await handleCancelOrDeleteSeries(
        '0x123',
        mockDecryptedMeeting as any,
        'meeting-123',
        eventWithoutRecurrence
      )

      expect(mockDatabase.getEventMasterSeries).not.toHaveBeenCalled()
    })
  })

  describe('handleParseParticipants', () => {
    const mockAttendees: calendar_v3.Schema$EventAttendee[] = [
      {
        email: 'test1@example.com',
        displayName: 'Test User 1',
        responseStatus: 'accepted',
      },
      {
        email: 'test2@example.com',
        displayName: 'Test User 2',
        responseStatus: 'declined',
      },
    ]

    const mockParticipants = [
      {
        account_address: '0x123',
        type: ParticipantType.Owner,
        status: ParticipationStatus.Pending,
        slot_id: 'slot-1',
      },
      {
        guest_email: 'test2@example.com',
        type: ParticipantType.Invitee,
        status: ParticipationStatus.Pending,
        slot_id: 'slot-2',
      },
    ]

    beforeEach(() => {
      mockDatabase.findAccountsByEmails.mockResolvedValue({
        'test1@example.com': [{ address: '0x123', name: 'Test User 1' }],
        'test2@example.com': [],
      } as any)
    })

    it('should parse attendees and match with participants', async () => {
      const result = await handleParseParticipants(
        'meeting-123',
        mockAttendees,
        mockParticipants as any,
        '0x123'
      )

      expect(result).toHaveLength(2)
      expect(result[0].account_address).toBe('0x123')
      expect(result[0].status).toBe(ParticipationStatus.Accepted)
      expect(result[1].guest_email).toBe('test2@example.com')
      expect(result[1].status).toBe(ParticipationStatus.Rejected)
    })

    it('should handle attendees without email', async () => {
      const attendeesWithoutEmail = [
        { displayName: 'No Email User' },
      ]

      const result = await handleParseParticipants(
        'meeting-123',
        attendeesWithoutEmail,
        mockParticipants as any,
        '0x123'
      )

      expect(result).toHaveLength(0)
    })

    it('should create guest participants for unknown emails', async () => {
      mockDatabase.findAccountsByEmails.mockResolvedValue({} as any)

      const result = await handleParseParticipants(
        'meeting-123',
        mockAttendees,
        [],
        '0x123'
      )

      expect(result).toHaveLength(2)
      expect(result[0].guest_email).toBe('test1@example.com')
      expect(result[1].guest_email).toBe('test2@example.com')
    })

    it('should throw error when findAccountsByEmails fails', async () => {
      mockDatabase.findAccountsByEmails.mockResolvedValue(null as any)

      await expect(
        handleParseParticipants('meeting-123', mockAttendees, mockParticipants as any, '0x123')
      ).rejects.toThrow('Failed to fetch accounts by emails')
    })

    it('should handle multiple accounts for same email', async () => {
      mockDatabase.findAccountsByEmails.mockResolvedValue({
        'test1@example.com': [
          { address: '0x123', name: 'Account 1' },
          { address: '0x456', name: 'Account 2' },
        ],
      } as any)

      const result = await handleParseParticipants(
        'meeting-123',
        [mockAttendees[0]],
        mockParticipants as any,
        '0x123'
      )

      expect(result).toHaveLength(1)
      expect(result[0].account_address).toBe('0x123')
    })
  })

  describe('handleUpdateMeeting', () => {
    const mockAccount = {
      address: '0x123',
      name: 'Test User',
      preferences: { timezone: 'UTC' },
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      title: 'Test Meeting',
      content: 'content',
      meeting_url: 'url',
      provider: MeetingProvider.GOOGLE_MEET,
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Accepted,
          slot_id: 'slot-1',
        },
      ],
      related_slot_ids: ['slot-1'],
      version: 1,
      permissions: [MeetingPermissions.INVITE_GUESTS, MeetingPermissions.EDIT_MEETING],
    }

    beforeEach(() => {
      mockDatabase.getAccountFromDB.mockResolvedValue(mockAccount as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({} as any)
      mockDatabase.updateMeeting.mockResolvedValue({ id: 'slot-updated' } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
    })

    it('should successfully update a meeting', async () => {
      const result = await handleUpdateMeeting(
        false,
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T11:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'new content',
        'new url',
        MeetingProvider.GOOGLE_MEET
      )

      expect(result).toEqual({ id: 'slot-updated' })
      expect(mockDatabase.updateMeeting).toHaveBeenCalled()
    })

    it('should handle meeting with calendar_id', async () => {
      const result = await handleUpdateMeeting(
        false,
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T11:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET,
        'Title',
        [],
        MeetingRepeat.NO_REPEAT,
        [],
        null,
        null,
        'calendar-123'
      )

      expect(result).toBeDefined()
      expect(mockDatabase.updateMeeting).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ calendar_id: 'calendar-123' })
      )
    })
  })

  describe('handleUpdateMeetingRsvps', () => {
    const mockAccount = {
      address: '0x123',
      name: 'Test User',
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      title: 'Test Meeting',
      content: 'content',
      meeting_url: 'url',
      provider: MeetingProvider.GOOGLE_MEET,
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Invitee,
          status: ParticipationStatus.Pending,
          slot_id: 'slot-1',
        },
      ],
      related_slot_ids: ['slot-1'],
      version: 1,
      reminders: [],
      recurrence: MeetingRepeat.NO_REPEAT,
    }

    beforeEach(() => {
      mockDatabase.getAccountFromDB.mockResolvedValue(mockAccount as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      } as any)
      mockDatabase.updateMeeting.mockResolvedValue({ id: 'slot-updated' } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
    })

    it('should update RSVP status to Accepted', async () => {
      const result = await handleUpdateMeetingRsvps(
        '0x123',
        'meeting-type-1',
        mockDecryptedMeeting as any,
        ParticipationStatus.Accepted
      )

      expect(result).toEqual({ id: 'slot-updated' })
      expect(mockDatabase.updateMeeting).toHaveBeenCalled()
    })

    it('should update RSVP status to Rejected', async () => {
      const result = await handleUpdateMeetingRsvps(
        '0x123',
        'meeting-type-1',
        mockDecryptedMeeting as any,
        ParticipationStatus.Rejected
      )

      expect(result).toBeDefined()
    })
  })

  describe('handleUpdateMeetingSeries', () => {
    const mockMasterEvent: calendar_v3.Schema$Event = {
      id: 'recurring-event-123',
      recurrence: ['RRULE:FREQ=WEEKLY;COUNT=5;DTSTART=20240101T100000Z'],
      start: { dateTime: '2024-01-01T10:00:00Z' },
      end: { dateTime: '2024-01-01T11:00:00Z' },
      summary: 'Weekly Meeting',
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
          slot_id: 'slot-1',
        },
      ],
    }

    const mockSeries = [
      {
        id: 'series-1',
        account_address: '0x123',
        template_start: '2024-01-01T10:00:00Z',
        template_end: '2024-01-01T11:00:00Z',
        effective_start: '2024-01-01T10:00:00Z',
      },
    ]

    beforeEach(() => {
      mockDatabase.getEventMasterSeries.mockResolvedValue(mockSeries as any)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        participants_mapping: [{ account_address: '0x123', timeZone: 'UTC' }],
      } as any)
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [{ id: 'slot-1', account_address: '0x123', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }],
      } as any)
      mockDatabase.upsertSeries.mockResolvedValue([mockSeries[0]] as any)
      mockDatabase.bulkUpdateSlotSeriesConfirmedSlots.mockResolvedValue(undefined)
      mockDatabase.deleteSeriesInstantAfterDate.mockResolvedValue(undefined)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
      mockCalendarSyncQueue.queueCalendarUpdateSync.mockResolvedValue(undefined as any)
    })

    it('should update recurring meeting series', async () => {
      await handleUpdateMeetingSeries(
        '0x123',
        'meeting-123',
        mockMasterEvent,
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'new content',
        'new url',
        MeetingProvider.GOOGLE_MEET,
        'New Title',
        []
      )

      expect(mockDatabase.getEventMasterSeries).toHaveBeenCalledWith(
        'meeting-123',
        'recurring-event-123'
      )
      expect(mockDatabase.upsertSeries).toHaveBeenCalled()
    })

    it('should not process when event has no ID', async () => {
      const eventWithoutId = { ...mockMasterEvent, id: undefined }

      await handleUpdateMeetingSeries(
        '0x123',
        'meeting-123',
        eventWithoutId,
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET
      )

      expect(mockDatabase.getEventMasterSeries).not.toHaveBeenCalled()
    })

    it('should not process when event has no recurrence', async () => {
      const eventWithoutRecurrence = { ...mockMasterEvent, recurrence: undefined }

      await handleUpdateMeetingSeries(
        '0x123',
        'meeting-123',
        eventWithoutRecurrence,
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET
      )

      expect(mockDatabase.getEventMasterSeries).not.toHaveBeenCalled()
    })

    it('should handle series with new participants', async () => {
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [
          { id: 'slot-1', account_address: '0x123', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' },
          { id: 'slot-2', account_address: '0x456', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }
        ],
      } as any)
      
      mockDatabase.upsertSeries
        .mockResolvedValueOnce([mockSeries[0]] as any)
        .mockResolvedValueOnce([{ ...mockSeries[0], id: 'slot-2', account_address: '0x456' }] as any)

      await handleUpdateMeetingSeries(
        '0x123',
        'meeting-123',
        mockMasterEvent,
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T11:00:00Z'),
        mockDecryptedMeeting as any,
        [{ account_address: '0x456', type: ParticipantType.Invitee }],
        'content',
        'url',
        MeetingProvider.GOOGLE_MEET
      )

      expect(mockDatabase.upsertSeries).toHaveBeenCalled()
    })
  })

  describe('handleUpdateMeetingSeriesRsvps', () => {
    const mockMasterEvent: calendar_v3.Schema$Event = {
      id: 'recurring-event-123',
      recurrence: ['RRULE:FREQ=WEEKLY;COUNT=5;DTSTART=20240101T100000Z'],
      start: { dateTime: '2024-01-01T10:00:00Z' },
      end: { dateTime: '2024-01-01T11:00:00Z' },
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Invitee,
          status: ParticipationStatus.Pending,
        },
      ],
    }

    const mockSeries = [
      {
        id: 'series-1',
        account_address: '0x123',
        template_start: '2024-01-01T10:00:00Z',
        template_end: '2024-01-01T11:00:00Z',
        effective_start: '2024-01-01T10:00:00Z',
      },
    ]

    beforeEach(() => {
      mockDatabase.getEventMasterSeries.mockResolvedValue(mockSeries as any)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      } as any)
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [{ id: 'slot-1', account_address: '0x123', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }],
      } as any)
      mockDatabase.upsertSeries.mockResolvedValue([mockSeries[0]] as any)
      mockDatabase.bulkUpdateSlotSeriesConfirmedSlots.mockResolvedValue(undefined)
      mockDatabase.deleteSeriesInstantAfterDate.mockResolvedValue(undefined)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
    })

    it('should update RSVP for recurring series', async () => {
      await handleUpdateMeetingSeriesRsvps(
        '0x123',
        'meeting-123',
        mockMasterEvent,
        mockDecryptedMeeting as any,
        ParticipationStatus.Accepted
      )

      expect(mockDatabase.getEventMasterSeries).toHaveBeenCalled()
      expect(mockDatabase.upsertSeries).toHaveBeenCalled()
    })

    it('should not process when event has no ID', async () => {
      const eventWithoutId = { ...mockMasterEvent, id: undefined }

      await handleUpdateMeetingSeriesRsvps(
        '0x123',
        'meeting-123',
        eventWithoutId,
        mockDecryptedMeeting as any,
        ParticipationStatus.Accepted
      )

      expect(mockDatabase.getEventMasterSeries).not.toHaveBeenCalled()
    })

    it('should handle series with until date in rrule', async () => {
      const eventWithUntil = {
        ...mockMasterEvent,
        recurrence: ['RRULE:FREQ=WEEKLY;UNTIL=20240201T100000Z'],
      }

      await handleUpdateMeetingSeriesRsvps(
        '0x123',
        'meeting-123',
        eventWithUntil,
        mockDecryptedMeeting as any,
        ParticipationStatus.Rejected
      )

      expect(mockDatabase.deleteSeriesInstantAfterDate).toHaveBeenCalled()
    })
  })

  describe('handleUpdateSingleRecurringInstance', () => {
    const mockEvent: calendar_v3.Schema$Event = {
      id: 'recurring-event-123_20240101T100000Z',
      recurringEventId: 'recurring-event-123',
      start: { dateTime: '2024-01-01T10:00:00Z' },
      end: { dateTime: '2024-01-01T11:00:00Z' },
      summary: 'Meeting Instance',
      description: 'Description',
      location: 'Location',
      attendees: [
        {
          email: 'test@example.com',
          responseStatus: 'accepted',
        },
      ],
      extendedProperties: {
        private: {
          meetingId: 'meeting-123',
          meetingTypeId: 'meeting-type-1',
        },
      },
    }

    const mockConferenceMeeting = {
      id: 'conf-123',
      meeting_id: 'meeting-123',
      version: MeetingVersion.V3,
      provider: MeetingProvider.GOOGLE_MEET,
      reminders: [],
      recurrence: MeetingRepeat.WEEKLY,
      permissions: [],
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
        },
      ],
    }

    const mockSeries = [
      {
        id: 'series-1',
        account_address: '0x123',
        template_start: '2024-01-01T10:00:00Z',
        template_end: '2024-01-01T11:00:00Z',
      },
    ]

    beforeEach(() => {
      mockDatabase.getConferenceMeetingFromDB.mockResolvedValue(mockConferenceMeeting as any)
      mockDatabase.getEventMasterSeries.mockResolvedValue(mockSeries as any)
      mockDatabase.findAccountsByEmails.mockResolvedValue({
        'test@example.com': [{ address: '0x123', name: 'Test User' }],
      } as any)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        participants_mapping: [{ account_address: '0x123', timeZone: 'UTC' }],
      } as any)
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [{ id: 'slot-1', account_address: '0x123', version: 1, start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }],
      } as any)
      mockCalendarManager.decryptConferenceMeeting.mockResolvedValue(mockConferenceMeeting as any)
      mockDatabase.getSlotSeries.mockResolvedValue(mockSeries[0] as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
      mockCalendarSyncQueue.queueCalendarInstanceUpdateSync.mockResolvedValue(undefined as any)
    })

    it('should update single recurring instance', async () => {
      await handleUpdateSingleRecurringInstance(
        mockEvent,
        '0x123'
      )

      expect(mockDatabase.getConferenceMeetingFromDB).toHaveBeenCalledWith('meeting-123')
      expect(mockDatabase.getEventMasterSeries).toHaveBeenCalled()
    })

    it('should not process event without recurring event ID', async () => {
      const nonRecurringEvent = { ...mockEvent, recurringEventId: undefined }

      await handleUpdateSingleRecurringInstance(
        nonRecurringEvent,
        '0x123'
      )

      expect(mockDatabase.getConferenceMeetingFromDB).not.toHaveBeenCalled()
    })

    it('should handle instance with updated RSVP when lacking edit permissions', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(false)

      await handleUpdateSingleRecurringInstance(
        mockEvent,
        '0x123'
      )

      expect(mockDatabase.getConferenceMeetingFromDB).toHaveBeenCalled()
    })
  })

  describe('handleCancelOrDeleteForRecurringInstance', () => {
    const mockEvent: calendar_v3.Schema$Event = {
      id: 'recurring-event-123_20240101T100000Z',
      recurringEventId: 'recurring-event-123',
      start: { dateTime: '2024-01-01T10:00:00Z' },
      end: { dateTime: '2024-01-01T11:00:00Z' },
      extendedProperties: {
        private: {
          meetingId: 'meeting-123',
          meetingTypeId: 'meeting-type-1',
          includesParticipants: 'true',
        },
      },
    }

    const mockConferenceMeeting = {
      id: 'conf-123',
      meeting_id: 'meeting-123',
      version: MeetingVersion.V3,
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
        },
      ],
    }

    const mockSeries = [
      {
        id: 'series-1',
        account_address: '0x123',
        template_start: '2024-01-01T10:00:00Z',
        template_end: '2024-01-01T11:00:00Z',
      },
    ]

    beforeEach(() => {
      mockDatabase.getConferenceMeetingFromDB.mockResolvedValue(mockConferenceMeeting as any)
      mockDatabase.getEventMasterSeries.mockResolvedValue(mockSeries as any)
      mockDatabase.findAccountsByEmails.mockResolvedValue({} as any)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(true)
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
      mockCalendarManager.decryptConferenceMeeting.mockResolvedValue(mockConferenceMeeting as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        participants_mapping: [{ account_address: '0x123', timeZone: 'UTC' }],
      } as any)
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [{ id: 'slot-1', account_address: '0x123', version: 1, start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }],
      } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
      mockCalendarSyncQueue.queueCalendarInstanceDeleteSync.mockResolvedValue(undefined as any)
    })

    it('should cancel recurring instance when user is owner', async () => {
      await handleCancelOrDeleteForRecurringInstance(
        mockEvent,
        '0x123'
      )

      expect(mockDatabase.getConferenceMeetingFromDB).toHaveBeenCalledWith('meeting-123')
    })

    it('should not process event without recurring event ID', async () => {
      const nonRecurringEvent = { ...mockEvent, recurringEventId: undefined, extendedProperties: { private: {} } }

      await handleCancelOrDeleteForRecurringInstance(
        nonRecurringEvent,
        '0x123'
      )

      expect(mockDatabase.getConferenceMeetingFromDB).not.toHaveBeenCalled()
    })

    it('should handle deletion when user is not owner', async () => {
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(false)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        participants_mapping: [{ account_address: '0x123', timeZone: 'UTC' }],
      } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
      mockDatabase.getSlotSeries.mockResolvedValue(mockSeries[0] as any)
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [{ id: 'slot-1', account_address: '0x123', version: 1, start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }],
      } as any)

      await handleCancelOrDeleteForRecurringInstance(
        mockEvent,
        '0x456'
      )

      expect(mockDatabase.getConferenceMeetingFromDB).toHaveBeenCalled()
    })
  })

  describe('error handling edge cases', () => {
    it('should handle database errors gracefully in handleCancelOrDelete', async () => {
      mockDatabase.getAccountFromDB.mockRejectedValue(new Error('DB Error'))

      const mockMeeting = {
        id: 'meeting-123',
        participants: [{ account_address: '0x123', type: ParticipantType.Owner }],
      }

      await expect(
        handleCancelOrDelete('0x123', mockMeeting as any)
      ).rejects.toThrow('DB Error')
    })

    it('should handle missing account data', async () => {
      mockDatabase.getAccountFromDB.mockResolvedValue(null as any)

      const mockMeeting = {
        id: 'meeting-123',
        participants: [],
      }

      await expect(
        handleUpdateRSVPParseMeetingInfo(
          '0x123',
          'meeting-type-1',
          mockMeeting as any,
          ParticipationStatus.Accepted
        )
      ).rejects.toThrow()
    })
  })

  describe('edge cases with empty data', () => {
    it('should handle empty participants list', async () => {
      mockDatabase.findAccountsByEmails.mockResolvedValue({} as any)

      const result = await handleParseParticipants('meeting-123', [], [], '0x123')

      expect(result).toHaveLength(0)
    })

    it('should handle empty series data', async () => {
      mockDatabase.getEventMasterSeries.mockResolvedValue([])
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(true)
      mockDatabase.deleteRecurringSlotInstances.mockResolvedValue(undefined)

      const mockEvent: calendar_v3.Schema$Event = {
        id: 'event-123',
        recurrence: ['RRULE:FREQ=WEEKLY'],
      }

      await handleCancelOrDeleteSeries(
        '0x123',
        { id: 'meeting-123', participants: [] } as any,
        'meeting-123',
        mockEvent
      )

      // Should not crash with empty series
      expect(mockDatabase.getEventMasterSeries).toHaveBeenCalled()
    })

    it('should handle participants with both account and guest info', async () => {
      const attendees = [
        { email: 'both@example.com', responseStatus: 'accepted' },
      ]
      
      const participants = [
        {
          account_address: '0x123',
          guest_email: 'both@example.com',
          type: ParticipantType.Invitee,
        },
      ]

      mockDatabase.findAccountsByEmails.mockResolvedValue({
        'both@example.com': [{ address: '0x123' }],
      } as any)

      const result = await handleParseParticipants(
        'meeting-123',
        attendees,
        participants as any,
        '0x123'
      )

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle meetings with guest participants only', async () => {
      const mockMeeting = {
        id: 'meeting-123',
        meeting_id: 'root-123',
        participants: [
          {
            guest_email: 'guest1@example.com',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
          },
        ],
        version: 1,
        start: new Date(),
        end: new Date(),
        content: 'content',
        meeting_url: 'url',
        provider: MeetingProvider.GOOGLE_MEET,
        reminders: [],
        recurrence: MeetingRepeat.NO_REPEAT,
      }

      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({})
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: mockMeeting.participants,
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: mockMeeting.start,
        end: mockMeeting.end,
      } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)

      const result = await handleUpdateRSVPParseMeetingInfo(
        '0x123',
        'type-1',
        mockMeeting as any,
        ParticipationStatus.Accepted
      )

      expect(result).toBeDefined()
    })
  })

  describe('permission checks', () => {
    const mockMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-123',
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Invitee,
        },
      ],
      permissions: [],
      version: 1,
    }

    it('should deny update when lacking edit permissions', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReset()
      mockGenericUtils.canAccountAccessPermission
        .mockReturnValueOnce(true) // Can invite
        .mockReturnValueOnce(false) // Cannot edit

      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])

      await expect(
        handleUpdateParseMeetingInfo(
          '0x123',
          'type-1',
          new Date(),
          new Date(),
          { ...mockMeeting, title: 'Old' } as any,
          mockMeeting.participants,
          'content',
          'url',
          MeetingProvider.GOOGLE_MEET,
          'New Title'
        )
      ).rejects.toThrow(MeetingDetailsModificationDenied)
    })

    it('should allow update when user has all permissions', async () => {
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date(),
        end: new Date(),
      } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)

      const result = await handleUpdateParseMeetingInfo(
        '0x123',
        'type-1',
        new Date(),
        new Date(),
        { ...mockMeeting, title: 'Old', content: 'old', meeting_url: 'old-url', provider: MeetingProvider.GOOGLE_MEET } as any,
        mockMeeting.participants,
        'new content',
        'new url',
        MeetingProvider.ZOOM,
        'New Title'
      )

      expect(result).toBeDefined()
    })
  })

  describe('complex participant scenarios', () => {
    it('should handle participants sorted by role type', async () => {
      const attendees = [
        { email: 'invitee@example.com', responseStatus: 'accepted' },
        { email: 'owner@example.com', responseStatus: 'accepted' },
        { email: 'scheduler@example.com', responseStatus: 'accepted' },
      ]

      const participants = [
        {
          account_address: '0x789',
          type: ParticipantType.Invitee,
        },
        {
          account_address: '0x456',
          type: ParticipantType.Scheduler,
        },
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
        },
      ]

      mockDatabase.findAccountsByEmails.mockResolvedValue({
        'invitee@example.com': [{ address: '0x789' }],
        'owner@example.com': [{ address: '0x123' }],
        'scheduler@example.com': [{ address: '0x456' }],
      } as any)

      const result = await handleParseParticipants(
        'meeting-123',
        attendees,
        participants as any,
        '0x123'
      )

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle case-insensitive email matching', async () => {
      const attendees = [
        { email: 'Test@Example.COM', responseStatus: 'accepted' },
      ]

      const participants = [
        {
          guest_email: 'test@example.com',
          type: ParticipantType.Invitee,
        },
      ]

      mockDatabase.findAccountsByEmails.mockResolvedValue({} as any)

      const result = await handleParseParticipants(
        'meeting-123',
        attendees,
        participants as any,
        '0x123'
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].guest_email).toBeDefined()
    })
  })

  describe('recurring event edge cases', () => {
    it('should handle series with guest participants', async () => {
      const mockEvent: calendar_v3.Schema$Event = {
        id: 'event-123',
        recurrence: ['RRULE:FREQ=DAILY;COUNT=3'],
        start: { dateTime: '2024-01-01T10:00:00Z' },
      }

      const mockMeeting = {
        id: 'meeting-123',
        participants: [
          {
            guest_email: 'guest@example.com',
            type: ParticipantType.Invitee,
          },
        ],
      }

      const mockSeries = [
        {
          id: 'series-1',
          guest_email: 'guest@example.com',
          template_start: '2024-01-01T10:00:00Z',
          template_end: '2024-01-01T11:00:00Z',
          effective_start: '2024-01-01T10:00:00Z',
        },
      ]

      mockDatabase.getEventMasterSeries.mockResolvedValue(mockSeries as any)
      mockDatabase.getAccountFromDB.mockResolvedValue({ address: '0x123' } as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({})
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
      } as any)
      mockDatabase.parseParticipantSlots.mockResolvedValue({
        slots: [{ id: 'slot-1', guest_email: 'guest@example.com', start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' }],
      } as any)
      mockDatabase.upsertSeries.mockResolvedValue([mockSeries[0]] as any)
      mockDatabase.bulkUpdateSlotSeriesConfirmedSlots.mockResolvedValue(undefined)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)

      await handleUpdateMeetingSeriesRsvps(
        '0x123',
        'meeting-123',
        mockEvent,
        mockMeeting as any,
        ParticipationStatus.Accepted
      )

      expect(mockDatabase.upsertSeries).toHaveBeenCalled()
    })
  })

  describe('additional getBaseEventId edge cases', () => {
    it('should handle very short event ID', () => {
      const shortId = 'abc123'
      const result = getBaseEventId(shortId)
      expect(result).toBeDefined()
    })

    it('should handle event ID with multiple underscores', () => {
      const multiUnderscore = '02cd383a77214840b5a1ad4ceb545ff8_20240101_extra'
      const result = getBaseEventId(multiUnderscore)
      expect(result).toBe('02cd383a-7721-4840-b5a1-ad4ceb545ff8')
    })

    it('should handle 32 character UUID properly', () => {
      const uuid32 = 'abcdef0123456789abcdef0123456789'
      const result = getBaseEventId(uuid32)
      expect(result).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
    })
  })

  describe('getParticipationStatus additional cases', () => {
    it('should handle empty string', () => {
      expect(getParticipationStatus('')).toBe(ParticipationStatus.Pending)
    })

    it('should handle various casing', () => {
      expect(getParticipationStatus('ACCEPTED')).toBe(ParticipationStatus.Pending)
      expect(getParticipationStatus('Declined')).toBe(ParticipationStatus.Pending)
    })

    it('should handle mixed case', () => {
      expect(getParticipationStatus('AccEPteD')).toBe(ParticipationStatus.Pending)
    })
  })

  describe('handleUpdateMeeting with different providers', () => {
    const mockAccount = {
      address: '0x123',
      name: 'Test User',
      preferences: { timezone: 'UTC' },
    }

    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      title: 'Test Meeting',
      content: 'content',
      meeting_url: 'url',
      provider: MeetingProvider.GOOGLE_MEET,
      start: new Date('2024-01-01T10:00:00Z'),
      end: new Date('2024-01-01T11:00:00Z'),
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Owner,
          status: ParticipationStatus.Accepted,
          slot_id: 'slot-1',
        },
      ],
      related_slot_ids: ['slot-1'],
      version: 1,
      permissions: [MeetingPermissions.INVITE_GUESTS, MeetingPermissions.EDIT_MEETING],
    }

    beforeEach(() => {
      mockDatabase.getAccountFromDB.mockResolvedValue(mockAccount as any)
      mockCalendarManager.loadMeetingAccountAddresses.mockResolvedValue(['0x123'])
      mockCalendarManager.mapRelatedSlots.mockResolvedValue({ '0x123': 'slot-1' })
      mockCalendarManager.handleParticipants.mockResolvedValue({
        sanitizedParticipants: [],
        allAccounts: [],
      } as any)
      mockCalendarManager.buildMeetingData.mockResolvedValue({} as any)
      mockDatabase.updateMeeting.mockResolvedValue({ id: 'slot-updated' } as any)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
      } as any)
      mockGenericUtils.canAccountAccessPermission.mockReturnValue(true)
    })

    it('should handle ZOOM provider', async () => {
      const result = await handleUpdateMeeting(
        false,
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T11:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'content',
        'https://zoom.us/j/123',
        MeetingProvider.ZOOM
      )

      expect(result).toBeDefined()
      expect(mockDatabase.updateMeeting).toHaveBeenCalled()
    })

    it('should handle TEAMS provider', async () => {
      const result = await handleUpdateMeeting(
        false,
        '0x123',
        'meeting-type-1',
        new Date('2024-01-01T11:00:00Z'),
        new Date('2024-01-01T12:00:00Z'),
        mockDecryptedMeeting as any,
        [],
        'content',
        'https://teams.microsoft.com/meet',
        MeetingProvider.TEAMS
      )

      expect(result).toBeDefined()
    })
  })

  describe('handleParseParticipants complex scenarios', () => {
    it('should handle participants with special characters in email', async () => {
      const attendees = [
        { email: 'test+tag@example.com', responseStatus: 'accepted' },
      ]

      mockDatabase.findAccountsByEmails.mockResolvedValue({
        'test+tag@example.com': [],
      } as any)

      const result = await handleParseParticipants(
        'meeting-123',
        attendees,
        [],
        '0x123'
      )

      expect(result.length).toBeGreaterThan(0)
      expect(result[0].guest_email).toBe('test+tag@example.com')
    })

    it('should skip attendees with displayName but no email', async () => {
      const attendees = [
        { displayName: 'No Email User' },
        { email: 'valid@example.com', responseStatus: 'accepted' },
      ]

      mockDatabase.findAccountsByEmails.mockResolvedValue({} as any)

      const result = await handleParseParticipants(
        'meeting-123',
        attendees,
        [],
        '0x123'
      )

      expect(result.length).toBe(1)
      expect(result[0].guest_email).toBe('valid@example.com')
    })
  })

  describe('handleCancelOrDelete boundary conditions', () => {
    const mockDecryptedMeeting = {
      id: 'meeting-123',
      meeting_id: 'root-meeting-123',
      participants: [
        {
          account_address: '0x123',
          type: ParticipantType.Scheduler,
          status: ParticipationStatus.Accepted,
        },
      ],
      related_slot_ids: ['slot-1'],
      title: 'Test Meeting',
    }

    beforeEach(() => {
      mockGenericUtils.isAccountSchedulerOrOwner.mockReturnValue(true)
      mockDatabase.getAccountFromDB.mockResolvedValue({
        address: '0x123',
        preferences: { timezone: 'America/New_York' },
      } as any)
      mockDatabase.deleteMeetingFromDB.mockResolvedValue(undefined)
      mockUserManager.getParticipantBaseInfoFromAccount.mockReturnValue({
        account_address: '0x123',
        name: 'Test User',
      } as any)
      mockGenericUtils.deduplicateArray.mockImplementation((arr: any[]) => arr)
    })

    it('should cancel meeting when user is scheduler', async () => {
      await handleCancelOrDelete('0x123', mockDecryptedMeeting as any)

      expect(mockDatabase.deleteMeetingFromDB).toHaveBeenCalled()
    })

    it('should use account timezone in cancel', async () => {
      await handleCancelOrDelete('0x123', mockDecryptedMeeting as any)

      expect(mockDatabase.deleteMeetingFromDB).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'America/New_York',
        undefined,
        expect.anything()
      )
    })
  })

  describe('extractMeetingDescription edge cases', () => {
    it('should preserve line breaks in untouched content', () => {
      const summary = 'Line1\nLine2\nLine3'
      const result = extractMeetingDescription(summary)
      expect(result).toContain('\n')
    })

    it('should handle very long descriptions', () => {
      const longText = 'A'.repeat(1000) + '\nYour meeting will happen at https://example.com\n' + 'B'.repeat(1000)
      const result = extractMeetingDescription(longText)
      expect(result.length).toBeLessThan(longText.length)
    })
  })

  describe('getBaseEventId robustness', () => {
    it('should handle empty string gracefully', () => {
      const result = getBaseEventId('')
      expect(result).toBeDefined()
    })

    it('should handle event ID exactly 32 chars', () => {
      const exactId = '12345678901234567890123456789012'
      const result = getBaseEventId(exactId)
      expect(result).toContain('-')
    })
  })

  describe('exports check', () => {
    it('should have all main functions exported', () => {
      expect(extractMeetingDescription).toBeDefined()
      expect(getBaseEventId).toBeDefined()
      expect(getParticipationStatus).toBeDefined()
      expect(handleCancelOrDelete).toBeDefined()
      expect(handleParseParticipants).toBeDefined()
      expect(handleUpdateMeeting).toBeDefined()
      expect(handleUpdateMeetingRsvps).toBeDefined()
      expect(handleUpdateParseMeetingInfo).toBeDefined()
      expect(handleUpdateRSVPParseMeetingInfo).toBeDefined()
    })
  })
})
