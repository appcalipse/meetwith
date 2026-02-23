/**
 * Tests for schedule helper functions
 * 
 * Tests the utility functions used in schedule management
 */

import { ParticipationStatus, ParticipantType } from '@/types/ParticipantInfo'
import {
  getMergedParticipants,
  parseAccounts,
  mergeAvailabilityBlocks,
} from '@/utils/schedule.helper'
import { getAccount } from '@/utils/api_helper'
import { getAddressFromDomain } from '@/utils/rpc_helper_front'
import { parseMonthAvailabilitiesToDate } from '@/utils/date_helper'
import { mergeLuxonIntervals } from '@/utils/quickpoll_helper'

jest.mock('@/utils/api_helper', () => ({
  getAccount: jest.fn(),
}))

jest.mock('@/utils/rpc_helper_front', () => ({
  getAddressFromDomain: jest.fn(),
}))

jest.mock('@/utils/validations', () => ({
  isValidEVMAddress: jest.fn((addr: string) => /^0x[0-9a-fA-F]{40}$/.test(addr)),
  isValidEmail: jest.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
}))

jest.mock('@/utils/date_helper', () => ({
  parseMonthAvailabilitiesToDate: jest.fn(() => []),
}))

jest.mock('@/utils/quickpoll_helper', () => ({
  mergeLuxonIntervals: jest.fn((intervals: any[]) => intervals),
}))

describe('schedule.helper', () => {
  describe('getMergedParticipants', () => {
    it('should be defined', () => {
      expect(getMergedParticipants).toBeDefined()
    })

    it('should merge participants from groups', () => {
      const participants = [
        {
          id: 'group-1',
          type: 'group' as const,
        },
      ]

      const groups = [
        {
          id: 'group-1',
          name: 'Test Group',
          members: [
            {
              address: '0x123',
              displayName: 'User 1',
            },
          ],
        },
      ]

      const groupParticipants = {
        'group-1': ['0x123'],
      }

      const result = getMergedParticipants(
        participants,
        groups as any,
        groupParticipants
      )

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle empty participants', () => {
      const result = getMergedParticipants([], [], {})
      expect(result).toEqual([])
    })

    it('should deduplicate participants', () => {
      const participants = [
        {
          id: 'group-1',
          type: 'group' as const,
        },
        {
          id: 'group-2',
          type: 'group' as const,
        },
      ]

      const groups = [
        {
          id: 'group-1',
          name: 'Test Group 1',
          members: [
            {
              address: '0x123',
              displayName: 'User 1',
            },
          ],
        },
        {
          id: 'group-2',
          name: 'Test Group 2',
          members: [
            {
              address: '0x123', // Same address as group-1
              displayName: 'User 1',
            },
          ],
        },
      ]

      const groupParticipants = {
        'group-1': ['0x123'],
        'group-2': ['0x123'],
      }

      const result = getMergedParticipants(
        participants,
        groups as any,
        groupParticipants
      )

      // Should only have one instance of 0x123
      expect(result.length).toBeLessThanOrEqual(1)
    })
  })

  describe('parseAccounts', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should mark participant with valid EVM address as valid', async () => {
      const participants = [
        {
          account_address: '0x1234567890abcdef1234567890abcdef12345678',
          meeting_id: '',
          slot_id: '',
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await parseAccounts(participants)

      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].account_address).toBe('0x1234567890abcdef1234567890abcdef12345678')
      expect(result.invalid).toHaveLength(0)
    })

    it('should mark participant with valid email as valid', async () => {
      const participants = [
        {
          guest_email: 'test@example.com',
          meeting_id: '',
          slot_id: '',
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await parseAccounts(participants)

      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].guest_email).toBe('test@example.com')
      expect(result.invalid).toHaveLength(0)
    })

    it('should resolve domain name via getAddressFromDomain', async () => {
      ;(getAddressFromDomain as jest.Mock).mockResolvedValue('0xaabbccddee1234567890abcdef1234567890abcd')

      const participants = [
        {
          name: 'user.eth',
          meeting_id: '',
          slot_id: '',
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await parseAccounts(participants)

      expect(getAddressFromDomain).toHaveBeenCalledWith('user.eth')
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].account_address).toBe('0xaabbccddee1234567890abcdef1234567890abcd')
      expect(result.invalid).toHaveLength(0)
    })

    it('should fall back to getAccount if getAddressFromDomain returns null', async () => {
      ;(getAddressFromDomain as jest.Mock).mockResolvedValue(null)
      ;(getAccount as jest.Mock).mockResolvedValue({ address: '0xfedcba0987654321fedcba0987654321fedcba09' })

      const participants = [
        {
          name: 'someuser',
          meeting_id: '',
          slot_id: '',
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await parseAccounts(participants)

      expect(getAddressFromDomain).toHaveBeenCalledWith('someuser')
      expect(getAccount).toHaveBeenCalledWith('someuser')
      expect(result.valid).toHaveLength(1)
      expect(result.valid[0].account_address).toBe('0xfedcba0987654321fedcba0987654321fedcba09')
      expect(result.invalid).toHaveLength(0)
    })

    it('should mark as invalid when all resolution fails', async () => {
      ;(getAddressFromDomain as jest.Mock).mockResolvedValue(null)
      ;(getAccount as jest.Mock).mockRejectedValue(new Error('not found'))

      const participants = [
        {
          name: 'unknown-user',
          meeting_id: '',
          slot_id: '',
          status: ParticipationStatus.Pending,
          type: ParticipantType.Invitee,
        },
      ]

      const result = await parseAccounts(participants)

      expect(result.valid).toHaveLength(0)
      expect(result.invalid).toEqual(['unknown-user'])
    })

    it('should handle empty participants array', async () => {
      const result = await parseAccounts([])

      expect(result.valid).toEqual([])
      expect(result.invalid).toEqual([])
    })
  })

  describe('mergeAvailabilityBlocks', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    const monthStart = new Date('2024-01-01')
    const monthEnd = new Date('2024-01-31')

    it('should return empty array for empty blocks', () => {
      const result = mergeAvailabilityBlocks([], monthStart, monthEnd)
      expect(result).toEqual([])
    })

    it('should return empty array for null/undefined blocks', () => {
      const result = mergeAvailabilityBlocks(null as any, monthStart, monthEnd)
      expect(result).toEqual([])
    })

    it('should call parseMonthAvailabilitiesToDate for each block with weekly_availability', () => {
      const blocks = [
        {
          weekly_availability: [{ day: 1, start: '09:00', end: '17:00' }],
          timezone: 'America/New_York',
        },
        {
          weekly_availability: [{ day: 2, start: '10:00', end: '18:00' }],
          timezone: 'Europe/London',
        },
      ]

      mergeAvailabilityBlocks(blocks as any, monthStart, monthEnd)

      expect(parseMonthAvailabilitiesToDate).toHaveBeenCalledTimes(2)
      expect(parseMonthAvailabilitiesToDate).toHaveBeenCalledWith(
        blocks[0].weekly_availability, monthStart, monthEnd, 'America/New_York'
      )
      expect(parseMonthAvailabilitiesToDate).toHaveBeenCalledWith(
        blocks[1].weekly_availability, monthStart, monthEnd, 'Europe/London'
      )
      expect(mergeLuxonIntervals).toHaveBeenCalled()
    })

    it('should skip blocks with empty weekly_availability', () => {
      const blocks = [
        {
          weekly_availability: [],
          timezone: 'UTC',
        },
        {
          weekly_availability: [{ day: 1, start: '09:00', end: '17:00' }],
          timezone: 'UTC',
        },
      ]

      mergeAvailabilityBlocks(blocks as any, monthStart, monthEnd)

      expect(parseMonthAvailabilitiesToDate).toHaveBeenCalledTimes(1)
      expect(parseMonthAvailabilitiesToDate).toHaveBeenCalledWith(
        blocks[1].weekly_availability, monthStart, monthEnd, 'UTC'
      )
    })
  })
})
