import * as Sentry from '@sentry/nextjs'
import {
  mockAccountNotifications as mockAccountNotificationsFactory,
  mockGroup as mockGroupFactory,
  mockMeetingCancelSyncRequest,
  mockMeetingCreationSyncRequest,
  mockRequestParticipantMapping,
} from '@/testing/mocks'
import { NotificationChannel } from '@/types/AccountNotifications'
import {
  GroupNotificationType,
  MeetingChangeType,
  MeetingProvider,
  ParticipantMappingType,
} from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'
import {
  emailQueue,
  notifyForGroupInviteJoinOrReject,
  notifyForMeetingCancellation,
  notifyForOrUpdateNewMeeting,
} from '@/utils/notification_helper'
import * as discordHelper from '@/utils/services/discord.helper'
import * as telegramHelper from '@/utils/services/telegram.helper'
import * as subscriptionManager from '@/utils/subscription_manager'

jest.mock('@sentry/nextjs')
jest.mock('@/utils/database')
jest.mock('@/utils/email_helper')
jest.mock('@/utils/services/discord.helper')
jest.mock('@/utils/services/telegram.helper')
jest.mock('@/utils/subscription_manager')
jest.mock('@/utils/workers/email.queue', () => ({
  EmailQueue: jest.fn().mockImplementation(() => ({
    add: jest.fn((fn: () => Promise<boolean>) => fn()),
  })),
}))
jest.mock('@/utils/calendar_manager', () => ({
  dateToHumanReadable: jest.fn((date: Date) => date.toISOString()),
  durationToHumanReadable: jest.fn((duration: number) => `${duration}min`),
}))
jest.mock('@/utils/user_manager', () => ({
  getAllParticipantsDisplayName: jest.fn(() => 'Test User, Other User'),
}))

const mockAccountNotifications = mockAccountNotificationsFactory({
  account_address: '0x123',
})

const mockGroup = mockGroupFactory({
  name: 'Test Group',
  description: 'Test group for notifications',
})

describe('notification_helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(database.getAccountFromDB as jest.Mock).mockResolvedValue({
      address: '0x123',
      preferences: {
        name: 'Test User',
        timezone: 'America/New_York',
      },
    })
    ;(
      database.getAccountNotificationSubscriptions as jest.Mock
    ).mockResolvedValue(mockAccountNotifications)
    ;(database.getGroupInternal as jest.Mock).mockResolvedValue(mockGroup)
    ;(emailHelper.newGroupInviteEmail as jest.Mock).mockResolvedValue(true)
    ;(emailHelper.newGroupRejectEmail as jest.Mock).mockResolvedValue(true)
    ;(emailHelper.newMeetingEmail as jest.Mock).mockResolvedValue(true)
    ;(emailHelper.updateMeetingEmail as jest.Mock).mockResolvedValue(true)
    ;(emailHelper.cancelledMeetingEmail as jest.Mock).mockResolvedValue(true)
    ;(discordHelper.dmAccount as jest.Mock).mockResolvedValue(true)
    ;(telegramHelper.sendDm as jest.Mock).mockResolvedValue(true)
    ;(subscriptionManager.isProAccount as jest.Mock).mockReturnValue(false)
  })

  describe('notifyForGroupInviteJoinOrReject', () => {
    it('should send email notifications for group invite', async () => {
      const accountsToNotify = ['0x123', '0x456']
      const groupId = 'group-123'

      await notifyForGroupInviteJoinOrReject(
        accountsToNotify,
        groupId,
        GroupNotificationType.INVITE
      )

      expect(database.getAccountFromDB).toHaveBeenCalledTimes(2)
      expect(database.getGroupInternal).toHaveBeenCalledWith(groupId)
      expect(
        database.getAccountNotificationSubscriptions
      ).toHaveBeenCalledTimes(2)
      expect(emailHelper.newGroupInviteEmail).toHaveBeenCalled()
    })

    it('should send email notifications for group reject', async () => {
      const accountsToNotify = ['0x123']
      const groupId = 'group-123'

      await notifyForGroupInviteJoinOrReject(
        accountsToNotify,
        groupId,
        GroupNotificationType.REJECT
      )

      expect(database.getGroupInternal).toHaveBeenCalledWith(groupId)
      expect(emailHelper.newGroupRejectEmail).toHaveBeenCalled()
    })

    it('should handle empty accounts array', async () => {
      await notifyForGroupInviteJoinOrReject(
        [],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(emailHelper.newGroupInviteEmail).not.toHaveBeenCalled()
    })

    it('should handle accounts without notifications', async () => {
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x123',
        notification_types: [],
      })

      await notifyForGroupInviteJoinOrReject(
        ['0x123'],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(database.getAccountFromDB).toHaveBeenCalled()
    })

    it('should use default timezone when not set', async () => {
      ;(database.getAccountFromDB as jest.Mock).mockResolvedValue({
        address: '0x123',
        preferences: {
          name: 'Test User',
        },
      })

      await notifyForGroupInviteJoinOrReject(
        ['0x123'],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(database.getAccountFromDB).toHaveBeenCalled()
    })
  })

  describe('notifyForMeetingCancellation', () => {
    const mockMeetingCancelRequest = mockMeetingCancelSyncRequest({
      meeting_id: 'meeting-123',
      timezone: 'America/New_York',
      participantActing: {
        account_address: '0x123',
        name: 'Test User',
      },
      addressesToRemove: ['0x456'],
    })

    it('should notify guests about meeting cancellation', async () => {
      await notifyForMeetingCancellation(mockMeetingCancelRequest)

      expect(emailHelper.cancelledMeetingEmail).toHaveBeenCalled()
    })

    it('should notify addresses about meeting cancellation', async () => {
      await notifyForMeetingCancellation(mockMeetingCancelRequest)

      expect(database.getAccountFromDB).toHaveBeenCalledWith('0x456')
      expect(database.getAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle empty guests and addresses', async () => {
      const emptyRequest = mockMeetingCancelSyncRequest({
        ...mockMeetingCancelRequest,
        guestsToRemove: [],
        addressesToRemove: [],
      })

      await notifyForMeetingCancellation(emptyRequest)

      expect(emailHelper.cancelledMeetingEmail).not.toHaveBeenCalled()
    })

    it('should capture Sentry exception on error', async () => {
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x456',
        notification_types: null,
      })

      await notifyForMeetingCancellation(mockMeetingCancelRequest)

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('notifyForOrUpdateNewMeeting', () => {
    const mockMeetingRequest = mockMeetingCreationSyncRequest({
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      timezone: 'America/New_York',
      participantActing: {
        account_address: '0x123',
        name: 'Test User',
      },
      participants: [
        mockRequestParticipantMapping({
          account_address: '0x456',
          meeting_id: 'meeting-123',
          name: 'Participant',
          type: ParticipantType.Invitee,
          status: ParticipationStatus.Pending,
          timeZone: 'America/New_York',
          mappingType: ParticipantMappingType.ADD,
        }),
      ],
      meeting_url: 'https://zoom.us/123',
      meetingProvider: MeetingProvider.ZOOM,
      rrule: [],
    })

    it('should send new meeting notifications', async () => {
      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(database.getAccountNotificationSubscriptions).toHaveBeenCalled()
      expect(emailHelper.newMeetingEmail).toHaveBeenCalled()
    })

    it('should send update meeting notifications', async () => {
      const updateRequest = mockMeetingCreationSyncRequest({
        ...mockMeetingRequest,
        participants: [
          mockRequestParticipantMapping({
            ...mockMeetingRequest.participants[0],
            mappingType: ParticipantMappingType.KEEP,
          }),
        ],
      })

      await notifyForOrUpdateNewMeeting(MeetingChangeType.UPDATE, updateRequest)

      expect(database.getAccountNotificationSubscriptions).toHaveBeenCalled()
      expect(emailHelper.updateMeetingEmail).toHaveBeenCalled()
    })

    it('should handle guest email participants', async () => {
      const requestWithGuest = mockMeetingCreationSyncRequest({
        ...mockMeetingRequest,
        participants: [
          mockRequestParticipantMapping({
            guest_email: 'guest@example.com',
            meeting_id: 'meeting-123',
            name: 'Guest',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            timeZone: 'UTC',
            mappingType: ParticipantMappingType.ADD,
          }),
        ],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        requestWithGuest
      )

      expect(emailHelper.newMeetingEmail).toHaveBeenCalled()
    })

    it('should send Discord notifications when enabled', async () => {
      ;(subscriptionManager.isProAccount as jest.Mock).mockReturnValue(true)
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x456',
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-user-id',
            disabled: false,
          },
        ],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(discordHelper.dmAccount).toHaveBeenCalled()
    })

    it('should not send Discord notification to the acting participant', async () => {
      const requestSameParticipant = mockMeetingCreationSyncRequest({
        ...mockMeetingRequest,
        participants: [
          mockRequestParticipantMapping({
            account_address: '0x123', // Same as participantActing
            meeting_id: 'meeting-123',
            name: 'Test User',
            type: ParticipantType.Owner,
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            mappingType: ParticipantMappingType.ADD,
          }),
        ],
      })

      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x123',
        notification_types: [
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-user-id',
            disabled: false,
          },
        ],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        requestSameParticipant
      )

      expect(discordHelper.dmAccount).not.toHaveBeenCalled()
    })

    it('should send Telegram notifications when enabled', async () => {
      ;(subscriptionManager.isProAccount as jest.Mock).mockReturnValue(true)
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x456',
        notification_types: [
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'telegram-user-id',
            disabled: false,
          },
        ],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(telegramHelper.sendDm).toHaveBeenCalled()
    })

    it('should skip disabled notification channels', async () => {
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x456',
        notification_types: [
          {
            channel: NotificationChannel.EMAIL,
            destination: 'test@example.com',
            disabled: true,
          },
        ],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(emailHelper.newMeetingEmail).not.toHaveBeenCalled()
    })

    it('should handle participants without notifications', async () => {
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue(undefined)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(emailHelper.newMeetingEmail).not.toHaveBeenCalled()
    })

    it('should change ADD mapping to CREATE changeType', async () => {
      const requestWithAdd = mockMeetingCreationSyncRequest({
        ...mockMeetingRequest,
        participants: [
          mockRequestParticipantMapping({
            account_address: '0x456',
            meeting_id: 'meeting-123',
            name: 'New Participant',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            timeZone: 'America/New_York',
            mappingType: ParticipantMappingType.ADD,
          }),
        ],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.UPDATE,
        requestWithAdd
      )

      expect(emailHelper.newMeetingEmail).toHaveBeenCalled()
    })

    it('should handle empty participants array', async () => {
      const requestNoParticipants = mockMeetingCreationSyncRequest({
        ...mockMeetingRequest,
        participants: [],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        requestNoParticipants
      )

      expect(emailHelper.newMeetingEmail).not.toHaveBeenCalled()
    })
  })

  describe('emailQueue', () => {
    it('should be defined and instantiated', () => {
      expect(emailQueue).toBeDefined()
      expect(emailQueue.add).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should capture exceptions in workNotifications', async () => {
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x456',
        notification_types: null,
      })

      const mockMeetingRequest = mockMeetingCreationSyncRequest({
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        timezone: 'America/New_York',
        participantActing: {
          account_address: '0x123',
          name: 'Test User',
        },
        participants: [
          mockRequestParticipantMapping({
            account_address: '0x456',
            meeting_id: 'meeting-123',
            name: 'Participant',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            timeZone: 'America/New_York',
            mappingType: ParticipantMappingType.ADD,
          }),
        ],
        meeting_url: 'https://zoom.us/123',
        meetingProvider: MeetingProvider.ZOOM,
        rrule: [],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(Sentry.captureException).toHaveBeenCalled()
    })

    it('should capture exceptions in workGroupNotifications', async () => {
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x123',
        notification_types: null,
      })

      await notifyForGroupInviteJoinOrReject(
        ['0x123'],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('multiple notification channels', () => {
    it('should send to all enabled channels', async () => {
      ;(subscriptionManager.isProAccount as jest.Mock).mockReturnValue(true)
      ;(
        database.getAccountNotificationSubscriptions as jest.Mock
      ).mockResolvedValue({
        account_address: '0x456',
        notification_types: [
          {
            channel: NotificationChannel.EMAIL,
            destination: 'test@example.com',
            disabled: false,
          },
          {
            channel: NotificationChannel.DISCORD,
            destination: 'discord-id',
            disabled: false,
          },
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'telegram-id',
            disabled: false,
          },
        ],
      })

      const mockMeetingRequest = mockMeetingCreationSyncRequest({
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        timezone: 'America/New_York',
        participantActing: {
          account_address: '0x123',
          name: 'Test User',
        },
        participants: [
          mockRequestParticipantMapping({
            account_address: '0x456',
            meeting_id: 'meeting-123',
            name: 'Participant',
            type: ParticipantType.Invitee,
            status: ParticipationStatus.Pending,
            timeZone: 'America/New_York',
            mappingType: ParticipantMappingType.ADD,
          }),
        ],
        meeting_url: 'https://zoom.us/123',
        meetingProvider: MeetingProvider.ZOOM,
        rrule: [],
      })

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(emailHelper.newMeetingEmail).toHaveBeenCalled()
      expect(discordHelper.dmAccount).toHaveBeenCalled()
      expect(telegramHelper.sendDm).toHaveBeenCalled()
    })
  })
})
