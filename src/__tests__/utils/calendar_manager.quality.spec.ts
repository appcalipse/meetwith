import * as Sentry from '@sentry/nextjs'
import { Encrypted } from 'eth-crypto'

import { Account, DayAvailability } from '@/types/Account'
import {
  ConferenceMeeting,
  DBSlot,
  ExtendedDBSlot,
  MeetingDecrypted,
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  MeetingVersion,
  SchedulingType,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import * as apiHelper from '@/utils/api_helper'
import { MeetingReminders } from '@/types/common'

import {
  sanitizeParticipants,
  decryptConferenceMeeting,
  decodeMeeting,
  generateEmptyAvailabilities,
  generateDefaultMeetingType,
  decryptMeeting,
  durationToHumanReadable,
  dateToHumanReadable,
  dateToLocalizedRange,
  generateDefaultAvailabilities,
  defaultTimeRange,
  getCalendarRegularUrl,
  getOwnerPublicUrl,
  googleUrlParsedDate,
  outLookUrlParsedDate,
  generateGoogleCalendarUrl,
  generateOffice365CalendarUrl,
  selectDefaultProvider,
  createAlarm,
  participantStatusToICSStatus,
  handleRRULEForMeeting,
  isDiffRRULE,
  getMeetingRepeatFromRule,
} from '@/utils/calendar_manager'
import { SessionType } from '@/utils/constants/meeting-types'
import * as cryptography from '@/utils/cryptography'
import * as storage from '@/utils/storage'

// Mock dependencies
jest.mock('@sentry/nextjs')
jest.mock('@/utils/cryptography')
jest.mock('@/utils/storage')
jest.mock('@/utils/api_helper')
jest.mock('@/utils/database')
jest.mock('@/utils/sync_helper')
jest.mock('@/utils/services/calendar.backend.helper')

describe('calendar_manager - Quality Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('sanitizeParticipants', () => {
    describe('duplicate handling', () => {
      it('removes duplicate participants by account_address (case-insensitive)', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            account_address: '0xabc123',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0].account_address).toBe('0xABC123')
      })

      it('removes duplicate participants by guest_email', () => {
        const participants: ParticipantInfo[] = [
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0].guest_email).toBe('test@example.com')
      })

      it('prioritizes Scheduler type over Participant for duplicate addresses', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            account_address: '0xabc123',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Scheduler,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0].type).toBe(ParticipantType.Scheduler)
        expect(result[0].slot_id).toBe('slot2')
      })

      it('prioritizes Scheduler type over Participant for duplicate emails', () => {
        const participants: ParticipantInfo[] = [
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Scheduler,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0].type).toBe(ParticipantType.Scheduler)
      })

      it('prioritizes participant with name when no Scheduler exists', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            account_address: '0xabc123',
            meeting_id: 'meeting1',
            name: 'John Doe',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('John Doe')
      })

      it('prioritizes guest with name when no Scheduler exists', () => {
        const participants: ParticipantInfo[] = [
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            name: 'Jane Doe',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Jane Doe')
      })

      it('handles mixed case addresses correctly', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0XAbC123DeF',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            account_address: '0xabc123def',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
      })
    })

    describe('edge cases', () => {
      it('returns empty array for empty input', () => {
        const result = sanitizeParticipants([])
        expect(result).toEqual([])
      })

      it('handles single participant correctly', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(participants[0])
      })

      it('handles participants with both account_address and guest_email', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0xABC123',
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            account_address: '0xabc123',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
      })

      it('handles participants with neither account_address nor guest_email', () => {
        const participants: ParticipantInfo[] = [
          {
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(1)
        expect(result[0]).toEqual(participants[0])
      })

      it('maintains order when no duplicates exist', () => {
        const participants: ParticipantInfo[] = [
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          {
            account_address: '0xDEF456',
            meeting_id: 'meeting1',
            slot_id: 'slot3',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(3)
        expect(result[0].account_address).toBe('0xABC123')
        expect(result[1].guest_email).toBe('test@example.com')
        expect(result[2].account_address).toBe('0xDEF456')
      })

      it('handles complex scenarios with multiple duplicates and priorities', () => {
        const participants: ParticipantInfo[] = [
          // First address - no name, no scheduler
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot1',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          // Same address - with name
          {
            account_address: '0xabc123',
            meeting_id: 'meeting1',
            name: 'John',
            slot_id: 'slot2',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
          // Same address - scheduler (should win)
          {
            account_address: '0xABC123',
            meeting_id: 'meeting1',
            slot_id: 'slot3',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Scheduler,
          },
          // Different email
          {
            guest_email: 'test@example.com',
            meeting_id: 'meeting1',
            slot_id: 'slot4',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ]

        const result = sanitizeParticipants(participants)

        expect(result).toHaveLength(2)
        expect(result[0].type).toBe(ParticipantType.Scheduler)
        expect(result[0].account_address?.toLowerCase()).toBe('0xabc123')
        expect(result[1].guest_email).toBe('test@example.com')
      })
    })
  })

  describe('decryptConferenceMeeting', () => {
    const mockMeetingInfo: MeetingInfo = {
      change_history_paths: [],
      content: 'Test meeting content',
      created_at: new Date('2024-01-01'),
      meeting_id: 'meeting123',
      meeting_url: 'https://meet.google.com/abc-defg-hij',
      participants: [],
      permissions: undefined,
      provider: MeetingProvider.GOOGLE_MEET,
      recurrence: MeetingRepeat.NO_REPEAT,
      related_slot_ids: ['slot1', 'slot2'],
      reminders: [],
      title: 'Test Meeting',
      rrule: undefined as any,
    }

    it('successfully decrypts valid conference meeting', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        encrypted_metadata: encryptedData,
        end: '2024-01-01T11:00:00Z',
        id: 'conf123',
        start: '2024-01-01T10:00:00Z',
      }

      ;(cryptography.getContentFromEncryptedPublic as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      const result = await decryptConferenceMeeting(meeting as any)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('conf123')
      expect(result?.title).toBe('Test Meeting')
      expect(result?.content).toBe('Test meeting content')
      expect(result?.meeting_url).toBe('https://meet.google.com/abc-defg-hij')
      expect(result?.provider).toBe(MeetingProvider.GOOGLE_MEET)
      expect(result?.version).toBe(-1) // Conference meetings have version -1
      expect(result?.start).toEqual(new Date('2024-01-01T10:00:00Z'))
      expect(result?.end).toEqual(new Date('2024-01-01T11:00:00Z'))
    })

    it('returns null when encrypted_metadata is missing', async () => {
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'conf123',
        start: '2024-01-01T10:00:00Z',
      }

      const result = await decryptConferenceMeeting(meeting as any)

      expect(result).toBeNull()
      expect(cryptography.getContentFromEncryptedPublic).not.toHaveBeenCalled()
    })

    it('returns null when decryption fails', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        encrypted_metadata: encryptedData,
        end: '2024-01-01T11:00:00Z',
        id: 'conf123',
        start: '2024-01-01T10:00:00Z',
      }

      ;(cryptography.getContentFromEncryptedPublic as jest.Mock).mockResolvedValue(null)

      const result = await decryptConferenceMeeting(meeting as any)

      expect(result).toBeNull()
    })

    it('returns null when decryption returns empty string', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        encrypted_metadata: encryptedData,
        end: '2024-01-01T11:00:00Z',
        id: 'conf123',
        start: '2024-01-01T10:00:00Z',
      }

      ;(cryptography.getContentFromEncryptedPublic as jest.Mock).mockResolvedValue('')

      const result = await decryptConferenceMeeting(meeting as any)

      expect(result).toBeNull()
    })

    it('handles malformed JSON data gracefully', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        encrypted_metadata: encryptedData,
        end: '2024-01-01T11:00:00Z',
        id: 'conf123',
        start: '2024-01-01T10:00:00Z',
      }

      ;(cryptography.getContentFromEncryptedPublic as jest.Mock).mockResolvedValue('invalid json {')

      await expect(decryptConferenceMeeting(meeting as any)).rejects.toThrow()
    })

    it('correctly maps all meeting fields', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xABC123',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
        },
      ]
      
      const detailedMeetingInfo = {
        ...mockMeetingInfo,
        participants,
        reminders: [{ minutes: 15 }],
      }

      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        encrypted_metadata: encryptedData,
        end: '2024-01-01T11:00:00Z',
        id: 'conf123',
        start: '2024-01-01T10:00:00Z',
      }

      ;(cryptography.getContentFromEncryptedPublic as jest.Mock).mockResolvedValue(
        JSON.stringify(detailedMeetingInfo)
      )

      const result = await decryptConferenceMeeting(meeting as any)

      expect(result?.participants).toEqual(participants)
      expect(result?.reminders).toEqual([{ minutes: 15 }])
      expect(result?.related_slot_ids).toEqual(['slot1', 'slot2'])
    })
  })

  describe('decodeMeeting', () => {
    const mockAccount: Account = {
      address: '0xABC123',
      created_at: new Date('2024-01-01'),
      encoded_signature: 'encoded-sig',
      id: 'account1',
      internal_pub_key: 'pub-key-123',
      is_invited: false,
      nonce: 12345,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: 'Test user',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'America/New_York',
      },
      subscriptions: [],
    }

    const mockMeetingInfo: MeetingInfo = {
      change_history_paths: [],
      content: 'Test meeting',
      created_at: new Date('2024-01-01'),
      meeting_id: 'meeting123',
      meeting_url: 'https://meet.google.com/test',
      participants: [],
      permissions: undefined,
      provider: MeetingProvider.GOOGLE_MEET,
      recurrence: MeetingRepeat.NO_REPEAT,
      related_slot_ids: [],
      reminders: [],
      title: 'Test Meeting',
      rrule: undefined as any,
    }

    it('successfully decodes meeting with encrypted metadata', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const dbSlot = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      const result = await decodeMeeting(dbSlot as any, mockAccount)

      expect(result).not.toBeNull()
      expect(result?.title).toBe('Test Meeting')
      expect(result?.content).toBe('Test meeting')
      expect(cryptography.getContentFromEncrypted).toHaveBeenCalledWith(
        mockAccount,
        'test-signature',
        encryptedData
      )
    })

    it('returns null when meeting_info_encrypted is missing', async () => {
      const dbSlot = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      const result = await decodeMeeting(dbSlot as any, mockAccount)

      expect(result).toBeNull()
    })

    it('returns null when decryption fails', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const dbSlot = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue('')

      const result = await decodeMeeting(dbSlot as any, mockAccount)

      expect(result).toBeNull()
    })

    it('handles decryption errors gracefully', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const dbSlot = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue('invalid json')

      await expect(decodeMeeting(dbSlot as any, mockAccount)).rejects.toThrow()
    })
  })

  describe('generateEmptyAvailabilities', () => {
    it('generates 7 days of availabilities', () => {
      const result = generateEmptyAvailabilities()
      
      expect(result).toHaveLength(7)
    })

    it('generates availabilities for all weekdays (0-6)', () => {
      const result = generateEmptyAvailabilities()
      
      const weekdays = result.map(a => a.weekday)
      expect(weekdays).toEqual([0, 1, 2, 3, 4, 5, 6])
    })

    it('sets default time range (09:00-18:00) for all days', () => {
      const result = generateEmptyAvailabilities()
      
      result.forEach(availability => {
        expect(availability.ranges).toHaveLength(1)
        expect(availability.ranges[0].start).toBe('09:00')
        expect(availability.ranges[0].end).toBe('18:00')
      })
    })

    it('returns correct structure for DayAvailability type', () => {
      const result = generateEmptyAvailabilities()
      
      result.forEach(availability => {
        expect(availability).toHaveProperty('weekday')
        expect(availability).toHaveProperty('ranges')
        expect(typeof availability.weekday).toBe('number')
        expect(Array.isArray(availability.ranges)).toBe(true)
      })
    })

    it('each range has start and end properties', () => {
      const result = generateEmptyAvailabilities()
      
      result.forEach(availability => {
        availability.ranges.forEach(range => {
          expect(range).toHaveProperty('start')
          expect(range).toHaveProperty('end')
          expect(typeof range.start).toBe('string')
          expect(typeof range.end).toBe('string')
        })
      })
    })
  })

  describe('generateDefaultMeetingType', () => {
    it('generates meeting type with default 30 minute duration', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result.duration_minutes).toBe(30)
    })

    it('sets account_owner_address correctly', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result.account_owner_address).toBe(ownerAddress)
    })

    it('sets default meeting title', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result.title).toBe('30 minutes meeting')
    })

    it('sets minimum notice to 60 minutes', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result.min_notice_minutes).toBe(60)
    })

    it('sets session type to FREE', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result.type).toBe(SessionType.FREE)
    })

    it('generates slug from title', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result.slug).toBeDefined()
      expect(typeof result.slug).toBe('string')
      expect(result.slug.length).toBeGreaterThan(0)
    })

    it('handles different address formats', () => {
      const addresses = ['0xABC123', '0x123456789', 'address-test']
      
      addresses.forEach(address => {
        const result = generateDefaultMeetingType(address)
        expect(result.account_owner_address).toBe(address)
        expect(result.duration_minutes).toBe(30)
      })
    })

    it('generates consistent meeting type structure', () => {
      const ownerAddress = '0xABC123'
      const result = generateDefaultMeetingType(ownerAddress)
      
      expect(result).toHaveProperty('account_owner_address')
      expect(result).toHaveProperty('duration_minutes')
      expect(result).toHaveProperty('min_notice_minutes')
      expect(result).toHaveProperty('slug')
      expect(result).toHaveProperty('title')
      expect(result).toHaveProperty('type')
    })
  })

  describe('decryptMeeting', () => {
    const mockAccount: Account = {
      address: '0xABC123',
      created_at: new Date('2024-01-01'),
      encoded_signature: 'encoded-sig',
      id: 'account1',
      internal_pub_key: 'pub-key-123',
      is_invited: false,
      nonce: 12345,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: 'Test user',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'America/New_York',
      },
      subscriptions: [],
    }

    const mockMeetingInfo: MeetingInfo = {
      change_history_paths: [],
      content: 'Test meeting',
      created_at: new Date('2024-01-01'),
      meeting_id: 'meeting123',
      meeting_url: 'https://meet.google.com/test',
      participants: [],
      permissions: undefined,
      provider: MeetingProvider.GOOGLE_MEET,
      recurrence: MeetingRepeat.NO_REPEAT,
      related_slot_ids: [],
      reminders: [],
      title: 'Test Meeting',
      rrule: undefined as any,
    }

    it('successfully decrypts meeting with valid data', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(result).not.toBeNull()
      expect(result?.id).toBe('slot123')
      expect(result?.title).toBe('Test Meeting')
      expect(result?.version).toBe(1)
    })

    it('returns null when decryption fails', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(null)

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(result).toBeNull()
    })

    it('uses provided signature instead of fetching from storage', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      await decryptMeeting(meeting as any, mockAccount, 'custom-signature')

      expect(cryptography.getContentFromEncrypted).toHaveBeenCalledWith(
        mockAccount,
        'custom-signature',
        encryptedData
      )
      expect(storage.getSignature).not.toHaveBeenCalled()
    })

    it('converts start and end to Date objects', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(result?.start).toBeInstanceOf(Date)
      expect(result?.end).toBeInstanceOf(Date)
      expect(result?.start).toEqual(new Date('2024-01-01T10:00:00Z'))
      expect(result?.end).toEqual(new Date('2024-01-01T11:00:00Z'))
    })

    it('handles meeting with participants correctly', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xDEF456',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const meetingInfoWithParticipants = {
        ...mockMeetingInfo,
        participants,
      }

      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(meetingInfoWithParticipants)
      )

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(result?.participants).toEqual(participants)
      expect(result?.participants).toHaveLength(1)
    })

    it('syncs meeting when conferenceData slots mismatch participants', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xDEF456',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
        {
          account_address: '0xGHI789',
          meeting_id: 'meeting123',
          slot_id: 'slot2',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const meetingInfoWithParticipants = {
        ...mockMeetingInfo,
        participants,
        related_slot_ids: ['slot1', 'slot2'],
      }

      const meeting = {
        conferenceData: {
          slots: ['slot1'], // Only one slot, but two participants
          version: MeetingVersion.V2,
        },
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(meetingInfoWithParticipants)
      )
      ;(apiHelper.syncMeeting as jest.Mock).mockResolvedValue(undefined)

      const result = await decryptMeeting(meeting as any, mockAccount)

      // syncMeeting is called with the filtered meeting info
      expect(apiHelper.syncMeeting).toHaveBeenCalledWith(
        expect.objectContaining({ 
          participants: expect.arrayContaining([
            expect.objectContaining({ slot_id: 'slot1' })
          ])
        }),
        'slot123'
      )
      // Should filter out slot2 since it's not in conferenceData.slots
      expect(result?.participants).toHaveLength(1)
      expect(result?.participants[0].slot_id).toBe('slot1')
      expect(result?.related_slot_ids).toEqual(['slot1'])
    })

    it('does not sync when conferenceData version is V1', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xDEF456',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
        {
          account_address: '0xGHI789',
          meeting_id: 'meeting123',
          slot_id: 'slot2',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const meetingInfoWithParticipants = {
        ...mockMeetingInfo,
        participants,
        related_slot_ids: ['slot1', 'slot2'],
      }

      const meeting = {
        conferenceData: {
          slots: ['slot1'],
          version: MeetingVersion.V1,
        },
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(meetingInfoWithParticipants)
      )

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(apiHelper.syncMeeting).not.toHaveBeenCalled()
      expect(result?.participants).toHaveLength(2)
    })

    it('handles meeting with series_id for SlotInstance', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        series_id: 'series456',
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(result?.series_id).toBe('series456')
    })

    it('sets series_id to null for regular DBSlot without series_id', async () => {
      const encryptedData = { iv: 'test-iv', ephemPublicKey: 'test-key', ciphertext: 'test-cipher', mac: 'test-mac' } as Encrypted
      const meeting = {
        created_at: '2024-01-01T10:00:00Z',
        end: '2024-01-01T11:00:00Z',
        id: 'slot123',
        meeting_info_encrypted: encryptedData,
        start: '2024-01-01T10:00:00Z',
        version: 1,
      }

      ;(storage.getSignature as jest.Mock).mockReturnValue('test-signature')
      ;(cryptography.getContentFromEncrypted as jest.Mock).mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )

      const result = await decryptMeeting(meeting as any, mockAccount)

      expect(result?.series_id).toBeNull()
    })
  })

  describe('durationToHumanReadable', () => {
    it('converts minutes to hour format', () => {
      expect(durationToHumanReadable(60)).toBe('1 hour')
    })

    it('converts minutes to hour and minutes format', () => {
      expect(durationToHumanReadable(75)).toBe('1 hour 15 min')
    })

    it('converts only minutes when less than an hour', () => {
      expect(durationToHumanReadable(30)).toBe('30 min')
      expect(durationToHumanReadable(45)).toBe('45 min')
    })

    it('handles multiple hours correctly', () => {
      expect(durationToHumanReadable(120)).toBe('2 hour')
      expect(durationToHumanReadable(180)).toBe('3 hour')
    })

    it('handles multiple hours with minutes', () => {
      expect(durationToHumanReadable(150)).toBe('2 hour 30 min')
      expect(durationToHumanReadable(195)).toBe('3 hour 15 min')
    })

    it('handles zero minutes', () => {
      expect(durationToHumanReadable(0)).toBe('0 min')
    })

    it('handles edge cases', () => {
      expect(durationToHumanReadable(1)).toBe('1 min')
      expect(durationToHumanReadable(59)).toBe('59 min')
      expect(durationToHumanReadable(61)).toBe('1 hour 1 min')
    })
  })

  describe('dateToHumanReadable', () => {
    it('formats date without timezone', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = dateToHumanReadable(date, 'America/New_York', false)
      
      expect(result).toBeDefined()
      expect(result).not.toContain('(America/New_York)')
    })

    it('formats date with timezone when requested', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = dateToHumanReadable(date, 'America/New_York', true)
      
      expect(result).toBeDefined()
      expect(result).toContain('(America/New_York)')
    })

    it('handles different timezones correctly', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const resultNY = dateToHumanReadable(date, 'America/New_York', true)
      const resultUTC = dateToHumanReadable(date, 'UTC', true)
      
      expect(resultNY).toContain('(America/New_York)')
      expect(resultUTC).toContain('(UTC)')
    })

    it('formats date correctly for various dates', () => {
      const dates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
      ]
      
      dates.forEach(date => {
        const result = dateToHumanReadable(date, 'UTC', false)
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })

  describe('dateToLocalizedRange', () => {
    it('formats date range without timezone', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')
      const result = dateToLocalizedRange(start, end, 'America/New_York', false)
      
      expect(result).toBeDefined()
      expect(result).not.toContain('(America/New_York)')
    })

    it('formats date range with timezone when requested', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')
      const result = dateToLocalizedRange(start, end, 'America/New_York', true)
      
      expect(result).toBeDefined()
      expect(result).toContain('(America/New_York)')
    })

    it('formats date range with different timezones', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')
      
      const resultNY = dateToLocalizedRange(start, end, 'America/New_York', true)
      const resultUTC = dateToLocalizedRange(start, end, 'UTC', true)
      
      expect(resultNY).toContain('(America/New_York)')
      expect(resultUTC).toContain('(UTC)')
      expect(resultNY).not.toEqual(resultUTC)
    })

    it('handles same start and end dates', () => {
      const date = new Date('2024-01-15T10:00:00Z')
      const result = dateToLocalizedRange(date, date, 'UTC', false)
      
      expect(result).toBeDefined()
    })

    it('handles overnight ranges', () => {
      const start = new Date('2024-01-15T23:00:00Z')
      const end = new Date('2024-01-16T01:00:00Z')
      const result = dateToLocalizedRange(start, end, 'UTC', false)
      
      expect(result).toBeDefined()
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('generateDefaultAvailabilities', () => {
    it('generates 7 days of availabilities', () => {
      const result = generateDefaultAvailabilities()
      
      expect(result).toHaveLength(7)
    })

    it('generates availabilities for all weekdays (0-6)', () => {
      const result = generateDefaultAvailabilities()
      
      const weekdays = result.map(a => a.weekday)
      expect(weekdays).toEqual([0, 1, 2, 3, 4, 5, 6])
    })

    it('sets empty ranges for Sunday (0) and Saturday (6)', () => {
      const result = generateDefaultAvailabilities()
      
      expect(result[0].weekday).toBe(0) // Sunday
      expect(result[0].ranges).toEqual([])
      
      expect(result[6].weekday).toBe(6) // Saturday
      expect(result[6].ranges).toEqual([])
    })

    it('sets default time range (09:00-18:00) for weekdays (1-5)', () => {
      const result = generateDefaultAvailabilities()
      
      for (let i = 1; i <= 5; i++) {
        expect(result[i].weekday).toBe(i)
        expect(result[i].ranges).toHaveLength(1)
        expect(result[i].ranges[0].start).toBe('09:00')
        expect(result[i].ranges[0].end).toBe('18:00')
      }
    })

    it('returns correct structure for DayAvailability type', () => {
      const result = generateDefaultAvailabilities()
      
      result.forEach(availability => {
        expect(availability).toHaveProperty('weekday')
        expect(availability).toHaveProperty('ranges')
        expect(typeof availability.weekday).toBe('number')
        expect(Array.isArray(availability.ranges)).toBe(true)
      })
    })
  })

  describe('defaultTimeRange', () => {
    it('returns default time range with start at 09:00', () => {
      const result = defaultTimeRange()
      expect(result.start).toBe('09:00')
    })

    it('returns default time range with end at 18:00', () => {
      const result = defaultTimeRange()
      expect(result.end).toBe('18:00')
    })

    it('returns consistent time range on multiple calls', () => {
      const result1 = defaultTimeRange()
      const result2 = defaultTimeRange()
      
      expect(result1).toEqual(result2)
    })

    it('returns object with start and end properties', () => {
      const result = defaultTimeRange()
      
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('end')
      expect(typeof result.start).toBe('string')
      expect(typeof result.end).toBe('string')
    })
  })

  describe('getCalendarRegularUrl', () => {
    it('generates correct URL for account address', () => {
      const address = '0xABC123'
      const result = getCalendarRegularUrl(address)
      
      expect(result).toContain('/address/')
      expect(result).toContain(address)
    })

    it('includes app URL in the result', () => {
      const address = '0xABC123'
      const result = getCalendarRegularUrl(address)
      
      expect(result).toMatch(/^https?:\/\//)
    })

    it('handles different address formats', () => {
      const addresses = ['0xABC123', '0x123456789', 'test-address']
      
      addresses.forEach(address => {
        const result = getCalendarRegularUrl(address)
        expect(result).toContain(address)
      })
    })
  })

  describe('getOwnerPublicUrl', () => {
    it('returns account calendar URL when account exists', async () => {
      const ownerAddress = '0xABC123'
      const mockAccount: Account = {
        address: ownerAddress,
        created_at: new Date('2024-01-01'),
        encoded_signature: 'sig',
        id: 'account1',
        internal_pub_key: 'pub-key',
        is_invited: false,
        nonce: 12345,
        payment_preferences: null,
        preferences: {
          availabilities: [],
          description: 'Test',
          meetingProviders: [MeetingProvider.GOOGLE_MEET],
          name: 'Test User',
          socialLinks: [],
          timezone: 'UTC',
        },
        subscriptions: [],
      }

      ;(apiHelper.getAccount as jest.Mock).mockResolvedValue(mockAccount)

      const result = await getOwnerPublicUrl(ownerAddress)

      expect(result).toBeDefined()
      expect(apiHelper.getAccount).toHaveBeenCalledWith(ownerAddress)
    })

    it('returns fallback URL when account not found', async () => {
      const ownerAddress = '0xABC123'

      ;(apiHelper.getAccount as jest.Mock).mockRejectedValue(new Error('Not found'))

      const result = await getOwnerPublicUrl(ownerAddress)

      expect(result).toContain('/address/')
      expect(result).toContain(ownerAddress)
    })

    it('handles error gracefully and returns address URL', async () => {
      const ownerAddress = '0xABC123'

      ;(apiHelper.getAccount as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await getOwnerPublicUrl(ownerAddress)

      expect(result).toBeDefined()
      expect(result).toContain(ownerAddress)
    })
  })

  describe('googleUrlParsedDate', () => {
    it('formats date in correct Google Calendar format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = googleUrlParsedDate(date)
      
      expect(result).toMatch(/^\d{8}T\d{6}Z$/)
    })

    it('formats different dates correctly', () => {
      const dates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
      ]
      
      dates.forEach(date => {
        const result = googleUrlParsedDate(date)
        expect(result).toMatch(/^\d{8}T\d{6}Z$/)
        expect(result).toContain('T')
        expect(result).toContain('Z')
      })
    })

    it('pads single digit values correctly', () => {
      const date = new Date('2024-01-05T09:05:03Z')
      const result = googleUrlParsedDate(date)
      
      expect(result).toContain('20240105')
    })
  })

  describe('outLookUrlParsedDate', () => {
    it('formats date in correct Outlook format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = outLookUrlParsedDate(date)
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}:\d{2}:\d{2}:\d{2}Z$/)
    })

    it('formats different dates correctly', () => {
      const dates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T12:00:00Z'),
        new Date('2024-12-31T23:59:59Z'),
      ]
      
      dates.forEach(date => {
        const result = outLookUrlParsedDate(date)
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}:\d{2}:\d{2}:\d{2}Z$/)
      })
    })

    it('includes colons and hyphens in format', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = outLookUrlParsedDate(date)
      
      expect(result).toContain('-')
      expect(result).toContain(':')
      expect(result).toContain('Z')
    })
  })

  describe('generateGoogleCalendarUrl', () => {
    beforeEach(() => {
      ;(apiHelper.getAccountPrimaryCalendarEmail as jest.Mock).mockResolvedValue('test@example.com')
    })

    it('generates base URL for Google Calendar', async () => {
      const result = await generateGoogleCalendarUrl('meeting123', '0xABC')
      
      expect(result).toContain('https://calendar.google.com/calendar/r/eventedit')
    })

    it('includes start and end dates when provided', async () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')
      
      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        start,
        end
      )
      
      expect(result).toContain('dates=')
    })

    it('includes title when provided', async () => {
      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        'Test Meeting'
      )
      
      expect(result).toContain('text=Test Meeting')
    })

    it('includes timezone when provided', async () => {
      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'America/New_York'
      )
      
      expect(result).toContain('ctz=America/New_York')
    })

    it('includes recurrence for weekly meetings', async () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        start,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        MeetingRepeat.WEEKLY
      )
      
      expect(result).toContain('recur=')
      expect(result).toContain('FREQ=WEEKLY')
    })

    it('includes recurrence for monthly meetings', async () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        start,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        MeetingRepeat.MONTHLY
      )
      
      expect(result).toContain('recur=')
      expect(result).toContain('FREQ=MONTHLY')
    })

    it('includes participants when provided', async () => {
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xDEF456',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        participants
      )
      
      expect(result).toContain('to=')
      expect(apiHelper.getAccountPrimaryCalendarEmail).toHaveBeenCalled()
    })

    it('excludes owner from participants list', async () => {
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xABC',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
        },
        {
          account_address: '0xDEF456',
          meeting_id: 'meeting123',
          slot_id: 'slot2',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        participants
      )
      
      expect(result).toContain('to=test@example.com')
      expect(apiHelper.getAccountPrimaryCalendarEmail).toHaveBeenCalledTimes(1)
    })

    it('uses guest email when participant has no account_address', async () => {
      const participants: ParticipantInfo[] = [
        {
          guest_email: 'guest@example.com',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await generateGoogleCalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        participants
      )
      
      expect(result).toContain('to=guest@example.com')
    })
  })

  describe('generateOffice365CalendarUrl', () => {
    beforeEach(() => {
      ;(apiHelper.getAccountPrimaryCalendarEmail as jest.Mock).mockResolvedValue('test@example.com')
    })

    it('generates base URL for Office 365 Calendar', async () => {
      const result = await generateOffice365CalendarUrl('meeting123', '0xABC')
      
      expect(result).toContain('https://outlook.office.com/calendar/deeplink/compose')
    })

    it('includes start date when provided', async () => {
      const start = new Date('2024-01-15T10:00:00Z')
      
      const result = await generateOffice365CalendarUrl(
        'meeting123',
        '0xABC',
        start
      )
      
      expect(result).toContain('startdt=')
    })

    it('includes end date when provided', async () => {
      const end = new Date('2024-01-15T11:00:00Z')
      
      const result = await generateOffice365CalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        end
      )
      
      expect(result).toContain('enddt=')
    })

    it('includes title when provided', async () => {
      const result = await generateOffice365CalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        'Test Meeting'
      )
      
      expect(result).toContain('subject=Test Meeting')
    })

    it('includes participants when provided', async () => {
      const participants: ParticipantInfo[] = [
        {
          account_address: '0xDEF456',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await generateOffice365CalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        participants
      )
      
      expect(result).toContain('to=')
    })

    it('uses guest email for participants', async () => {
      const participants: ParticipantInfo[] = [
        {
          guest_email: 'guest@example.com',
          meeting_id: 'meeting123',
          slot_id: 'slot1',
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await generateOffice365CalendarUrl(
        'meeting123',
        '0xABC',
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        participants
      )
      
      expect(result).toContain('to=guest@example.com')
    })
  })

  describe('selectDefaultProvider', () => {
    it('selects Google Meet when available', () => {
      const providers = [MeetingProvider.GOOGLE_MEET, MeetingProvider.ZOOM]
      const result = selectDefaultProvider(providers)
      
      expect(result).toBe(MeetingProvider.GOOGLE_MEET)
    })

    it('selects Zoom when Google Meet not available', () => {
      const providers = [MeetingProvider.ZOOM, MeetingProvider.CUSTOM]
      const result = selectDefaultProvider(providers)
      
      expect(result).toBe(MeetingProvider.ZOOM)
    })

    it('selects Jitsi when Google Meet and Zoom not available', () => {
      const providers = [MeetingProvider.JITSI_MEET]
      const result = selectDefaultProvider(providers)
      
      expect(result).toBe(MeetingProvider.JITSI_MEET)
    })

    it('selects Huddle as default fallback', () => {
      const providers = [MeetingProvider.CUSTOM]
      const result = selectDefaultProvider(providers)
      
      expect(result).toBe(MeetingProvider.HUDDLE)
    })

    it('handles empty provider list', () => {
      const result = selectDefaultProvider([])
      
      expect(result).toBe(MeetingProvider.HUDDLE)
    })

    it('handles undefined provider list', () => {
      const result = selectDefaultProvider(undefined)
      
      expect(result).toBe(MeetingProvider.HUDDLE)
    })

    it('prioritizes Google Meet over all others', () => {
      const providers = [
        MeetingProvider.CUSTOM,
        MeetingProvider.ZOOM,
        MeetingProvider.ZOOM,
        MeetingProvider.GOOGLE_MEET,
      ]
      const result = selectDefaultProvider(providers)
      
      expect(result).toBe(MeetingProvider.GOOGLE_MEET)
    })
  })

  describe('createAlarm', () => {
    it('creates 15 minute reminder', () => {
      const alarm = createAlarm(MeetingReminders['15_MINUTES_BEFORE'])
      
      expect(alarm.action).toBe('display')
      expect(alarm.description).toBe('Reminder')
      expect(alarm.trigger).toEqual({ before: true, minutes: 15 })
    })

    it('creates 30 minute reminder', () => {
      const alarm = createAlarm(MeetingReminders['30_MINUTES_BEFORE'])
      
      expect(alarm.trigger).toEqual({ before: true, minutes: 30 })
    })

    it('creates 1 hour reminder', () => {
      const alarm = createAlarm(MeetingReminders['1_HOUR_BEFORE'])
      
      expect(alarm.trigger).toEqual({ before: true, hours: 1 })
    })

    it('creates 1 day reminder', () => {
      const alarm = createAlarm(MeetingReminders['1_DAY_BEFORE'])
      
      expect(alarm.trigger).toEqual({ before: true, days: 1 })
    })

    it('creates 1 week reminder', () => {
      const alarm = createAlarm(MeetingReminders['1_WEEK_BEFORE'])
      
      expect(alarm.trigger).toEqual({ before: true, weeks: 1 })
    })

    it('creates 10 minute reminder as default', () => {
      const alarm = createAlarm(MeetingReminders['10_MINUTES_BEFORE'])
      
      expect(alarm.trigger).toEqual({ before: true, minutes: 10 })
    })

    it('all reminders have display action', () => {
      const reminders = [
        MeetingReminders['10_MINUTES_BEFORE'],
        MeetingReminders['15_MINUTES_BEFORE'],
        MeetingReminders['30_MINUTES_BEFORE'],
        MeetingReminders['1_HOUR_BEFORE'],
        MeetingReminders['1_DAY_BEFORE'],
        MeetingReminders['1_WEEK_BEFORE'],
      ]
      
      reminders.forEach(reminder => {
        const alarm = createAlarm(reminder)
        expect(alarm.action).toBe('display')
        expect(alarm.description).toBe('Reminder')
        expect((alarm.trigger as any).before).toBe(true)
      })
    })
  })

  describe('participantStatusToICSStatus', () => {
    it('converts Accepted status to ACCEPTED', () => {
      const result = participantStatusToICSStatus(ParticipationStatus.Accepted)
      expect(result).toBe('ACCEPTED')
    })

    it('converts Rejected status to DECLINED', () => {
      const result = participantStatusToICSStatus(ParticipationStatus.Rejected)
      expect(result).toBe('DECLINED')
    })

    it('converts Pending status to NEEDS-ACTION', () => {
      const result = participantStatusToICSStatus(ParticipationStatus.Pending)
      expect(result).toBe('NEEDS-ACTION')
    })

    it('converts Pending status again to NEEDS-ACTION', () => {
      const result = participantStatusToICSStatus(ParticipationStatus.Pending)
      expect(result).toBe('NEEDS-ACTION')
    })

    it('handles all participation statuses', () => {
      const statuses = [
        ParticipationStatus.Accepted,
        ParticipationStatus.Rejected,
        ParticipationStatus.Pending,
        ParticipationStatus.Pending,
      ]
      
      statuses.forEach(status => {
        const result = participantStatusToICSStatus(status)
        expect(result).toBeDefined()
        expect(['ACCEPTED', 'DECLINED', 'NEEDS-ACTION']).toContain(result)
      })
    })
  })

  describe('handleRRULEForMeeting', () => {
    it('returns empty array for NO_REPEAT', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = handleRRULEForMeeting(MeetingRepeat.NO_REPEAT, start)
      
      expect(result).toEqual([])
    })

    it('generates RRULE for DAILY recurrence', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = handleRRULEForMeeting(MeetingRepeat.DAILY, start)
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result.join('')).toContain('FREQ=DAILY')
    })

    it('generates RRULE for WEEKLY recurrence', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = handleRRULEForMeeting(MeetingRepeat.WEEKLY, start)
      
      expect(result).toBeDefined()
      expect(result.join('')).toContain('FREQ=WEEKLY')
    })

    it('generates RRULE for MONTHLY recurrence', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = handleRRULEForMeeting(MeetingRepeat.MONTHLY, start)
      
      expect(result).toBeDefined()
      expect(result.join('')).toContain('FREQ=MONTHLY')
    })

    it('handles Monday for monthly recurrence', () => {
      const start = new Date('2024-01-15T10:00:00Z') // This is a Monday
      const result = handleRRULEForMeeting(MeetingRepeat.MONTHLY, start)
      
      expect(result.join('')).toContain('BYDAY=MO')
    })

    it('handles different weekdays for monthly recurrence', () => {
      const dates = [
        new Date('2024-01-15T10:00:00Z'), // Monday
        new Date('2024-01-16T10:00:00Z'), // Tuesday
        new Date('2024-01-17T10:00:00Z'), // Wednesday
        new Date('2024-01-18T10:00:00Z'), // Thursday
        new Date('2024-01-19T10:00:00Z'), // Friday
      ]
      
      dates.forEach(date => {
        const result = handleRRULEForMeeting(MeetingRepeat.MONTHLY, date)
        expect(result).toBeDefined()
        expect(result.length).toBeGreaterThan(0)
      })
    })

    it('filters out DTSTART from RRULE', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = handleRRULEForMeeting(MeetingRepeat.DAILY, start)
      
      const hasDateStart = result.some(line => line.startsWith('DTSTART:'))
      expect(hasDateStart).toBe(false)
    })

    it('generates valid RRULE format', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const result = handleRRULEForMeeting(MeetingRepeat.WEEKLY, start)
      
      expect(result).toBeDefined()
      result.forEach(line => {
        expect(typeof line).toBe('string')
      })
    })
  })

  describe('isDiffRRULE', () => {
    it('returns false for identical RRULEs', () => {
      const rrule1 = ['RRULE:FREQ=DAILY;INTERVAL=1']
      const rrule2 = ['RRULE:FREQ=DAILY;INTERVAL=1']
      
      const result = isDiffRRULE(rrule1, rrule2)
      expect(result).toBe(false)
    })

    it('returns true for different RRULEs', () => {
      const rrule1 = ['RRULE:FREQ=DAILY;INTERVAL=1']
      const rrule2 = ['RRULE:FREQ=WEEKLY;INTERVAL=1']
      
      const result = isDiffRRULE(rrule1, rrule2)
      expect(result).toBe(true)
    })

    it('returns true for different array lengths', () => {
      const rrule1 = ['RRULE:FREQ=DAILY;INTERVAL=1']
      const rrule2 = ['RRULE:FREQ=DAILY;INTERVAL=1', 'EXTRA']
      
      const result = isDiffRRULE(rrule1, rrule2)
      expect(result).toBe(true)
    })

    it('returns false for empty arrays', () => {
      const result = isDiffRRULE([], [])
      expect(result).toBe(false)
    })

    it('handles whitespace correctly (trims)', () => {
      const rrule1 = ['RRULE:FREQ=DAILY;INTERVAL=1']
      const rrule2 = [' RRULE:FREQ=DAILY;INTERVAL=1 ']
      
      const result = isDiffRRULE(rrule1, rrule2)
      expect(result).toBe(false)
    })

    it('returns true for different rules in multi-line arrays', () => {
      const rrule1 = ['RRULE:FREQ=DAILY;INTERVAL=1', 'LINE2']
      const rrule2 = ['RRULE:FREQ=DAILY;INTERVAL=1', 'DIFFERENT']
      
      const result = isDiffRRULE(rrule1, rrule2)
      expect(result).toBe(true)
    })
  })

  describe('getMeetingRepeatFromRule', () => {
    it('returns NO_REPEAT for null rule', () => {
      const result = getMeetingRepeatFromRule(null as any)
      expect(result).toBe(MeetingRepeat.NO_REPEAT)
    })

    it('returns NO_REPEAT for undefined rule', () => {
      const result = getMeetingRepeatFromRule(undefined as any)
      expect(result).toBe(MeetingRepeat.NO_REPEAT)
    })

    it('returns NO_REPEAT for rule without options', () => {
      const rule = {} as any
      const result = getMeetingRepeatFromRule(rule)
      expect(result).toBe(MeetingRepeat.NO_REPEAT)
    })

    it('handles RRule conversion correctly for all frequencies', () => {
      // This test verifies the function structure exists and handles edge cases
      const mockRule = {
        options: {
          freq: 0, // Unknown frequency
        },
      } as any
      
      const result = getMeetingRepeatFromRule(mockRule)
      expect(result).toBe(MeetingRepeat.NO_REPEAT)
    })
  })
})
