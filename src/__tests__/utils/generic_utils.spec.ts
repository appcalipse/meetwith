import { MeetingProvider } from '@/types/Meeting'
import { ParticipantType } from '@/types/ParticipantInfo'

import {
  parseUnits,
  formatUnits,
  generateTwitterUrl,
  generateTelegramUrl,
  getSlugFromText,
  shouldEnforceColorOnPath,
  isJson,
  renderProviderName,
  convertMinutes,
  extractQuery,
  formatCurrency,
  deduplicateArray,
  formatCountdown,
  deduplicateMembers,
  groupByFields,
  extractUrlFromText,
  isAccountSchedulerOrOwner,
  canAccountAccessPermission,
  zeroAddress,
} from '@/utils/generic_utils'
import { MeetingPermissions } from '@/utils/constants/schedule'

describe('Generic Utils', () => {
  describe('zeroAddress', () => {
    it('should be the correct zero address', () => {
      expect(zeroAddress).toBe('0x0000000000000000000000000000000000000000')
    })
  })

  describe('parseUnits', () => {
    it('should parse whole numbers correctly', () => {
      expect(parseUnits('1', 18)).toBe(BigInt('1000000000000000000'))
      expect(parseUnits('10', 18)).toBe(BigInt('10000000000000000000'))
    })

    it('should parse decimal numbers correctly', () => {
      expect(parseUnits('1.5', 18)).toBe(BigInt('1500000000000000000'))
      expect(parseUnits('0.1', 18)).toBe(BigInt('100000000000000000'))
    })

    it('should handle negative numbers', () => {
      expect(parseUnits('-1', 18)).toBe(BigInt('-1000000000000000000'))
      expect(parseUnits('-1.5', 18)).toBe(BigInt('-1500000000000000000'))
    })

    it('should handle zero decimals', () => {
      expect(parseUnits('5', 0)).toBe(BigInt('5'))
      expect(parseUnits('5.7', 0)).toBe(BigInt('6'))
    })

    it('should handle trimming trailing zeros', () => {
      expect(parseUnits('1.50000', 18)).toBe(BigInt('1500000000000000000'))
    })
  })

  describe('formatUnits', () => {
    it('should format whole numbers correctly', () => {
      expect(formatUnits(BigInt('1000000000000000000'), 18)).toBe('1')
      expect(formatUnits(BigInt('10000000000000000000'), 18)).toBe('10')
    })

    it('should format decimal numbers correctly', () => {
      expect(formatUnits(BigInt('1500000000000000000'), 18)).toBe('1.5')
      expect(formatUnits(BigInt('100000000000000000'), 18)).toBe('0.1')
    })

    it('should handle negative numbers', () => {
      expect(formatUnits(BigInt('-1000000000000000000'), 18)).toBe('-1')
      expect(formatUnits(BigInt('-1500000000000000000'), 18)).toBe('-1.5')
    })

    it('should remove trailing zeros', () => {
      expect(formatUnits(BigInt('1500000000000000000'), 18)).toBe('1.5')
    })
  })

  describe('generateTwitterUrl', () => {
    it('should handle @ prefix', () => {
      expect(generateTwitterUrl('@username')).toBe(
        'https://twitter.com/username'
      )
    })

    it('should handle http prefix', () => {
      expect(generateTwitterUrl('https://twitter.com/username')).toBe(
        'https://twitter.com/username'
      )
    })

    it('should handle plain username', () => {
      expect(generateTwitterUrl('username')).toBe(
        'https://twitter.com/username'
      )
    })
  })

  describe('generateTelegramUrl', () => {
    it('should handle @ prefix', () => {
      expect(generateTelegramUrl('@username')).toBe('https://t.me/username')
    })

    it('should handle http prefix', () => {
      expect(generateTelegramUrl('https://t.me/username')).toBe(
        'https://t.me/username'
      )
    })

    it('should handle plain username', () => {
      expect(generateTelegramUrl('username')).toBe('https://t.me/username')
    })
  })

  describe('getSlugFromText', () => {
    it('should convert text to lowercase slug', () => {
      expect(getSlugFromText('Hello World')).toBe('hello-world')
      expect(getSlugFromText('Test Title')).toBe('test-title')
    })

    it('should remove special characters', () => {
      expect(getSlugFromText('Hello! World?')).toBe('hello-world')
      expect(getSlugFromText('Test@Title#2024')).toBe('testtitle2024')
    })

    it('should handle multiple spaces', () => {
      expect(getSlugFromText('Hello   World')).toBe('hello-world')
    })
  })

  describe('shouldEnforceColorOnPath', () => {
    it('should return true for root path', () => {
      expect(shouldEnforceColorOnPath('/')).toBe(true)
    })

    it('should return true for features paths', () => {
      expect(shouldEnforceColorOnPath('/features/something')).toBe(true)
      expect(shouldEnforceColorOnPath('/features/')).toBe(true)
    })

    it('should return false for other paths', () => {
      expect(shouldEnforceColorOnPath('/about')).toBe(false)
      expect(shouldEnforceColorOnPath('/dashboard')).toBe(false)
    })
  })

  describe('isJson', () => {
    it('should return true for valid JSON strings', () => {
      expect(isJson('{}')).toBe(true)
      expect(isJson('{"key": "value"}')).toBe(true)
      expect(isJson('[]')).toBe(true)
      expect(isJson('[1, 2, 3]')).toBe(true)
      expect(isJson('null')).toBe(true)
      expect(isJson('true')).toBe(true)
      expect(isJson('123')).toBe(true)
    })

    it('should return false for invalid JSON strings', () => {
      expect(isJson('not json')).toBe(false)
      expect(isJson('{invalid}')).toBe(false)
      expect(isJson("{'key': 'value'}")).toBe(false)
      expect(isJson('{key: value}')).toBe(false)
    })
  })

  describe('renderProviderName', () => {
    it('should return correct provider names', () => {
      expect(renderProviderName(MeetingProvider.GOOGLE_MEET)).toBe(
        'Google Meet'
      )
      expect(renderProviderName(MeetingProvider.ZOOM)).toBe('Zoom')
      expect(renderProviderName(MeetingProvider.HUDDLE)).toBe('Huddle01')
      expect(renderProviderName(MeetingProvider.JITSI_MEET)).toBe('Jitsi Meet')
    })

    it('should return Custom for unknown provider', () => {
      expect(renderProviderName('UNKNOWN' as any)).toBe('Custom')
    })
  })

  describe('convertMinutes', () => {
    it('should return minutes for values less than 60', () => {
      expect(convertMinutes(30)).toEqual({
        amount: 30,
        isEmpty: false,
        type: 'minutes',
      })
      expect(convertMinutes(59)).toEqual({
        amount: 59,
        isEmpty: false,
        type: 'minutes',
      })
    })

    it('should return hours for values between 60 and 1440', () => {
      expect(convertMinutes(60)).toEqual({
        amount: 1,
        isEmpty: false,
        type: 'hours',
      })
      expect(convertMinutes(120)).toEqual({
        amount: 2,
        isEmpty: false,
        type: 'hours',
      })
    })

    it('should return days for values 1440 or more', () => {
      expect(convertMinutes(1440)).toEqual({
        amount: 1,
        isEmpty: false,
        type: 'days',
      })
      expect(convertMinutes(2880)).toEqual({
        amount: 2,
        isEmpty: false,
        type: 'days',
      })
    })
  })

  describe('extractQuery', () => {
    it('should extract string values from query', () => {
      const query = { key: 'value' }
      expect(extractQuery(query, 'key')).toBe('value')
    })

    it('should extract first value from array', () => {
      const query = { key: ['value1', 'value2'] }
      expect(extractQuery(query, 'key')).toBe('value1')
    })

    it('should return undefined for missing keys', () => {
      const query = { key: 'value' }
      expect(extractQuery(query, 'missing')).toBeUndefined()
    })

    it('should return undefined for "undefined" string', () => {
      const query = { key: 'undefined' }
      expect(extractQuery(query, 'key')).toBeUndefined()
    })

    it('should validate against valid values', () => {
      const query = { type: 'admin' }
      expect(extractQuery(query, 'type', ['admin', 'user'])).toBe('admin')
      expect(extractQuery(query, 'type', ['guest', 'viewer'])).toBeUndefined()
    })
  })

  describe('formatCurrency', () => {
    it('should format USD by default', () => {
      expect(formatCurrency(100)).toBe('$100')
      expect(formatCurrency(1000)).toBe('$1,000')
    })

    it('should handle decimal places', () => {
      expect(formatCurrency(99.99, 'USD', 2)).toBe('$99.99')
      expect(formatCurrency(100.5, 'USD', 2)).toBe('$100.50')
    })

    it('should handle different currencies', () => {
      expect(formatCurrency(100, 'EUR', 0)).toBe('€100')
      expect(formatCurrency(100, 'GBP', 0)).toBe('£100')
    })
  })

  describe('deduplicateArray', () => {
    it('should remove duplicates from array', () => {
      expect(deduplicateArray(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
      expect(deduplicateArray([1, 2, 1, 3, 2])).toEqual([1, 2, 3])
    })

    it('should filter out null and undefined', () => {
      expect(deduplicateArray(['a', null, 'b', undefined, 'a'])).toEqual([
        'a',
        'b',
      ])
    })

    it('should handle empty array', () => {
      expect(deduplicateArray([])).toEqual([])
    })
  })

  describe('formatCountdown', () => {
    it('should format seconds less than 60', () => {
      expect(formatCountdown(30)).toBe('30s')
      expect(formatCountdown(5)).toBe('5s')
    })

    it('should format minutes and seconds', () => {
      expect(formatCountdown(60)).toBe('1:00')
      expect(formatCountdown(90)).toBe('1:30')
      expect(formatCountdown(125)).toBe('2:05')
    })
  })

  describe('deduplicateMembers', () => {
    it('should deduplicate by address (case insensitive)', () => {
      const members = [
        { address: '0xABC', displayName: 'User1', userId: '1' },
        { address: '0xabc', displayName: 'User2', userId: '2' },
        { address: '0xDEF', displayName: 'User3', userId: '3' },
      ]

      const result = deduplicateMembers(members)
      expect(result).toHaveLength(2)
      expect(result[0].displayName).toBe('User1')
      expect(result[1].displayName).toBe('User3')
    })

    it('should deduplicate by userId when no address', () => {
      const members = [
        { userId: 'user1', displayName: 'User1' },
        { userId: 'user1', displayName: 'User2' },
        { userId: 'user2', displayName: 'User3' },
      ]

      const result = deduplicateMembers(members)
      expect(result).toHaveLength(2)
    })

    it('should handle mixed cases', () => {
      const members = [
        { address: '0xABC', displayName: 'User1', userId: '1' },
        { userId: 'user1', displayName: 'User2' },
        { displayName: 'User3' },
      ]

      const result = deduplicateMembers(members)
      expect(result).toHaveLength(3)
    })
  })

  describe('groupByFields', () => {
    it('should group items by specified fields', () => {
      const items = [
        { id: 1, name: 'A', type: 'X' },
        { id: 2, name: 'B', type: 'X' },
        { id: 3, name: 'A', type: 'Y' },
      ]

      const result = groupByFields(items, ['name'])
      expect(result).toHaveLength(2)
      expect(result.some(group => group.length === 2)).toBe(true)
    })

    it('should handle empty array', () => {
      const result = groupByFields([], ['name'])
      expect(result).toEqual([])
    })
  })

  describe('extractUrlFromText', () => {
    it('should extract valid meeting URLs', () => {
      expect(
        extractUrlFromText('Join at https://zoom.us/j/123456')
      ).toBe('https://zoom.us/j/123456')
      
      expect(
        extractUrlFromText('Meeting: https://meet.google.com/abc-def-ghi')
      ).toBe('https://meet.google.com/abc-def-ghi')
    })

    it('should clean trailing punctuation', () => {
      expect(
        extractUrlFromText('Join https://zoom.us/j/123456.')
      ).toBe('https://zoom.us/j/123456')
    })

    it('should return null for non-allowed domains', () => {
      expect(extractUrlFromText('https://example.com')).toBeNull()
    })

    it('should return null when no URL found', () => {
      expect(extractUrlFromText('No URL here')).toBeNull()
      expect(extractUrlFromText(null)).toBeNull()
      expect(extractUrlFromText(undefined)).toBeNull()
    })
  })

  describe('isAccountSchedulerOrOwner', () => {
    it('should return true for scheduler', () => {
      const participants = [
        { account_address: '0x123', type: ParticipantType.Scheduler },
      ]
      
      expect(isAccountSchedulerOrOwner(participants, '0x123')).toBe(true)
    })

    it('should return true for owner', () => {
      const participants = [
        { account_address: '0x123', type: ParticipantType.Owner },
      ]
      
      expect(isAccountSchedulerOrOwner(participants, '0x123')).toBe(true)
    })

    it('should return false for invitee', () => {
      const participants = [
        { account_address: '0x123', type: ParticipantType.Invitee },
      ]
      
      expect(isAccountSchedulerOrOwner(participants, '0x123')).toBe(false)
    })

    it('should return false when participant not found', () => {
      const participants = [
        { account_address: '0x123', type: ParticipantType.Owner },
      ]
      
      expect(isAccountSchedulerOrOwner(participants, '0x456')).toBe(false)
    })

    it('should handle role field instead of type', () => {
      const participants = [
        { account_address: '0x123', role: ParticipantType.Scheduler },
      ]
      
      expect(isAccountSchedulerOrOwner(participants, '0x123')).toBe(true)
    })
  })

  describe('canAccountAccessPermission', () => {
    it('should return true when permission is granted', () => {
      const permissions = [MeetingPermissions.SEE_GUEST_LIST]
      const participants = [
        { account_address: '0x123', type: ParticipantType.Invitee },
      ]
      
      expect(
        canAccountAccessPermission(
          permissions,
          participants,
          '0x123',
          MeetingPermissions.SEE_GUEST_LIST
        )
      ).toBe(true)
    })

    it('should return true for scheduler/owner regardless of permissions', () => {
      const permissions = []
      const participants = [
        { account_address: '0x123', type: ParticipantType.Owner },
      ]
      
      expect(
        canAccountAccessPermission(
          permissions,
          participants,
          '0x123',
          MeetingPermissions.EDIT_MEETING
        )
      ).toBe(true)
    })

    it('should return true when no permissions set (default allow)', () => {
      expect(
        canAccountAccessPermission(
          undefined,
          [],
          '0x123',
          MeetingPermissions.SEE_GUEST_LIST
        )
      ).toBe(true)
    })

    it('should handle array of permissions', () => {
      const permissions = [MeetingPermissions.SEE_GUEST_LIST]
      const participants = [
        { account_address: '0x123', type: ParticipantType.Invitee },
      ]
      
      expect(
        canAccountAccessPermission(permissions, participants, '0x123', [
          MeetingPermissions.SEE_GUEST_LIST,
          MeetingPermissions.EDIT_MEETING,
        ])
      ).toBe(true)
    })
  })
})
