jest.mock('dom-parser', () => ({
  parseFromString: jest.fn((html: string) => {
    // Simple mock parser that extracts text from <p> tags
    const pMatches = html.match(/<p[^>]*>(.*?)<\/p>/gi) || []
    const paragraphs = pMatches.map(match => ({
      textContent: match.replace(/<[^>]+>/g, ''),
    }))
    return {
      getElementsByTagName: (tag: string) => {
        if (tag === 'p') return paragraphs
        return []
      },
    }
  }),
}))

jest.mock('@/utils/calendar_manager', () => ({
  noNoReplyEmailForAccount: jest.fn(
    (name: string) => `${name}@meetwith.xyz`
  ),
}))

jest.mock('@/utils/user_manager', () => ({
  getAllParticipantsDisplayName: jest.fn(() => 'User A, User B'),
  thirdWebClient: {},
}))

import { ParticipationStatus } from '@/types/ParticipantInfo'
import { CalendarServiceHelper } from '@/utils/services/calendar.helper'

describe('CalendarServiceHelper', () => {
  describe('sanitizeEmail', () => {
    it('should remove plus-addressing from email', () => {
      expect(CalendarServiceHelper.sanitizeEmail('user+tag@example.com')).toBe(
        'user@example.com'
      )
    })

    it('should not modify email without plus-addressing', () => {
      expect(CalendarServiceHelper.sanitizeEmail('user@example.com')).toBe(
        'user@example.com'
      )
    })
  })

  describe('isHtml', () => {
    it('should return true for HTML string', () => {
      expect(CalendarServiceHelper.isHtml('<p>Hello</p>')).toBe(true)
    })

    it('should return true for HTML with div', () => {
      expect(CalendarServiceHelper.isHtml('<div>Content</div>')).toBe(true)
    })

    it('should return false for plain text', () => {
      expect(CalendarServiceHelper.isHtml('Hello world')).toBe(false)
    })
  })

  describe('plainTextToHtml', () => {
    it('should convert newlines to br tags', () => {
      expect(CalendarServiceHelper.plainTextToHtml('Line 1\nLine 2')).toBe(
        'Line 1<br>Line 2'
      )
    })

    it('should wrap double-newline-separated text in paragraphs', () => {
      const result = CalendarServiceHelper.plainTextToHtml('Para 1\n\nPara 2')
      expect(result).toContain('<p>Para 1</p>')
      expect(result).toContain('<p>Para 2</p>')
    })

    it('should convert URLs to links', () => {
      const result = CalendarServiceHelper.plainTextToHtml(
        'Visit https://example.com today'
      )
      expect(result).toContain('<a href="https://example.com"')
      expect(result).toContain('target="_blank"')
    })

    it('should return empty string for empty input', () => {
      expect(CalendarServiceHelper.plainTextToHtml('')).toBe('')
    })
  })

  describe('convertHtmlToPlainText', () => {
    it('should return plain text as-is', () => {
      expect(
        CalendarServiceHelper.convertHtmlToPlainText('Hello world')
      ).toBe('Hello world')
    })

    it('should extract text from HTML paragraphs', () => {
      const result = CalendarServiceHelper.convertHtmlToPlainText(
        '<p>Hello</p><p>World</p>'
      )
      expect(result).toContain('Hello')
      expect(result).toContain('World')
    })
  })

  describe('getMeetingTitle', () => {
    it('should return provided title when given', () => {
      const result = CalendarServiceHelper.getMeetingTitle(
        '0xABC',
        [],
        'Custom Title'
      )
      expect(result).toBe('Custom Title')
    })

    it('should build title from participant names when no title given', () => {
      const result = CalendarServiceHelper.getMeetingTitle('0xABC', [])
      expect(result).toContain('Meeting:')
    })
  })

  describe('getMeetingSummary', () => {
    it('should include meeting URL in summary', () => {
      const result = CalendarServiceHelper.getMeetingSummary(
        undefined,
        'https://meet.example.com/123'
      )
      expect(result).toContain('https://meet.example.com/123')
    })

    it('should include description when provided', () => {
      const result = CalendarServiceHelper.getMeetingSummary(
        'Test description',
        'https://meet.example.com'
      )
      expect(result).toContain('Test description')
    })

    it('should include change link when provided', () => {
      const result = CalendarServiceHelper.getMeetingSummary(
        undefined,
        undefined,
        'https://meetwith.xyz/change/123'
      )
      expect(result).toContain('reschedule or cancel')
      expect(result).toContain('https://meetwith.xyz/change/123')
    })
  })

  describe('buildAttendeesList', () => {
    it('should return attendees list', () => {
      const participants = [
        {
          account_address: '0x111',
          meeting_id: 'm1',
          name: 'User A',
          status: ParticipationStatus.Accepted,
          type: 'invitee' as any,
        },
      ]

      const result = CalendarServiceHelper.buildAttendeesList(
        participants,
        '0x999', // calendar owner is different
        () => 'owner@example.com'
      )

      expect(result).toHaveLength(1)
      expect(result[0].displayName).toBe('User A')
      expect(result[0].responseStatus).toBe('accepted')
    })

    it('should use connected email for calendar owner', () => {
      const participants = [
        {
          account_address: '0x111',
          meeting_id: 'm1',
          name: 'Owner',
          status: ParticipationStatus.Pending,
          type: 'owner' as any,
        },
      ]

      const result = CalendarServiceHelper.buildAttendeesList(
        participants,
        '0x111', // same as participant address
        () => 'owner@calendar.com'
      )

      expect(result).toHaveLength(1)
      expect(result[0].email).toBe('owner@calendar.com')
    })

    it('should deduplicate attendees by email', () => {
      const participants = [
        {
          account_address: '0x111',
          meeting_id: 'm1',
          guest_email: 'same@example.com',
          status: ParticipationStatus.Accepted,
          type: 'invitee' as any,
        },
        {
          account_address: '0x222',
          meeting_id: 'm1',
          guest_email: 'same@example.com',
          status: ParticipationStatus.Pending,
          type: 'invitee' as any,
        },
      ]

      const result = CalendarServiceHelper.buildAttendeesList(
        participants,
        '0x999',
        () => 'owner@example.com'
      )

      expect(result).toHaveLength(1)
    })
  })
})
