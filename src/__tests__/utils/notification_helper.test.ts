import * as Sentry from '@sentry/nextjs'
import {
  notifyForGroupInviteJoinOrReject,
  notifyForMeetingCancellation,
  notifyForOrUpdateNewMeeting,
  emailQueue,
  ParticipantInfoForNotification,
} from '@/utils/notification_helper'
import {
  MeetingChangeType,
  ParticipantMappingType,
  GroupNotificationType,
} from '@/types/Meeting'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import { NotificationChannel } from '@/types/AccountNotifications'
import {
  getAccountFromDB,
  getAccountNotificationSubscriptions,
  getGroupInternal,
} from '@/utils/database'
import {
  newMeetingEmail,
  cancelledMeetingEmail,
  updateMeetingEmail,
  newGroupInviteEmail,
  newGroupRejectEmail,
} from '@/utils/email_helper'
import { dmAccount } from '@/utils/services/discord.helper'
import { sendDm } from '@/utils/services/telegram.helper'
import { isProAccount } from '@/utils/subscription_manager'
import {
  MeetingCreationSyncRequest,
  MeetingCancelSyncRequest,
  RequestParticipantMapping,
} from '@/types/Requests'

jest.mock('@sentry/nextjs')
jest.mock('@/utils/database')
jest.mock('@/utils/email_helper')
jest.mock('@/utils/services/discord.helper')
jest.mock('@/utils/services/telegram.helper')
jest.mock('@/utils/subscription_manager')
jest.mock('@/utils/user_manager', () => ({
  getAllParticipantsDisplayName: jest.fn(() => 'User1, User2'),
}))
jest.mock('@/utils/calendar_manager', () => ({
  dateToHumanReadable: jest.fn((date: Date) => date.toISOString()),
  durationToHumanReadable: jest.fn((mins: number) => `${mins} minutes`),
}))

const mockGetAccountFromDB = getAccountFromDB as jest.MockedFunction<
  typeof getAccountFromDB
>
const mockGetAccountNotificationSubscriptions =
  getAccountNotificationSubscriptions as jest.MockedFunction<
    typeof getAccountNotificationSubscriptions
  >
const mockGetGroupInternal = getGroupInternal as jest.MockedFunction<
  typeof getGroupInternal
>
const mockNewMeetingEmail = newMeetingEmail as jest.MockedFunction<
  typeof newMeetingEmail
>
const mockCancelledMeetingEmail = cancelledMeetingEmail as jest.MockedFunction<
  typeof cancelledMeetingEmail
>
const mockUpdateMeetingEmail = updateMeetingEmail as jest.MockedFunction<
  typeof updateMeetingEmail
>
const mockNewGroupInviteEmail = newGroupInviteEmail as jest.MockedFunction<
  typeof newGroupInviteEmail
>
const mockNewGroupRejectEmail = newGroupRejectEmail as jest.MockedFunction<
  typeof newGroupRejectEmail
>
const mockDmAccount = dmAccount as jest.MockedFunction<typeof dmAccount>
const mockSendDm = sendDm as jest.MockedFunction<typeof sendDm>
const mockIsProAccount = isProAccount as jest.MockedFunction<
  typeof isProAccount
>

describe('notification_helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('emailQueue', () => {
    it('should export emailQueue instance', () => {
      expect(emailQueue).toBeDefined()
      expect(emailQueue).toHaveProperty('add')
    })
  })

  describe('notifyForGroupInviteJoinOrReject', () => {
    const mockGroup = {
      group_id: 'group-123',
      name: 'Test Group',
      owner: 'owner-address',
    }

    beforeEach(() => {
      mockGetGroupInternal.mockResolvedValue(mockGroup as any)
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
      } as any)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewGroupInviteEmail.mockResolvedValue(true)
      mockNewGroupRejectEmail.mockResolvedValue(true)
    })

    it('should notify accounts for group invite', async () => {
      await notifyForGroupInviteJoinOrReject(
        ['user1@example.com'],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(mockGetGroupInternal).toHaveBeenCalledWith('group-123')
      expect(mockGetAccountFromDB).toHaveBeenCalledWith('user1@example.com')
      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalledWith('user1@example.com')
    })

    it('should notify accounts for group rejection', async () => {
      await notifyForGroupInviteJoinOrReject(
        ['user1@example.com'],
        'group-123',
        GroupNotificationType.REJECT
      )

      expect(mockGetGroupInternal).toHaveBeenCalledWith('group-123')
      expect(mockGetAccountFromDB).toHaveBeenCalled()
    })

    it('should handle multiple accounts to notify', async () => {
      await notifyForGroupInviteJoinOrReject(
        ['user1@example.com', 'user2@example.com', 'user3@example.com'],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(mockGetAccountFromDB).toHaveBeenCalledTimes(3)
      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalledTimes(3)
    })

    it('should handle accounts with no timezone (default to UTC)', async () => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User' },
      } as any)

      await notifyForGroupInviteJoinOrReject(
        ['user1@example.com'],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(mockGetAccountFromDB).toHaveBeenCalled()
    })

    it('should handle empty accounts array', async () => {
      await notifyForGroupInviteJoinOrReject(
        [],
        'group-123',
        GroupNotificationType.INVITE
      )

      expect(mockGetGroupInternal).toHaveBeenCalledWith('group-123')
      expect(mockGetAccountFromDB).not.toHaveBeenCalled()
    })
  })

  describe('notifyForMeetingCancellation', () => {
    const mockCancelRequest: MeetingCancelSyncRequest = {
      meeting_id: 'meeting-123',
      timezone: 'America/New_York',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      title: 'Test Meeting',
      guestsToRemove: [
        {
          guest_email: 'guest@example.com',
          name: 'Guest User',
        },
      ],
      addressesToRemove: ['user1@example.com'],
      participantActing: {
        account_address: 'acting@example.com',
        name: 'Acting User',
      },
    }

    beforeEach(() => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
      } as any)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockCancelledMeetingEmail.mockResolvedValue(true)
    })

    it('should notify for meeting cancellation with guests', async () => {
      await notifyForMeetingCancellation(mockCancelRequest)

      expect(mockGetAccountFromDB).toHaveBeenCalled()
    })

    it('should notify for meeting cancellation with addresses', async () => {
      const request = {
        ...mockCancelRequest,
        guestsToRemove: [],
        addressesToRemove: ['user1@example.com', 'user2@example.com'],
      }

      await notifyForMeetingCancellation(request)

      expect(mockGetAccountFromDB).toHaveBeenCalledTimes(2)
      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalledTimes(2)
    })

    it('should handle cancellation with both guests and addresses', async () => {
      await notifyForMeetingCancellation(mockCancelRequest)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('user1@example.com')
    })

    it('should handle cancellation with no participants', async () => {
      const request = {
        ...mockCancelRequest,
        guestsToRemove: [],
        addressesToRemove: [],
      }

      await notifyForMeetingCancellation(request)

      expect(mockGetAccountFromDB).not.toHaveBeenCalled()
    })

    it('should set correct mapping type for removed participants', async () => {
      await notifyForMeetingCancellation(mockCancelRequest)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })
  })

  describe('notifyForOrUpdateNewMeeting', () => {
    const mockParticipants: RequestParticipantMapping[] = [
      {
        account_address: 'user1@example.com',
        mappingType: ParticipantMappingType.ADD,
        meeting_id: 'meeting-123',
        name: 'User 1',
        slot_id: 'slot-1',
        status: ParticipationStatus.Accepted,
        timeZone: 'America/New_York',
        type: ParticipantType.Invitee,
      },
    ]

    const mockMeetingRequest: MeetingCreationSyncRequest = {
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      participants: mockParticipants,
      participantActing: {
        account_address: 'scheduler@example.com',
        name: 'Scheduler User',
      },
      timezone: 'America/New_York',
    }

    beforeEach(() => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewMeetingEmail.mockResolvedValue(true)
      mockUpdateMeetingEmail.mockResolvedValue(true)
    })

    it('should notify for new meeting creation', async () => {
      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should notify for meeting update', async () => {
      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.UPDATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle multiple participants', async () => {
      const requestWithMultipleParticipants = {
        ...mockMeetingRequest,
        participants: [
          ...mockParticipants,
          {
            account_address: 'user2@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 2',
            slot_id: 'slot-2',
            status: ParticipationStatus.Accepted,
            timeZone: 'Europe/London',
            type: ParticipantType.Invitee,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        requestWithMultipleParticipants
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalledTimes(2)
    })

    it('should handle guest email participants', async () => {
      const requestWithGuest = {
        ...mockMeetingRequest,
        participants: [
          {
            guest_email: 'guest@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'Guest User',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        requestWithGuest as any
      )

      expect(mockGetAccountNotificationSubscriptions).not.toHaveBeenCalled()
    })

    it('should handle participants with no notifications', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue(undefined as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })
  })

  describe('notification channels', () => {
    const mockParticipant: RequestParticipantMapping = {
      account_address: 'user1@example.com',
      mappingType: ParticipantMappingType.ADD,
      meeting_id: 'meeting-123',
      name: 'User 1',
      slot_id: 'slot-1',
      status: ParticipationStatus.Accepted,
      timeZone: 'America/New_York',
      type: ParticipantType.Invitee,
    }

    const mockMeetingRequest: MeetingCreationSyncRequest = {
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      participants: [mockParticipant],
      participantActing: {
        account_address: 'scheduler@example.com',
        name: 'Scheduler User',
      },
      timezone: 'America/New_York',
    }

    beforeEach(() => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
        pro_tier: 'premium',
      } as any)
      mockIsProAccount.mockReturnValue(true)
      mockNewMeetingEmail.mockResolvedValue(true)
      mockDmAccount.mockResolvedValue(true)
      mockSendDm.mockResolvedValue(true)
    })

    it('should send email notification when channel is EMAIL', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should send Discord notification when channel is DISCORD', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-user-id', disabled: false },
        ],
      } as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should send Telegram notification when channel is TELEGRAM', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.TELEGRAM, destination: 'telegram-user-id', disabled: false },
        ],
      } as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle multiple notification channels', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
          { channel: NotificationChannel.TELEGRAM, destination: 'telegram-id', disabled: false },
        ],
      } as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should skip disabled notification channels', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: true },
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should not send Discord notification to participant acting', async () => {
      const requestWithSameActor = {
        ...mockMeetingRequest,
        participantActing: {
          account_address: 'user1@example.com',
          name: 'User 1',
        },
      }

      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        requestWithSameActor
      )

      expect(mockDmAccount).not.toHaveBeenCalled()
    })
  })

  describe('meeting update notifications', () => {
    const mockMeetingRequest: MeetingCreationSyncRequest = {
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      participants: [
        {
          account_address: 'user1@example.com',
          mappingType: ParticipantMappingType.KEEP,
          meeting_id: 'meeting-123',
          name: 'User 1',
          slot_id: 'slot-1',
          status: ParticipationStatus.Accepted,
          timeZone: 'America/New_York',
          type: ParticipantType.Invitee,
        },
      ],
      participantActing: {
        account_address: 'scheduler@example.com',
        name: 'Scheduler User',
      },
      timezone: 'America/New_York',
      changes: {
        dateChange: {
          oldStart: '2024-01-15T09:00:00Z',
          oldEnd: '2024-01-15T10:00:00Z',
        },
      },
    }

    beforeEach(() => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
        pro_tier: 'premium',
      } as any)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockIsProAccount.mockReturnValue(true)
      mockUpdateMeetingEmail.mockResolvedValue(true)
    })

    it('should send update notification with date change', async () => {
      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.UPDATE,
        mockMeetingRequest
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle update without date change', async () => {
      const requestWithoutDateChange = {
        ...mockMeetingRequest,
        changes: undefined,
      }

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.UPDATE,
        requestWithoutDateChange
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle duration change in update', async () => {
      const requestWithDurationChange = {
        ...mockMeetingRequest,
        end: '2024-01-15T12:00:00Z',
      }

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.UPDATE,
        requestWithDurationChange
      )

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })
  })

  describe('participant mapping types', () => {
    const baseMeetingRequest: MeetingCreationSyncRequest = {
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      participants: [],
      participantActing: {
        account_address: 'scheduler@example.com',
        name: 'Scheduler User',
      },
      timezone: 'America/New_York',
    }

    beforeEach(() => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewMeetingEmail.mockResolvedValue(true)
      mockUpdateMeetingEmail.mockResolvedValue(true)
    })

    it('should handle ADD mapping type', async () => {
      const request = {
        ...baseMeetingRequest,
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.UPDATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle KEEP mapping type', async () => {
      const request = {
        ...baseMeetingRequest,
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.KEEP,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.UPDATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle REMOVE mapping type', async () => {
      const request = {
        ...baseMeetingRequest,
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.REMOVE,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Rejected,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.UPDATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })
  })

  describe('participant types', () => {
    const baseMeetingRequest: MeetingCreationSyncRequest = {
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      participants: [],
      participantActing: {
        account_address: 'scheduler@example.com',
        name: 'Scheduler User',
      },
      timezone: 'America/New_York',
    }

    beforeEach(() => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewMeetingEmail.mockResolvedValue(true)
    })

    it('should handle Scheduler participant type', async () => {
      const request = {
        ...baseMeetingRequest,
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Scheduler,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle Owner participant type', async () => {
      const request = {
        ...baseMeetingRequest,
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Owner,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle Invitee participant type', async () => {
      const request = {
        ...baseMeetingRequest,
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    const mockMeetingRequest: MeetingCreationSyncRequest = {
      meeting_id: 'meeting-123',
      title: 'Test Meeting',
      start: '2024-01-15T10:00:00Z',
      end: '2024-01-15T11:00:00Z',
      participants: [
        {
          account_address: 'user1@example.com',
          mappingType: ParticipantMappingType.ADD,
          meeting_id: 'meeting-123',
          name: 'User 1',
          slot_id: 'slot-1',
          status: ParticipationStatus.Accepted,
          timeZone: 'America/New_York',
          type: ParticipantType.Invitee,
        },
      ],
      participantActing: {
        account_address: 'scheduler@example.com',
        name: 'Scheduler User',
      },
      timezone: 'America/New_York',
    }

    it('should handle errors in notification sending', async () => {
      mockGetAccountNotificationSubscriptions.mockRejectedValue(
        new Error('Database error')
      )

      await expect(async () => {
        await notifyForOrUpdateNewMeeting(
          MeetingChangeType.CREATE,
          mockMeetingRequest
        )
      }).rejects.toThrow('Database error')
    })

    it('should capture exceptions with Sentry', async () => {
      const error = new Error('Test error')
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewMeetingEmail.mockRejectedValue(error)

      await notifyForOrUpdateNewMeeting(
        MeetingChangeType.CREATE,
        mockMeetingRequest
      )

      await new Promise(resolve => setTimeout(resolve, 100))
    })

    it('should handle email sending failures gracefully', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewMeetingEmail.mockRejectedValue(new Error('Email error'))

      await expect(
        notifyForOrUpdateNewMeeting(
          MeetingChangeType.CREATE,
          mockMeetingRequest
        )
      ).resolves.not.toThrow()
    })

    it('should handle Discord DM failures gracefully', async () => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
        pro_tier: 'premium',
      } as any)
      mockIsProAccount.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)
      mockDmAccount.mockRejectedValue(new Error('Discord error'))

      await expect(
        notifyForOrUpdateNewMeeting(
          MeetingChangeType.CREATE,
          mockMeetingRequest
        )
      ).resolves.not.toThrow()
    })

    it('should handle Telegram DM failures gracefully', async () => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
        pro_tier: 'premium',
      } as any)
      mockIsProAccount.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.TELEGRAM, destination: 'telegram-id', disabled: false },
        ],
      } as any)
      mockSendDm.mockRejectedValue(new Error('Telegram error'))

      await expect(
        notifyForOrUpdateNewMeeting(
          MeetingChangeType.CREATE,
          mockMeetingRequest
        )
      ).resolves.not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle empty participant list', async () => {
      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).not.toHaveBeenCalled()
    })

    it('should handle participant with empty notification types', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [],
      } as any)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle non-pro account for Discord notifications', async () => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
      } as any)
      mockIsProAccount.mockReturnValue(false)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockDmAccount).not.toHaveBeenCalled()
    })

    it('should handle participant acting with guest email', async () => {
      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            guest_email: 'guest@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'Guest User',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          guest_email: 'acting-guest@example.com',
          name: 'Acting Guest',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).not.toHaveBeenCalled()
    })

    it('should handle same participant acting and receiving notification', async () => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
        pro_tier: 'premium',
      } as any)
      mockIsProAccount.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'user1@example.com',
          name: 'User 1',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockDmAccount).not.toHaveBeenCalled()
    })
  })

  describe('timezone handling', () => {
    it('should handle different timezones for different participants', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
          {
            account_address: 'user2@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 2',
            slot_id: 'slot-2',
            status: ParticipationStatus.Accepted,
            timeZone: 'Europe/London',
            type: ParticipantType.Invitee,
          },
          {
            account_address: 'user3@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 3',
            slot_id: 'slot-3',
            status: ParticipationStatus.Accepted,
            timeZone: 'Asia/Tokyo',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalledTimes(3)
    })
  })

  describe('participation status handling', () => {
    beforeEach(() => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.EMAIL, destination: 'test@example.com', disabled: false },
        ],
      } as any)
      mockNewMeetingEmail.mockResolvedValue(true)
    })

    it('should handle Accepted status', async () => {
      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle Pending status', async () => {
      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Pending,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })

    it('should handle Rejected status', async () => {
      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Rejected,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalled()
    })
  })

  describe('notification message formatting', () => {
    beforeEach(() => {
      mockGetAccountFromDB.mockResolvedValue({
        preferences: { name: 'Test User', timezone: 'America/New_York' },
        pro_tier: 'premium',
      } as any)
      mockIsProAccount.mockReturnValue(true)
    })

    it('should send Discord notification with formatted message for CREATE', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)
      mockDmAccount.mockResolvedValue(true)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockDmAccount).toHaveBeenCalled()
    })

    it('should send Discord notification with formatted message for DELETE', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)
      mockDmAccount.mockResolvedValue(true)

      const cancelRequest: MeetingCancelSyncRequest = {
        meeting_id: 'meeting-123',
        timezone: 'America/New_York',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        title: 'Test Meeting',
        guestsToRemove: [],
        addressesToRemove: ['user1@example.com'],
        participantActing: {
          account_address: 'acting@example.com',
          name: 'Acting User',
        },
      }

      await notifyForMeetingCancellation(cancelRequest)

      expect(mockDmAccount).toHaveBeenCalled()
    })

    it('should not send notification for UPDATE without date change', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)
      mockDmAccount.mockResolvedValue(true)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.KEEP,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
        changes: undefined,
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.UPDATE, request)

      expect(mockDmAccount).not.toHaveBeenCalled()
    })

    it('should send Telegram notification with formatted message', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.TELEGRAM, destination: 'telegram-id', disabled: false },
        ],
      } as any)
      mockSendDm.mockResolvedValue(true)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Invitee,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockSendDm).toHaveBeenCalled()
    })

    it('should handle Scheduler participant type with guest list visibility', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)
      mockDmAccount.mockResolvedValue(true)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Scheduler,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockDmAccount).toHaveBeenCalled()
    })

    it('should handle Owner participant type with guest list visibility', async () => {
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: NotificationChannel.DISCORD, destination: 'discord-id', disabled: false },
        ],
      } as any)
      mockDmAccount.mockResolvedValue(true)

      const request: MeetingCreationSyncRequest = {
        meeting_id: 'meeting-123',
        title: 'Test Meeting',
        start: '2024-01-15T10:00:00Z',
        end: '2024-01-15T11:00:00Z',
        participants: [
          {
            account_address: 'user1@example.com',
            mappingType: ParticipantMappingType.ADD,
            meeting_id: 'meeting-123',
            name: 'User 1',
            slot_id: 'slot-1',
            status: ParticipationStatus.Accepted,
            timeZone: 'America/New_York',
            type: ParticipantType.Owner,
          },
        ],
        participantActing: {
          account_address: 'scheduler@example.com',
          name: 'Scheduler User',
        },
        timezone: 'America/New_York',
      }

      await notifyForOrUpdateNewMeeting(MeetingChangeType.CREATE, request)

      expect(mockDmAccount).toHaveBeenCalled()
    })
  })
})
