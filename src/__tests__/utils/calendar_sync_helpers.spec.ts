import faker from '@faker-js/faker'
import { randomUUID } from 'crypto'

import {
  DBSlot,
  MeetingProvider,
  MeetingRepeat,
  TimeSlotSource,
  MeetingInfo,
  SlotInstance,
  SlotSeries,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
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
import { Account } from '@/types/Account'
import * as crypto from '@/utils/cryptography'
import * as database from '@/utils/database'

jest.mock('@/utils/cryptography')
jest.mock('@/utils/database')
jest.mock('@/utils/api_helper')

describe('calendar_sync_helpers - extractMeetingDescription', () => {
  it('should extract clean meeting description', () => {
    const summary =
      'Meeting description\nYour meeting will happen at https://example.com\nTo reschedule or cancel the meeting, please go to https://meetwith.com'
    const result = extractMeetingDescription(summary)
    expect(result).toBe('Meeting description')
    expect(result).not.toContain('Your meeting will happen at')
    expect(result).not.toContain('To reschedule or cancel')
  })

  it('should handle description without extra text', () => {
    const summary = 'Simple meeting description'
    const result = extractMeetingDescription(summary)
    expect(result).toBe('Simple meeting description')
  })

  it('should handle empty description', () => {
    const summary = ''
    const result = extractMeetingDescription(summary)
    expect(result).toBe('')
  })

  it('should handle only link text', () => {
    const summary = 'Your meeting will happen at https://example.com'
    const result = extractMeetingDescription(summary)
    expect(result).toBe('')
  })
})

describe('calendar_sync_helpers - getBaseEventId', () => {
  it('should extract base event ID from Google event ID', () => {
    const googleEventId = '02cd383a77214840b5a1ad4ceb545ff8_20240115T100000Z'
    const result = getBaseEventId(googleEventId)
    expect(result).toBe('02cd383a-7721-4840-b5a1-ad4ceb545ff8')
  })

  it('should handle event ID without instance suffix', () => {
    const googleEventId = '02cd383a77214840b5a1ad4ceb545ff8'
    const result = getBaseEventId(googleEventId)
    expect(result).toBe('02cd383a-7721-4840-b5a1-ad4ceb545ff8')
  })

  it('should format UUID correctly with hyphens', () => {
    const googleEventId = 'abcdef1234567890abcdef1234567890'
    const result = getBaseEventId(googleEventId)
    expect(result).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })
})

describe('calendar_sync_helpers - getParticipationStatus', () => {
  it('should convert accepted status', () => {
    const result = getParticipationStatus('accepted')
    expect(result).toBe(ParticipationStatus.Accepted)
  })

  it('should convert declined status', () => {
    const result = getParticipationStatus('declined')
    expect(result).toBe(ParticipationStatus.Rejected)
  })

  it('should convert undefined to pending', () => {
    const result = getParticipationStatus(undefined)
    expect(result).toBe(ParticipationStatus.Pending)
  })

  it('should convert null to pending', () => {
    const result = getParticipationStatus(null)
    expect(result).toBe(ParticipationStatus.Pending)
  })

  it('should convert needsAction to pending', () => {
    const result = getParticipationStatus('needsAction')
    expect(result).toBe(ParticipationStatus.Pending)
  })

  it('should convert tentative to pending', () => {
    const result = getParticipationStatus('tentative')
    expect(result).toBe(ParticipationStatus.Pending)
  })
})

describe('calendar_sync_helpers - handleParseParticipants', () => {
  it('should parse participants from Google Calendar event', () => {
    const googleEvent = {
      attendees: [
        {
          email: 'user1@example.com',
          responseStatus: 'accepted',
          displayName: 'User One',
        },
        {
          email: 'user2@example.com',
          responseStatus: 'declined',
          displayName: 'User Two',
        },
      ],
      organizer: {
        email: 'organizer@example.com',
      },
    }

    const result = handleParseParticipants(googleEvent as any)
    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
  })

  it('should handle event with no attendees', () => {
    const googleEvent = {
      organizer: {
        email: 'organizer@example.com',
      },
    }

    const result = handleParseParticipants(googleEvent as any)
    expect(result).toBeDefined()
  })

  it('should handle event with only organizer', () => {
    const googleEvent = {
      attendees: [],
      organizer: {
        email: 'organizer@example.com',
        displayName: 'Organizer',
      },
    }

    const result = handleParseParticipants(googleEvent as any)
    expect(result).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleUpdateParseMeetingInfo', () => {
  it('should parse meeting info from calendar event', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const calendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      summary: 'Test Meeting',
      description: 'Test Description',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      attendees: [
        {
          email: 'attendee@example.com',
          responseStatus: 'accepted',
        },
      ],
      organizer: {
        email: mockAccount.preferences?.name || '',
      },
      hangoutLink: 'https://meet.google.com/test',
    }

    jest.spyOn(database, 'findAccountsByEmails').mockResolvedValue([])

    const result = await handleUpdateParseMeetingInfo(
      calendarEvent as any,
      mockAccount,
      'external-123'
    )

    expect(result).toBeDefined()
    expect(result.meetingInfo).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleUpdateRSVPParseMeetingInfo', () => {
  it('should parse RSVP meeting info from calendar event', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const calendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      summary: 'Test Meeting',
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 3600000).toISOString() },
      attendees: [
        {
          email: mockAccount.preferences?.name || '',
          responseStatus: 'accepted',
        },
      ],
    }

    const result = await handleUpdateRSVPParseMeetingInfo(
      calendarEvent as any,
      mockAccount,
      'external-123'
    )

    expect(result).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleUpdateMeeting', () => {
  it('should handle meeting update from calendar sync', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const meetingId = randomUUID()
    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: mockAccount.address,
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      version: 0,
    }

    const mockMeetingInfo: MeetingInfo = {
      meeting_id: meetingId,
      participants: [
        {
          account_address: mockAccount.address,
          meeting_id: meetingId,
          slot_id: meetingId,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
        },
      ],
      created_at: new Date(),
      meeting_url: 'https://meet.google.com/test',
      change_history_paths: [],
      related_slot_ids: [meetingId],
      rrule: [],
    }

    const request = {
      externalMeetingId: 'external-123',
      meetingInfo: mockMeetingInfo,
      start: new Date(),
      end: new Date(Date.now() + 3600000),
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest.spyOn(database, 'updateMeeting').mockResolvedValue(mockSlot)

    const result = await handleUpdateMeeting(mockAccount, request as any)
    expect(result).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleUpdateMeetingRsvps', () => {
  it('should handle RSVP updates from calendar sync', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const meetingId = randomUUID()
    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: mockAccount.address,
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      version: 0,
    }

    const request = {
      externalMeetingId: 'external-123',
      participantStatus: ParticipationStatus.Accepted,
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest.spyOn(database, 'updateMeeting').mockResolvedValue(mockSlot)

    const result = await handleUpdateMeetingRsvps(mockAccount, request as any)
    expect(result).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleCancelOrDelete', () => {
  it('should handle meeting cancellation', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const request = {
      externalMeetingId: 'external-123',
      iana_timezone: 'UTC',
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest.spyOn(database, 'deleteMeetingFromDB').mockResolvedValue(undefined)

    await expect(
      handleCancelOrDelete(mockAccount, request as any)
    ).resolves.not.toThrow()
  })
})

describe('calendar_sync_helpers - handleCancelOrDeleteForRecurringInstance', () => {
  it('should handle recurring instance cancellation', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const request = {
      externalMeetingId: 'external-123_20240115T100000Z',
      iana_timezone: 'UTC',
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest
      .spyOn(database, 'deleteRecurringSlotInstances')
      .mockResolvedValue(undefined)

    await expect(
      handleCancelOrDeleteForRecurringInstance(mockAccount, request as any)
    ).resolves.not.toThrow()
  })
})

describe('calendar_sync_helpers - handleCancelOrDeleteSeries', () => {
  it('should handle series cancellation', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const request = {
      externalMeetingId: 'external-123',
      iana_timezone: 'UTC',
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest
      .spyOn(database, 'deleteRecurringSlotInstances')
      .mockResolvedValue(undefined)

    await expect(
      handleCancelOrDeleteSeries(mockAccount, request as any)
    ).resolves.not.toThrow()
  })
})

describe('calendar_sync_helpers - handleUpdateMeetingSeries', () => {
  it('should handle meeting series update', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const seriesId = randomUUID()
    const mockSeries: SlotSeries = {
      id: seriesId,
      account_address: mockAccount.address,
      template_start: new Date(),
      template_end: new Date(Date.now() + 3600000),
      default_meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
      source: TimeSlotSource.MWW,
    }

    const request = {
      externalMeetingId: 'external-123',
      meetingInfo: {
        meeting_id: seriesId,
        participants: [],
        created_at: new Date(),
        meeting_url: '',
        change_history_paths: [],
        related_slot_ids: [],
        rrule: ['FREQ=WEEKLY;BYDAY=MO'],
      },
      template_start: new Date(),
      template_end: new Date(Date.now() + 3600000),
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest.spyOn(database, 'upsertSeries').mockResolvedValue(mockSeries)

    const result = await handleUpdateMeetingSeries(
      mockAccount,
      request as any
    )
    expect(result).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleUpdateMeetingSeriesRsvps', () => {
  it('should handle series RSVP updates', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const request = {
      externalMeetingId: 'external-123',
      participantStatus: ParticipationStatus.Accepted,
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest
      .spyOn(database, 'bulkUpdateSlotSeriesConfirmedSlots')
      .mockResolvedValue(undefined)

    const result = await handleUpdateMeetingSeriesRsvps(
      mockAccount,
      request as any
    )
    expect(result).toBeDefined()
  })
})

describe('calendar_sync_helpers - handleUpdateSingleRecurringInstance', () => {
  it('should handle single recurring instance update', async () => {
    const mockAccount: Account = {
      address: faker.datatype.uuid(),
      created_at: new Date(),
      encoded_signature: '',
      id: randomUUID(),
      internal_pub_key: faker.finance.bitcoinAddress(),
      is_invited: false,
      nonce: 0,
      payment_preferences: null,
      preferences: {
        availabilities: [],
        description: '',
        meetingProviders: [MeetingProvider.GOOGLE_MEET],
        name: 'Test User',
        socialLinks: [],
        timezone: 'UTC',
      },
      subscriptions: [],
    }

    const instanceId = `${randomUUID()}_20240115T100000Z`
    const mockInstance: SlotInstance = {
      id: instanceId,
      account_address: mockAccount.address,
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      source: TimeSlotSource.MWW,
      slot_series_id: randomUUID(),
    }

    const request = {
      externalMeetingId: 'external-123_20240115T100000Z',
      meetingInfo: {
        meeting_id: instanceId,
        participants: [],
        created_at: new Date(),
        meeting_url: '',
        change_history_paths: [],
        related_slot_ids: [],
        rrule: [],
      },
      start: new Date(),
      end: new Date(Date.now() + 3600000),
    }

    jest.spyOn(database, 'getConferenceMeetingFromDB').mockResolvedValue(null)
    jest.spyOn(database, 'updateMeeting').mockResolvedValue(mockInstance as any)

    const result = await handleUpdateSingleRecurringInstance(
      mockAccount,
      request as any
    )
    expect(result).toBeDefined()
  })
})
