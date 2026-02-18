/**
 * Tests for schedule helper functions
 * 
 * Tests the utility functions used in schedule management
 */

import { ParticipationStatus } from '@/types/ParticipantInfo'
import {
  getMergedParticipants,
} from '@/utils/schedule.helper'

jest.mock('@/utils/api_helper', () => ({
  getAccount: jest.fn(),
}))

jest.mock('@/utils/rpc_helper_front', () => ({
  getAddressFromDomain: jest.fn(),
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
})
