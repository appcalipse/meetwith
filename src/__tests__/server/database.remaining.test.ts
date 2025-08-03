import { createClient } from '@supabase/supabase-js'

import { MeetingType } from '@/types/Account'
import {
  AccountNotifications,
  NotificationChannel,
} from '@/types/AccountNotifications'
import { AvailabilityBlock } from '@/types/availability'
import { SupportedChain } from '@/types/chains'
import { Subscription } from '@/types/Subscription'
import { SessionType } from '@/utils/constants/meeting-types'
import {
  createAvailabilityBlock,
  createMeetingType,
  deleteAvailabilityBlock,
  deleteMeetingType,
  duplicateAvailabilityBlock,
  getAccountNotificationSubscriptionEmail,
  getAccountNotificationSubscriptions,
  getAccountsNotificationSubscriptionEmails,
  getAccountsNotificationSubscriptions,
  getAvailabilityBlock,
  getAvailabilityBlocks,
  getExistingSubscriptionsByAddress,
  getExistingSubscriptionsByDomain,
  getMeetingTypeFromDB,
  getMeetingTypes,
  getMeetingTypesForAvailabilityBlock,
  getSubscription,
  getSubscriptionFromDBForAccount,
  isDefaultAvailabilityBlock,
  setAccountNotificationSubscriptions,
  updateAccountSubscriptions,
  updateAvailabilityBlock,
  updateMeetingType,
} from '@/utils/database'

// Mock Supabase
jest.mock('@supabase/supabase-js')

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  or: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  gt: jest.fn().mockReturnThis(),
  lt: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
}

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>
mockCreateClient.mockReturnValue(mockSupabaseClient as any)

describe('Database Remaining Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSupabaseClient.from.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.select.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.insert.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.update.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.delete.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.eq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.or.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.ilike.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.order.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.offset.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.single.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.in.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lte.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.gt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.lt.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.neq.mockReturnValue(mockSupabaseClient)
    mockSupabaseClient.is.mockReturnValue(mockSupabaseClient)
  })

  describe('getAccountNotificationSubscriptions', () => {
    const mockNotifications: AccountNotifications = {
      account_address: '0x1234567890123456789012345678901234567890',
      notification_types: [
        {
          channel: NotificationChannel.EMAIL,
          destination: 'test@example.com',
          disabled: false,
        },
      ],
    }

    it('should get account notification subscriptions successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { notifications: mockNotifications },
        error: null,
      })

      const result = await getAccountNotificationSubscriptions(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(result).toEqual(mockNotifications)
    })
  })

  describe('getAccountsNotificationSubscriptions', () => {
    const mockNotificationsArray: AccountNotifications[] = [
      {
        account_address: '0x1234567890123456789012345678901234567890',
        notification_types: [
          {
            channel: NotificationChannel.EMAIL,
            destination: 'test@example.com',
            disabled: false,
          },
        ],
      },
    ]

    it('should get accounts notification subscriptions successfully', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: mockNotificationsArray.map(n => ({ notifications: n })),
        error: null,
      })

      const result = await getAccountsNotificationSubscriptions([
        '0x1234567890123456789012345678901234567890',
      ])

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(result).toEqual(mockNotificationsArray)
    })
  })

  describe('getAccountNotificationSubscriptionEmail', () => {
    it('should get account notification subscription email successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { email: 'test@example.com' },
        error: null,
      })

      const result = await getAccountNotificationSubscriptionEmail(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(result).toBe('test@example.com')
    })
  })

  describe('getAccountsNotificationSubscriptionEmails', () => {
    it('should get accounts notification subscription emails successfully', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: [{ email: 'test@example.com' }],
        error: null,
      })

      const result = await getAccountsNotificationSubscriptionEmails([
        '0x1234567890123456789012345678901234567890',
      ])

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(result).toEqual(['test@example.com'])
    })
  })

  describe('setAccountNotificationSubscriptions', () => {
    const mockNotifications: AccountNotifications = {
      account_address: '0x1234567890123456789012345678901234567890',
      notification_types: [
        {
          channel: NotificationChannel.EMAIL,
          destination: 'test@example.com',
          disabled: false,
        },
      ],
    }

    it('should set account notification subscriptions successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ notifications: mockNotifications }],
        error: null,
      })

      const result = await setAccountNotificationSubscriptions(
        '0x1234567890123456789012345678901234567890',
        mockNotifications
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(result).toEqual(mockNotifications)
    })
  })

  describe('getMeetingTypes', () => {
    const mockMeetingTypes: MeetingType[] = [
      {
        id: 'meeting-type-1',
        slug: 'test-meeting',
        title: 'Test Meeting',
        type: SessionType.FREE,
        duration_minutes: 60,
        min_notice_minutes: 10,
        fixed_link: false,
        custom_link: undefined,
        account_owner_address: '0x1234567890123456789012345678901234567890',
        created_at: new Date(),
        updated_at: new Date(),
        availabilities: [],
        deleted_at: new Date(),
      },
    ]

    it('should get meeting types successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockMeetingTypes,
        error: null,
      })

      const result = await getMeetingTypes(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_types')
      expect(result).toEqual(mockMeetingTypes)
    })
  })

  describe('getMeetingTypesForAvailabilityBlock', () => {
    const mockMeetingTypes: MeetingType[] = [
      {
        id: 'meeting-type-1',
        title: 'Test Meeting',
        type: SessionType.FREE,
        duration_minutes: 60,
        min_notice_minutes: 10,
        fixed_link: false,
        custom_link: undefined,
        account_owner_address: '0x1234567890123456789012345678901234567890',
        created_at: new Date(),
        updated_at: new Date(),
        availabilities: [],
        deleted_at: new Date(),
      },
    ]

    it('should get meeting types for availability block successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockMeetingTypes,
        error: null,
      })

      const result = await getMeetingTypesForAvailabilityBlock(
        '0x1234567890123456789012345678901234567890',
        'block-1'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_types')
      expect(result).toEqual(mockMeetingTypes)
    })
  })

  describe('createMeetingType', () => {
    const mockMeetingType: MeetingType = {
      id: 'meeting-type-1',
      slug: 'test-meeting',
      title: 'Test Meeting',
      type: SessionType.FREE,
      duration_minutes: 60,
      min_notice_minutes: 10,
      fixed_link: false,
      custom_link: undefined,
      account_owner_address: '0x1234567890123456789012345678901234567890',
      created_at: new Date(),
      updated_at: new Date(),
      availabilities: [],
      deleted_at: new Date(),
    }

    it('should create meeting type successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [mockMeetingType],
        error: null,
      })

      const result = await createMeetingType(
        '0x1234567890123456789012345678901234567890',
        {
          title: 'Test Meeting',
          type: SessionType.FREE,
          duration_minutes: 60,
          min_notice_minutes: 10,
          fixed_link: false,
          custom_link: undefined,
          slug: 'test-meeting',
          availability_ids: [],
          calendars: [],
          plan: undefined,
          scheduleGate: undefined,
          meeting_platforms: [],
        }
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_types')
      expect(result).toEqual(mockMeetingType)
    })
  })

  describe('deleteMeetingType', () => {
    it('should delete meeting type successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'meeting-type-1' }],
        error: null,
      })

      await deleteMeetingType(
        '0x1234567890123456789012345678901234567890',
        'meeting-type-1'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_types')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('updateMeetingType', () => {
    const mockMeetingType: MeetingType = {
      id: 'meeting-type-1',
      slug: 'test-meeting',
      title: 'Updated Meeting',
      type: SessionType.FREE,
      duration_minutes: 60,
      min_notice_minutes: 10,
      fixed_link: false,
      custom_link: undefined,
      account_owner_address: '0x1234567890123456789012345678901234567890',
      created_at: new Date(),
      updated_at: new Date(),
      availabilities: [],
      plan: undefined,
      calendars: [],
      deleted_at: new Date(),
      scheduleGate: undefined,
      meeting_platforms: [],
    }

    it('should update meeting type successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [mockMeetingType],
        error: null,
      })

      const result = await updateMeetingType(
        '0x1234567890123456789012345678901234567890',
        'meeting-type-1',
        {
          title: 'Updated Meeting',
          duration_minutes: 60,
          min_notice_minutes: 10,
          fixed_link: false,
          custom_link: undefined,
          type: SessionType.FREE,
          plan: undefined,
          slug: 'test-meeting',
          availability_ids: [],
          calendars: [],
        }
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_types')
      expect(result).toEqual(mockMeetingType)
    })
  })

  describe('getMeetingTypeFromDB', () => {
    const mockMeetingType: MeetingType = {
      id: 'meeting-type-1',
      slug: 'test-meeting',
      title: 'Test Meeting',
      type: SessionType.FREE,
      duration_minutes: 60,
      min_notice_minutes: 10,
      fixed_link: false,
      custom_link: undefined,
      account_owner_address: '0x1234567890123456789012345678901234567890',
      created_at: new Date(),
      updated_at: new Date(),
      availabilities: [],
      plan: undefined,
      calendars: [],
      deleted_at: new Date(),
      scheduleGate: undefined,
      meeting_platforms: [],
    }

    it('should get meeting type from DB successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockMeetingType,
        error: null,
      })

      const result = await getMeetingTypeFromDB('meeting-type-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('meeting_types')
      expect(result).toEqual(mockMeetingType)
    })
  })

  describe('createAvailabilityBlock', () => {
    const mockAvailabilityBlock: AvailabilityBlock = {
      id: 'block-1',
      title: 'Test Block',
      timezone: 'UTC',
      weekly_availability: [],
      isDefault: false,
    }

    it('should create availability block successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [mockAvailabilityBlock],
        error: null,
      })

      const result = await createAvailabilityBlock(
        '0x1234567890123456789012345678901234567890',
        'Test Block',
        'UTC',
        [],
        false
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'availability_blocks'
      )
      expect(result).toEqual(mockAvailabilityBlock)
    })
  })

  describe('getAvailabilityBlock', () => {
    const mockAvailabilityBlock: AvailabilityBlock = {
      id: 'block-1',
      meetingTypes: [],
      title: 'Test Block',
      timezone: 'UTC',
      weekly_availability: [],
      isDefault: false,
    }

    it('should get availability block successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockAvailabilityBlock,
        error: null,
      })

      const result = await getAvailabilityBlock(
        'block-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'availability_blocks'
      )
      expect(result).toEqual(mockAvailabilityBlock)
    })
  })

  describe('updateAvailabilityBlock', () => {
    const mockAvailabilityBlock: AvailabilityBlock = {
      id: 'block-1',
      meetingTypes: [],
      title: 'Updated Block',
      timezone: 'UTC',
      weekly_availability: [],
      isDefault: false,
    }

    it('should update availability block successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [mockAvailabilityBlock],
        error: null,
      })

      const result = await updateAvailabilityBlock(
        'block-1',
        '0x1234567890123456789012345678901234567890',
        'Updated Block',
        'UTC',
        [],
        false
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'availability_blocks'
      )
      expect(result).toEqual(mockAvailabilityBlock)
    })
  })

  describe('deleteAvailabilityBlock', () => {
    it('should delete availability block successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'block-1' }],
        error: null,
      })

      await deleteAvailabilityBlock(
        'block-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'availability_blocks'
      )
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('duplicateAvailabilityBlock', () => {
    const mockAvailabilityBlock: AvailabilityBlock = {
      id: 'block-2',
      meetingTypes: [],
      title: 'Duplicated Block',
      timezone: 'UTC',
      weekly_availability: [],
      isDefault: false,
    }

    it('should duplicate availability block successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [mockAvailabilityBlock],
        error: null,
      })

      const result = await duplicateAvailabilityBlock(
        'block-1',
        '0x1234567890123456789012345678901234567890',
        {
          title: 'Duplicated Block',
        }
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'availability_blocks'
      )
      expect(result).toEqual(mockAvailabilityBlock)
    })
  })

  describe('isDefaultAvailabilityBlock', () => {
    it('should return true when block is default', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { is_default: true },
        error: null,
      })

      const result = await isDefaultAvailabilityBlock(
        'block-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(result).toBe(true)
    })

    it('should return false when block is not default', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: { is_default: false },
        error: null,
      })

      const result = await isDefaultAvailabilityBlock(
        'block-1',
        '0x1234567890123456789012345678901234567890'
      )

      expect(result).toBe(false)
    })
  })

  describe('getAvailabilityBlocks', () => {
    const mockAvailabilityBlocks: AvailabilityBlock[] = [
      {
        id: 'block-1',
        meetingTypes: [],
        title: 'Test Block',
        timezone: 'UTC',
        weekly_availability: [],
        isDefault: false,
      },
    ]

    it('should get availability blocks successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockAvailabilityBlocks,
        error: null,
      })

      const result = await getAvailabilityBlocks(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'availability_blocks'
      )
      expect(result).toEqual(mockAvailabilityBlocks)
    })
  })

  describe('getSubscriptionFromDBForAccount', () => {
    const mockSubscriptions: Subscription[] = [
      {
        domain: 'example.com',
        chain: SupportedChain.ETHEREUM,
        config_ipfs_hash: 'test',
        expiry_time: new Date(),
        owner_account: '0x1234567890123456789012345678901234567890',
        plan_id: 1,
        registered_at: new Date(),
      },
    ]

    it('should get subscription from DB for account successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      })

      const result = await getSubscriptionFromDBForAccount(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(result).toEqual(mockSubscriptions)
    })
  })

  describe('getSubscription', () => {
    const mockSubscription: Subscription = {
      domain: 'example.com',
      chain: SupportedChain.ETHEREUM,
      config_ipfs_hash: 'test',
      expiry_time: new Date(),
      owner_account: '0x1234567890123456789012345678901234567890',
      plan_id: 1,
      registered_at: new Date(),
    }

    it('should get subscription successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockSubscription,
        error: null,
      })

      const result = await getSubscription('example.com')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(result).toEqual(mockSubscription)
    })

    it('should return undefined when subscription not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await getSubscription('example.com')

      expect(result).toBeUndefined()
    })
  })

  describe('getExistingSubscriptionsByAddress', () => {
    const mockSubscriptions: Subscription[] = [
      {
        domain: 'example.com',
        chain: SupportedChain.ETHEREUM,
        config_ipfs_hash: 'test',
        expiry_time: new Date(),
        owner_account: '0x1234567890123456789012345678901234567890',
        plan_id: 1,
        registered_at: new Date(),
      },
    ]

    it('should get existing subscriptions by address successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      })

      const result = await getExistingSubscriptionsByAddress(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(result).toEqual(mockSubscriptions)
    })
  })

  describe('getExistingSubscriptionsByDomain', () => {
    const mockSubscriptions: Subscription[] = [
      {
        domain: 'example.com',
        chain: SupportedChain.ETHEREUM,
        config_ipfs_hash: 'test',
        expiry_time: new Date(),
        owner_account: '0x1234567890123456789012345678901234567890',
        plan_id: 1,
        registered_at: new Date(),
      },
    ]

    it('should get existing subscriptions by domain successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      })

      const result = await getExistingSubscriptionsByDomain('example.com')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(result).toEqual(mockSubscriptions)
    })
  })

  describe('updateAccountSubscriptions', () => {
    const mockSubscriptions: Subscription[] = [
      {
        domain: 'example.com',
        chain: SupportedChain.ETHEREUM,
        config_ipfs_hash: 'test',
        expiry_time: new Date(),
        owner_account: '0x1234567890123456789012345678901234567890',
        plan_id: 1,
        registered_at: new Date(),
      },
    ]

    it('should update account subscriptions successfully', async () => {
      mockSupabaseClient.upsert.mockResolvedValue({
        data: mockSubscriptions,
        error: null,
      })

      const result = await updateAccountSubscriptions(mockSubscriptions)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('subscriptions')
      expect(result).toEqual(mockSubscriptions)
    })
  })
})
