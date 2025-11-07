import { createClient } from '@supabase/supabase-js'

import { ConditionRelation } from '@/types/common'
import {
  DBSlot,
  ExtendedDBSlot,
  GroupMeetingType,
  MeetingDecrypted,
  MeetingProvider,
  MeetingRepeat,
  ParticipantMappingType,
  SchedulingType,
  TimeSlotSource,
} from '@/types/Meeting'
import {
  ParticipantBaseInfo,
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import { MeetingCreationRequest, MeetingUpdateRequest } from '@/types/Requests'
import {
  deleteMeetingFromDB,
  getConferenceDataBySlotId,
  getConferenceMeetingFromDB,
  getMeetingFromDB,
  getMeetingsFromDB,
  getSlotsByIds,
  getSlotsForAccount,
  getSlotsForAccountMinimal,
  getSlotsForDashboard,
  handleGuestCancel,
  handleMeetingCancelSync,
  isSlotAvailable,
  saveMeeting,
  updateAllRecurringSlots,
  updateMeeting,
  updateRecurringSlots,
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
}

const mockCreateClient = createClient as jest.MockedFunction<
  typeof createClient
>
mockCreateClient.mockReturnValue(mockSupabaseClient as any)

describe('Database Meeting Functions', () => {
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

  describe('getSlotsForAccount', () => {
    const mockSlots: DBSlot[] = [
      {
        id: 'slot-1',
        account_address: '0x1234567890123456789012345678901234567890',
        start: new Date('2023-01-01T10:00:00Z'),
        end: new Date('2023-01-01T11:00:00Z'),
        created_at: new Date(),
        version: 1,
        meeting_info_encrypted: {
          iv: 'test',
          ephemPublicKey: 'test',
          ciphertext: 'test',
          mac: 'test',
        },
        recurrence: MeetingRepeat.NO_REPEAT,
      },
    ]

    it('should get slots for account successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      const result = await getSlotsForAccount(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockSlots)
    })

    it('should get slots with date range', async () => {
      const start = new Date('2023-01-01T00:00:00Z')
      const end = new Date('2023-01-31T23:59:59Z')
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      await getSlotsForAccount(
        '0x1234567890123456789012345678901234567890',
        start,
        end
      )

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith(
        'start',
        start.toISOString()
      )
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith(
        'end',
        end.toISOString()
      )
    })

    it('should get slots with limit and offset', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      await getSlotsForAccount(
        '0x1234567890123456789012345678901234567890',
        undefined,
        undefined,
        10,
        5
      )

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10)
      expect(mockSupabaseClient.offset).toHaveBeenCalledWith(5)
    })

    it('should handle database error', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        getSlotsForAccount('0x1234567890123456789012345678901234567890')
      ).rejects.toThrow('Database error')
    })
  })

  describe('getSlotsForAccountMinimal', () => {
    const mockSlots: DBSlot[] = [
      {
        id: 'slot-1',
        account_address: '0x1234567890123456789012345678901234567890',
        start: new Date('2023-01-01T10:00:00Z'),
        end: new Date('2023-01-01T11:00:00Z'),
        created_at: new Date(),
        version: 1,
        meeting_info_encrypted: {
          iv: 'test',
          ephemPublicKey: 'test',
          ciphertext: 'test',
          mac: 'test',
        },
        recurrence: MeetingRepeat.NO_REPEAT,
      },
    ]

    it('should get minimal slots for account successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      const result = await getSlotsForAccountMinimal(
        '0x1234567890123456789012345678901234567890'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith(
        'id,account_address,start,end,meeting_type_id,created_at,updated_at'
      )
      expect(result).toEqual(mockSlots)
    })
  })

  describe('updateRecurringSlots', () => {
    it('should update recurring slots successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'slot-1' }],
        error: null,
      })

      await updateRecurringSlots('slot-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('updateAllRecurringSlots', () => {
    it('should update all recurring slots successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'slot-1' }],
        error: null,
      })

      await updateAllRecurringSlots()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('getSlotsForDashboard', () => {
    const mockExtendedSlots: ExtendedDBSlot[] = [
      {
        id: 'slot-1',
        account_address: '0x1234567890123456789012345678901234567890',
        start: new Date('2023-01-01T10:00:00Z'),
        end: new Date('2023-01-01T11:00:00Z'),
        created_at: new Date(),
        version: 1,
        meeting_info_encrypted: {
          iv: 'test',
          ephemPublicKey: 'test',
          ciphertext: 'test',
          mac: 'test',
        },
        recurrence: MeetingRepeat.NO_REPEAT,
      },
    ]

    it('should get slots for dashboard successfully', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: mockExtendedSlots,
        error: null,
      })

      const result = await getSlotsForDashboard(
        '0x1234567890123456789012345678901234567890',
        new Date('2023-01-31T23:59:59Z'),
        10,
        5
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(result).toEqual(mockExtendedSlots)
    })
  })

  describe('getSlotsByIds', () => {
    const mockSlots: DBSlot[] = [
      {
        id: 'slot-1',
        account_address: '0x1234567890123456789012345678901234567890',
        start: new Date('2023-01-01T10:00:00Z'),
        end: new Date('2023-01-01T11:00:00Z'),
        created_at: new Date(),
        version: 1,
        meeting_info_encrypted: {
          iv: 'test',
          ephemPublicKey: 'test',
          ciphertext: 'test',
          mac: 'test',
        },
        recurrence: MeetingRepeat.NO_REPEAT,
      },
    ]

    it('should get slots by IDs successfully', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      const result = await getSlotsByIds(['slot-1', 'slot-2'])

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('id', [
        'slot-1',
        'slot-2',
      ])
      expect(result).toEqual(mockSlots)
    })
  })

  describe('isSlotAvailable', () => {
    it('should return true when slot is available', async () => {
      mockSupabaseClient.neq.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await isSlotAvailable(
        '0x1234567890123456789012345678901234567890',
        new Date('2023-01-01T10:00:00Z'),
        new Date('2023-01-01T11:00:00Z'),
        'meeting-type-1'
      )

      expect(result).toBe(true)
    })

    it('should return false when slot is not available', async () => {
      mockSupabaseClient.neq.mockResolvedValue({
        data: [{ id: 'existing-slot' }],
        error: null,
      })

      const result = await isSlotAvailable(
        '0x1234567890123456789012345678901234567890',
        new Date('2023-01-01T10:00:00Z'),
        new Date('2023-01-01T11:00:00Z'),
        'meeting-type-1'
      )

      expect(result).toBe(false)
    })

    it('should exclude transaction hash when provided', async () => {
      mockSupabaseClient.neq.mockResolvedValue({
        data: [],
        error: null,
      })

      await isSlotAvailable(
        '0x1234567890123456789012345678901234567890',
        new Date('2023-01-01T10:00:00Z'),
        new Date('2023-01-01T11:00:00Z'),
        'meeting-type-1',
        '0xtxhash'
      )

      expect(mockSupabaseClient.neq).toHaveBeenCalledWith('tx_hash', '0xtxhash')
    })
  })

  describe('getMeetingFromDB', () => {
    const mockSlot: DBSlot = {
      id: 'slot-1',
      account_address: '0x1234567890123456789012345678901234567890',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      created_at: new Date(),
      version: 1,
      meeting_info_encrypted: {
        iv: 'test',
        ephemPublicKey: 'test',
        ciphertext: 'test',
        mac: 'test',
      },
      recurrence: MeetingRepeat.NO_REPEAT,
    }

    it('should get meeting from DB successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockSlot,
        error: null,
      })

      const result = await getMeetingFromDB('slot-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockSlot)
    })

    it('should handle database error', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getMeetingFromDB('slot-1')).rejects.toThrow('Database error')
    })
  })

  describe('getConferenceMeetingFromDB', () => {
    const mockConferenceMeeting = {
      id: 'conference-1',
      slot_id: 'slot-1',
      meeting_url: 'https://meet.google.com/test',
      created_at: new Date(),
    }

    it('should get conference meeting from DB successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockConferenceMeeting,
        error: null,
      })

      const result = await getConferenceMeetingFromDB('conference-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'conference_meetings'
      )
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockConferenceMeeting)
    })
  })

  describe('getMeetingsFromDB', () => {
    const mockSlots: DBSlot[] = [
      {
        id: 'slot-1',
        account_address: '0x1234567890123456789012345678901234567890',
        start: new Date('2023-01-01T10:00:00Z'),
        end: new Date('2023-01-01T11:00:00Z'),
        created_at: new Date(),
        version: 1,
        meeting_info_encrypted: {
          iv: 'test',
          ephemPublicKey: 'test',
          ciphertext: 'test',
          mac: 'test',
        },
        recurrence: MeetingRepeat.NO_REPEAT,
      },
    ]

    it('should get meetings from DB successfully', async () => {
      mockSupabaseClient.in.mockResolvedValue({
        data: mockSlots,
        error: null,
      })

      const result = await getMeetingsFromDB(['slot-1', 'slot-2'])

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('id', [
        'slot-1',
        'slot-2',
      ])
      expect(result).toEqual(mockSlots)
    })
  })

  describe('getConferenceDataBySlotId', () => {
    const mockConferenceMeeting = {
      id: 'conference-1',
      slot_id: 'slot-1',
      meeting_url: 'https://meet.google.com/test',
      created_at: new Date(),
    }

    it('should get conference data by slot ID successfully', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: mockConferenceMeeting,
        error: null,
      })

      const result = await getConferenceDataBySlotId('slot-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith(
        'conference_meetings'
      )
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockConferenceMeeting)
    })
  })

  describe('handleGuestCancel', () => {
    it('should handle guest cancel successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'slot-1' }],
        error: null,
      })

      await handleGuestCancel('metadata', 'slot-1', 'UTC', 'Cancelled')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('handleMeetingCancelSync', () => {
    const mockDecryptedMeetingData: MeetingDecrypted = {
      id: 'meeting-1',
      meeting_id: 'meeting-1',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      created_at: new Date('2023-01-01T09:00:00Z'),
      title: 'Test Meeting',
      content: 'Test content',
      participants: [
        {
          account_address: '0x1234567890123456789012345678901234567890',
          slot_id: 'slot-1',
          type: ParticipantType.Scheduler,
          name: 'Test User',
          meeting_id: 'meeting-1',
          status: ParticipationStatus.Accepted,
        },
      ],
      meeting_info_encrypted: {
        iv: 'test',
        ephemPublicKey: 'test',
        ciphertext: 'test',
        mac: 'test',
      },
      version: 1,
      meeting_url: 'https://meet.google.com/test',
      related_slot_ids: ['slot-1'],
    }

    it('should handle meeting cancel sync successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [{ id: 'slot-1' }],
        error: null,
      })

      await handleMeetingCancelSync(mockDecryptedMeetingData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
    })
  })

  describe('deleteMeetingFromDB', () => {
    const mockParticipantActing: ParticipantBaseInfo = {
      account_address: '0x1234567890123456789012345678901234567890',
      name: 'Test User',
      guest_email: 'test@example.com',
    }

    const mockGuestsToRemove: ParticipantInfo[] = [
      {
        account_address: '0x1234567890123456789012345678901234567890',
        name: 'Guest User',
        guest_email: 'guest@example.com',
        type: ParticipantType.Invitee,
        status: ParticipationStatus.Accepted,
        meeting_id: 'meeting-1',
      },
    ]

    it('should delete meeting from DB successfully', async () => {
      mockSupabaseClient.delete.mockResolvedValue({
        data: [{ id: 'slot-1' }],
        error: null,
      })

      await deleteMeetingFromDB(
        mockParticipantActing,
        ['slot-1'],
        mockGuestsToRemove,
        'meeting-1',
        'UTC',
        'Cancelled',
        'Test Meeting'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
    })
  })

  describe('saveMeeting', () => {
    const mockParticipantActing: ParticipantBaseInfo = {
      account_address: '0x1234567890123456789012345678901234567890',
      name: 'Test User',
      guest_email: 'test@example.com',
    }

    const mockMeeting: MeetingCreationRequest = {
      title: 'Test Meeting',
      content: 'Test content',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      participants_mapping: [],
      meetingTypeId: 'meeting-type-1',
      meeting_url: 'https://meet.google.com/test',
      meeting_id: 'meeting-1',
      meetingReminders: [],
      meetingRepeat: MeetingRepeat.NO_REPEAT,
      type: SchedulingType.REGULAR,
      meetingProvider: MeetingProvider.GOOGLE_MEET,
      meetingPermissions: [],
      ignoreOwnerAvailability: false,
      txHash: null,
    }

    const mockSlot: DBSlot = {
      id: 'slot-1',
      account_address: '0x1234567890123456789012345678901234567890',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      created_at: new Date(),
      version: 1,
      meeting_info_encrypted: {
        iv: 'test',
        ephemPublicKey: 'test',
        ciphertext: 'test',
        mac: 'test',
      },
      recurrence: MeetingRepeat.NO_REPEAT,
    }

    it('should save meeting successfully', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: [mockSlot],
        error: null,
      })

      const result = await saveMeeting(mockParticipantActing, mockMeeting)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.insert).toHaveBeenCalled()
      expect(result).toEqual(mockSlot)
    })

    it('should handle database error', async () => {
      mockSupabaseClient.insert.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        saveMeeting(mockParticipantActing, mockMeeting)
      ).rejects.toThrow('Database error')
    })
  })

  describe('updateMeeting', () => {
    const mockParticipantActing: ParticipantBaseInfo = {
      account_address: '0x1234567890123456789012345678901234567890',
      name: 'Test User',
      guest_email: 'test@example.com',
    }

    const mockMeetingUpdate: MeetingUpdateRequest = {
      meeting_id: 'meeting-1',
      title: 'Updated Meeting',
      content: 'Updated content',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      participants_mapping: [
        {
          account_address: '0x1234567890123456789012345678901234567890',
          name: 'Participant',
          guest_email: 'participant@example.com',
          type: ParticipantType.Invitee,
          status: ParticipationStatus.Accepted,
          meeting_id: 'meeting-1',
          privateInfo: {
            iv: 'test',
            ephemPublicKey: 'test',
            ciphertext: 'test',
            mac: 'test',
          },
          privateInfoHash: 'test',
          timeZone: 'UTC',
          mappingType: ParticipantMappingType.ADD,
        },
      ],
      slotsToRemove: [],
      guestsToRemove: [],
      version: 1,
      meetingProvider: MeetingProvider.GOOGLE_MEET,
      meetingReminders: [],
      meetingRepeat: MeetingRepeat.NO_REPEAT,
      meetingPermissions: [],
      ignoreOwnerAvailability: false,
      txHash: null,
      type: SchedulingType.REGULAR,
      meetingTypeId: 'meeting-type-1',
      meeting_url: 'https://meet.google.com/test',
    }

    const mockSlot: DBSlot = {
      id: 'slot-1',
      account_address: '0x1234567890123456789012345678901234567890',
      start: new Date('2023-01-01T10:00:00Z'),
      end: new Date('2023-01-01T11:00:00Z'),
      created_at: new Date(),
      version: 1,
      meeting_info_encrypted: {
        iv: 'test',
        ephemPublicKey: 'test',
        ciphertext: 'test',
        mac: 'test',
      },
      recurrence: MeetingRepeat.NO_REPEAT,
    }

    it('should update meeting successfully', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: [mockSlot],
        error: null,
      })

      const result = await updateMeeting(
        mockParticipantActing,
        mockMeetingUpdate
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('slots')
      expect(mockSupabaseClient.update).toHaveBeenCalled()
      expect(result).toEqual(mockSlot)
    })

    it('should handle database error', async () => {
      mockSupabaseClient.update.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(
        updateMeeting(mockParticipantActing, mockMeetingUpdate)
      ).rejects.toThrow('Database error')
    })
  })
})
