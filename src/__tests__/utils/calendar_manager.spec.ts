import faker from '@faker-js/faker'
import { randomUUID } from 'crypto'
import * as uuid from 'uuid'

import { Account } from '@/types/Account'
import {
  MeetingInfo,
  MeetingProvider,
  MeetingRepeat,
  SchedulingType,
  TimeSlotSource,
  DBSlot,
  SlotInstance,
  SlotSeries,
  MeetingChangeType,
  MeetingDecrypted,
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import * as helper from '@/utils/api_helper'
import {
  sanitizeParticipants,
  scheduleMeeting,
  cancelMeeting,
  updateMeeting,
  dateToHumanReadable,
  durationToHumanReadable,
  generateIcs,
  generateDefaultMeetingType,
  generateDefaultAvailabilities,
  createAlarm,
  participantStatusToICSStatus,
  rsvpMeeting,
  deleteMeeting,
  scheduleRecurringMeeting,
  updateMeetingSeries,
  deleteMeetingSeries,
  cancelMeetingGuest,
  updateMeetingAsGuest,
  generateGoogleCalendarUrl,
  generateOffice365CalendarUrl,
  dateToLocalizedRange,
  decryptMeeting,
  decryptMeetingGuest,
  decodeMeeting,
  getMeetingRepeatFromRule,
  handleRRULEForMeeting,
  isDiffRRULE,
  getOwnerPublicUrl,
  loadMeetingAccountAddresses,
} from '@/utils/calendar_manager'
import * as crypto from '@/utils/cryptography'
import * as storage from '@/utils/storage'
import { MeetingWithYourselfError, TimeNotAvailableError, DecryptionFailedError } from '@/utils/errors'
import { MeetingReminders } from '@/types/common'

jest.mock('@/utils/api_helper')
jest.mock('@/utils/database')
jest.mock('@/utils/sync_helper')
jest.mock('@/utils/services/calendar.backend.helper')
jest.mock('@/utils/storage')
jest.mock('uuid')

// Mock cryptography module
jest.mock('@/utils/cryptography', () => ({
  getContentFromEncrypted: jest.fn(),
  getContentFromEncryptedPublic: jest.fn(),
  simpleHash: jest.fn((data: string) => `hash_${data.substring(0, 10)}`),
  mockEncrypted: {
    ciphertext: '',
    ephemPublicKey: '',
    iv: '',
    mac: '',
  },
}))

// Mock eth-crypto
jest.mock('eth-crypto', () => ({
  encryptWithPublicKey: jest.fn().mockResolvedValue({
    ciphertext: 'mock-cipher',
    ephemPublicKey: 'mock-key',
    iv: 'mock-iv',
    mac: 'mock-mac',
  }),
  decryptWithPrivateKey: jest.fn(),
  Encrypted: jest.fn(),
}))

class NoErrorThrownError extends Error {}

const mockAccount = (internal_pub_key: string, address: string): Account => {
  return {
    address: address || faker.finance.bitcoinAddress(),
    created_at: faker.date.past(),
    encoded_signature: faker.datatype.string(),
    id: faker.datatype.uuid(),
    internal_pub_key: internal_pub_key || faker.finance.bitcoinAddress(),
    is_invited: faker.datatype.boolean(),
    nonce: faker.datatype.number(),
    payment_preferences: null,
    preferences: {
      availabilities: [],
      description: faker.datatype.string(),
      meetingProviders: [MeetingProvider.GOOGLE_MEET],
      name: faker.name.firstName(),
      socialLinks: [],
      timezone: faker.address.timeZone(),
    },
    subscriptions: [],
  }
}

const getError = async <TError>(call: () => unknown): Promise<TError> => {
  try {
    await call()

    throw new NoErrorThrownError()
  } catch (error: unknown) {
    return error as TError
  }
}

describe('calendar manager', () => {
  it('should throw error if trying to schedule with himself', async () => {
    // given
    const schedulingType = SchedulingType.REGULAR
    const targetAccount = faker.datatype.uuid()

    const account = mockAccount(
      'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
      targetAccount
    )

    const participants: ParticipantInfo[] = [
      {
        account_address: targetAccount,
        meeting_id: '',
        slot_id: '',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
      },
      {
        account_address: targetAccount,
        meeting_id: '',
        slot_id: '',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
      },
    ]

    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([account])

    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()

    // when
    const error = await getError(async () =>
      scheduleMeeting(
        false,
        schedulingType,
        meetingTypeId,
        startTime,
        endTime,
        participants,
        MeetingProvider.HUDDLE,
        account,
        meetingContent,
        meetingUrl
      )
    )

    expect(error).toBeInstanceOf(MeetingWithYourselfError)
  })

  it('should throw error if slot is not available', async () => {
    // given
    const schedulingType = SchedulingType.REGULAR
    const sourceAccount = faker.datatype.uuid()
    const targetAccount = faker.datatype.uuid()

    const account = mockAccount(
      'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
      sourceAccount
    )

    const participants: ParticipantInfo[] = [
      {
        account_address: sourceAccount,
        meeting_id: 'this_one',
        slot_id: 'wathevs1',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Scheduler,
      },
      {
        account_address: targetAccount,
        meeting_id: 'this_one',
        slot_id: 'wathevs2',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
      },
    ]

    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([account])

    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()

    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: false })

    // when
    const error = await getError(async () =>
      scheduleMeeting(
        false,
        schedulingType,
        meetingTypeId,
        startTime,
        endTime,
        participants,
        MeetingProvider.HUDDLE,
        account,
        meetingContent,
        meetingUrl
      )
    )

    expect(error).toBeInstanceOf(TimeNotAvailableError)
  })

  it('should not throw error even though slot is not available', async () => {
    // given
    const schedulingType = SchedulingType.REGULAR
    const sourceAccount = faker.datatype.uuid()
    const targetAccount = faker.datatype.uuid()

    const account = mockAccount(
      'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
      sourceAccount
    )

    const participants: ParticipantInfo[] = [
      {
        account_address: sourceAccount,
        meeting_id: 'this_one',
        slot_id: 'wathevs1',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Scheduler,
      },
      {
        account_address: targetAccount,
        meeting_id: 'this_one',
        name: 'Mr wathevs',
        slot_id: 'wathevs2',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Owner,
      },
    ]

    const random_slot_id = randomUUID()
    jest.spyOn(uuid, 'v4').mockImplementation(() => random_slot_id)
    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([account])

    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()
    const data = {
      account_address: targetAccount,
      created_at: new Date(),
      end: new Date(endTime),
      id: faker.datatype.uuid(),
      meeting_info_encrypted: crypto.mockEncrypted,
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      start: new Date(startTime),
      version: 0,
    }
    jest.spyOn(helper, 'scheduleMeeting').mockResolvedValue(data)

    const mockedContent: MeetingInfo = {
      change_history_paths: [],
      created_at: new Date(),
      meeting_id: randomUUID(),
      meeting_url: '',
      participants: participants,
      related_slot_ids: [],
      rrule: [],
    }
    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockImplementation(async () => JSON.stringify(mockedContent))
    const result = await scheduleMeeting(
      true,
      schedulingType,
      meetingTypeId,
      startTime,
      endTime,
      participants,
      MeetingProvider.HUDDLE,
      account,
      meetingContent,
      meetingUrl
    )

    expect(result).toMatchObject({
      participants: [
        {
          account_address: sourceAccount,
          slot_id: participants[0].slot_id,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
        {
          account_address: targetAccount,
          name: participants[1].name,
          slot_id: participants[1].slot_id,
          status: ParticipationStatus.Pending,
          type: ParticipantType.Owner,
        },
      ],
      related_slot_ids: [],
      start: startTime,
    })
  })

  it('should be able to create a regular scheduling', async () => {
    // given
    const schedulingType = SchedulingType.REGULAR
    const schedulerAccount = faker.datatype.uuid()
    const targetAccount = faker.datatype.uuid()
    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()

    const existingAccounts: Account[] = [
      mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        targetAccount
      ),
      mockAccount(
        '34fd741e60fabc8107dc9a42894d988760f0a275c00b427a716d0b66d0ec4b19faca7a7eef33e007b1b21f8d0ff5595ad12d5b5a102f7d5da5d54c1113367bf3',
        schedulerAccount
      ),
    ]

    const participants: ParticipantInfo[] = [
      {
        account_address: schedulerAccount,
        meeting_id: randomUUID(),
        slot_id: randomUUID(),
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Scheduler,
      },
      {
        account_address: targetAccount,
        meeting_id: randomUUID(),
        name: existingAccounts[0].preferences?.name,
        slot_id: randomUUID(),
        status: ParticipationStatus.Pending,
        type: ParticipantType.Owner,
      },
    ]
    const mockedContent: MeetingInfo = {
      change_history_paths: [],
      created_at: new Date(),
      meeting_id: randomUUID(),
      meeting_url: '',
      participants: JSON.parse(JSON.stringify(participants)),
      related_slot_ids: [],
      rrule: [],
    }

    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockImplementation(async () => JSON.stringify(mockedContent))

    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: true })
    jest
      .spyOn(helper, 'getExistingAccounts')
      .mockResolvedValue(existingAccounts)

    jest.spyOn(helper, 'scheduleMeeting').mockResolvedValue({
      account_address: targetAccount,
      created_at: mockedContent.created_at,
      end: new Date(endTime),
      id: faker.datatype.uuid(),
      meeting_info_encrypted: crypto.mockEncrypted,
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      start: new Date(startTime),
      version: 0,
    })

    // when
    const result = await scheduleMeeting(
      false,
      schedulingType,
      meetingTypeId,
      startTime,
      endTime,
      JSON.parse(JSON.stringify(participants)),
      MeetingProvider.HUDDLE,
      existingAccounts[1],
      meetingContent,
      meetingUrl
    )

    // then
    expect(helper.isSlotFreeApiCall).toBeCalledWith(
      targetAccount,
      startTime,
      endTime,
      meetingTypeId,
      undefined
    )

    expect(result).toMatchObject({
      participants: [
        {
          account_address: schedulerAccount,
          slot_id: participants[0].slot_id,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
        {
          account_address: targetAccount,
          name: participants[1].name,
          slot_id: participants[1].slot_id,
          status: ParticipationStatus.Pending,
          type: ParticipantType.Owner,
        },
      ],
      related_slot_ids: [],
      start: startTime,
      version: 0,
    })
  })

  it('should be able to create a guest scheduling', async () => {
    // given
    const schedulingType = SchedulingType.GUEST
    const guestEmail = faker.internet.email()
    const guestName = faker.internet.userName()
    const targetAccount = faker.datatype.uuid()

    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()

    const existingAccounts: Account[] = [
      mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        targetAccount
      ),
    ]

    const participants: ParticipantInfo[] = [
      {
        guest_email: guestEmail,
        meeting_id: randomUUID(),
        name: guestName,
        slot_id: '',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Scheduler,
      },
      {
        account_address: targetAccount,
        meeting_id: randomUUID(),
        slot_id: '',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
      },
    ]

    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: true })
    jest
      .spyOn(helper, 'getExistingAccounts')
      .mockResolvedValue(existingAccounts)

    jest.spyOn(helper, 'scheduleMeetingAsGuest').mockResolvedValue({
      account_address: targetAccount,
      created_at: new Date(),
      end: new Date(endTime),
      id: faker.datatype.uuid(),
      meeting_info_encrypted: crypto.mockEncrypted,
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      start: new Date(startTime),
      version: 0,
    })

    // when
    const result = await scheduleMeeting(
      false,
      schedulingType,
      meetingTypeId,
      startTime,
      endTime,
      participants,
      MeetingProvider.HUDDLE,
      null,
      meetingContent,
      meetingUrl
    )

    // then
    expect(helper.isSlotFreeApiCall).toBeCalledWith(
      targetAccount,
      startTime,
      endTime,
      meetingTypeId,
      undefined
    )

    expect(result).toMatchObject({
      participants: [
        {
          guest_email: guestEmail,
          type: ParticipantType.Scheduler,
        },
        {
          account_address: existingAccounts[0].address,
          type: ParticipantType.Owner,
        },
      ],
      related_slot_ids: [],
      start: startTime,
      version: 0,
    })
  })
})

describe('calendar manager sanitizing participants', () => {
  it('should sanitize participants', async () => {
    const participants: ParticipantInfo[] = [
      {
        account_address: '0x1',
        meeting_id: randomUUID(),
        slot_id: 'random',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
      },
      {
        account_address: '0x1',
        meeting_id: randomUUID(),
        name: 'look, my name',
        slot_id: 'random2',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
      },
      {
        guest_email: 'myemail@lookatme.com',
        meeting_id: randomUUID(),
        slot_id: 'whocares',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
      },
      {
        guest_email: 'myemail@lookatme.com',
        meeting_id: randomUUID(),
        name: 'I have a name',
        slot_id: 'whocares',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
      },
    ]

    expect(sanitizeParticipants(participants).length).toEqual(2)

    const EMAIL_TO_CHECK = 'myemail@lookatme.com'
    const NAME_TO_CHECK = 'look, my name'

    const participants2: ParticipantInfo[] = [
      {
        account_address: '0x1',
        meeting_id: randomUUID(),
        slot_id: 'random',
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
      },
      {
        account_address: '0x1',
        meeting_id: randomUUID(),
        name: NAME_TO_CHECK,
        slot_id: 'random2',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
      },
      {
        guest_email: EMAIL_TO_CHECK,
        meeting_id: randomUUID(),
        name: 'I have a name',
        slot_id: 'whocares',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Invitee,
      },
      {
        guest_email: EMAIL_TO_CHECK,
        meeting_id: randomUUID(),
        slot_id: 'whocaresagain',
        status: ParticipationStatus.Pending,
        type: ParticipantType.Scheduler,
      },
    ]

    const sanitized = sanitizeParticipants(participants2)

    expect(sanitized.length).toEqual(2)

    const addressPeople = sanitized.filter(p => p.account_address)
    expect(addressPeople[0].name).toEqual(NAME_TO_CHECK)

    const emailPeople = sanitized.filter(p => p.guest_email)

    expect(emailPeople[0].guest_email).toEqual(EMAIL_TO_CHECK)
    expect(emailPeople[0].name).toBeUndefined()
  })
})

describe('dateToHumanReadable', () => {
  it('should format date to human readable string', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const timezone = 'America/New_York'
    const result = dateToHumanReadable(date, timezone)
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('should handle different timezones', () => {
    const date = new Date('2024-01-15T10:30:00Z')
    const timezone = 'Europe/London'
    const result = dateToHumanReadable(date, timezone)
    expect(result).toBeTruthy()
  })
})

describe('durationToHumanReadable', () => {
  it('should convert minutes to human readable format', () => {
    const result = durationToHumanReadable(30)
    expect(result).toBe('30 min')
  })

  it('should convert hours to human readable format', () => {
    const result = durationToHumanReadable(60)
    expect(result).toBe('1 hour')
  })

  it('should convert hours and minutes to human readable format', () => {
    const result = durationToHumanReadable(90)
    expect(result).toBe('1 hour 30 min')
  })

  it('should handle zero duration', () => {
    const result = durationToHumanReadable(0)
    expect(result).toBe('0 min')
  })
})

describe('createAlarm', () => {
  it('should create alarm for 15 minutes before', () => {
    const alarm = createAlarm(MeetingReminders.MINUTES_15)
    expect(alarm).toBeDefined()
    expect(alarm.trigger).toBeDefined()
  })

  it('should create alarm for 1 hour before', () => {
    const alarm = createAlarm(MeetingReminders.HOUR_1)
    expect(alarm).toBeDefined()
    expect(alarm.trigger).toBeDefined()
  })

  it('should create alarm for 1 day before', () => {
    const alarm = createAlarm(MeetingReminders.DAY_1)
    expect(alarm).toBeDefined()
    expect(alarm.trigger).toBeDefined()
  })
})

describe('participantStatusToICSStatus', () => {
  it('should convert accepted status', () => {
    const result = participantStatusToICSStatus(ParticipationStatus.Accepted)
    expect(result).toBe('ACCEPTED')
  })

  it('should convert rejected status', () => {
    const result = participantStatusToICSStatus(ParticipationStatus.Rejected)
    expect(result).toBe('DECLINED')
  })

  it('should convert pending status', () => {
    const result = participantStatusToICSStatus(ParticipationStatus.Pending)
    expect(result).toBe('NEEDS-ACTION')
  })
})

describe('generateDefaultMeetingType', () => {
  it('should generate default meeting type', () => {
    const accountAddress = faker.datatype.uuid()
    const meetingType = generateDefaultMeetingType(accountAddress)
    expect(meetingType).toBeDefined()
    expect(meetingType.duration_minutes).toBe(30)
    expect(meetingType.title).toBeDefined()
  })
})

describe('generateDefaultAvailabilities', () => {
  it('should generate default availabilities for weekdays', () => {
    const availabilities = generateDefaultAvailabilities()
    expect(availabilities).toBeDefined()
    expect(availabilities.length).toBeGreaterThan(0)
  })
})

describe('rsvpMeeting', () => {
  it('should update participant status to accepted', async () => {
    const meetingId = randomUUID()
    const accountAddress = faker.datatype.uuid()
    const otherAccount = faker.datatype.uuid()
    const status = ParticipationStatus.Accepted

    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: accountAddress,
      start: new Date(),
      end: new Date(),
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
          account_address: accountAddress,
          meeting_id: meetingId,
          slot_id: meetingId,
          status: ParticipationStatus.Pending,
          type: ParticipantType.Owner,
        },
        {
          account_address: otherAccount,
          meeting_id: meetingId,
          slot_id: randomUUID(),
          status: ParticipationStatus.Pending,
          type: ParticipantType.Scheduler,
        },
      ],
      created_at: new Date(),
      meeting_url: '',
      change_history_paths: [],
      related_slot_ids: [meetingId],
      rrule: [],
    }

    jest.spyOn(helper, 'getMeeting').mockResolvedValue(mockSlot)
    jest.spyOn(helper, 'getAccount').mockResolvedValue({
      address: otherAccount,
    } as Account)
    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
      { address: accountAddress } as Account,
      { address: otherAccount } as Account,
    ])
    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockResolvedValue(JSON.stringify(mockMeetingInfo))
    jest.spyOn(helper, 'apiUpdateMeeting').mockResolvedValue(mockSlot)

    const result = await rsvpMeeting(meetingId, otherAccount, status)
    expect(result).toBeDefined()
  })

  it('should update participant status to rejected', async () => {
    const meetingId = randomUUID()
    const accountAddress = faker.datatype.uuid()
    const participantAddress = faker.datatype.uuid()
    const status = ParticipationStatus.Rejected

    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: accountAddress,
      start: new Date(),
      end: new Date(),
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
          account_address: accountAddress,
          meeting_id: meetingId,
          slot_id: meetingId,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
        },
        {
          account_address: participantAddress,
          meeting_id: meetingId,
          slot_id: randomUUID(),
          status: ParticipationStatus.Pending,
          type: ParticipantType.Scheduler,
        },
      ],
      created_at: new Date(),
      meeting_url: '',
      change_history_paths: [],
      related_slot_ids: [meetingId],
      rrule: [],
    }

    jest.spyOn(helper, 'getMeeting').mockResolvedValue(mockSlot)
    jest.spyOn(helper, 'getAccount').mockResolvedValue({
      address: participantAddress,
    } as Account)
    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
      { address: accountAddress } as Account,
      { address: participantAddress } as Account,
    ])
    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockResolvedValue(JSON.stringify(mockMeetingInfo))
    jest.spyOn(helper, 'apiUpdateMeeting').mockResolvedValue(mockSlot)

    const result = await rsvpMeeting(meetingId, participantAddress, status)
    expect(result).toBeDefined()
  })
})

describe('cancelMeeting', () => {
  it('should cancel a meeting successfully', async () => {
    const meetingId = randomUUID()
    const accountAddress = faker.datatype.uuid()

    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: accountAddress,
      start: new Date(),
      end: new Date(),
      meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      version: 0,
    }

    const mockMeetingInfo: MeetingInfo & { id: string; version: number } = {
      id: meetingId,
      meeting_id: meetingId,
      participants: [
        {
          account_address: accountAddress,
          meeting_id: meetingId,
          slot_id: meetingId,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
        },
      ],
      created_at: new Date(),
      meeting_url: '',
      change_history_paths: [],
      related_slot_ids: [meetingId],
      rrule: [],
      version: 0,
    }

    jest.spyOn(helper, 'getMeeting').mockResolvedValue(mockSlot)
    jest.spyOn(helper, 'getAccount').mockResolvedValue({
      address: accountAddress,
      internal_pub_key: 'test_key',
    } as Account)
    jest.spyOn(storage, 'getSignature').mockReturnValue('test_signature')
    
    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
      { address: accountAddress, internal_pub_key: 'test_key' } as Account,
    ])
    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockResolvedValue(JSON.stringify(mockMeetingInfo))
    jest.spyOn(helper, 'cancelMeeting').mockResolvedValue({ removed: [] })

    await expect(
      cancelMeeting(accountAddress, mockMeetingInfo as any)
    ).resolves.not.toThrow()
  })
})

describe('deleteMeeting', () => {
  it('should delete a meeting successfully', async () => {
    const meetingId = randomUUID()
    const accountAddress = faker.datatype.uuid()
    const schedulerAddress = faker.datatype.uuid()
    const otherAddress = faker.datatype.uuid()

    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: accountAddress,
      start: new Date(),
      end: new Date(),
      meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      version: 0,
    }

    const mockMeetingInfo: MeetingInfo & { id: string; version: number } = {
      id: meetingId,
      meeting_id: meetingId,
      participants: [
        {
          account_address: accountAddress,
          meeting_id: meetingId,
          slot_id: meetingId,
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Owner,
        },
        {
          account_address: schedulerAddress,
          meeting_id: meetingId,
          slot_id: randomUUID(),
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
        {
          account_address: otherAddress,
          meeting_id: meetingId,
          slot_id: randomUUID(),
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Invitee,
        },
      ],
      created_at: new Date(),
      meeting_url: '',
      change_history_paths: [],
      related_slot_ids: [meetingId],
      rrule: [],
      version: 0,
    }

    jest.spyOn(helper, 'getMeeting').mockResolvedValue(mockSlot)
    jest.spyOn(helper, 'getAccount').mockResolvedValue({
      address: accountAddress,
      internal_pub_key: 'test_key',
    } as Account)
    jest.spyOn(storage, 'getSignature').mockReturnValue('test_signature')
    
    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
      { address: accountAddress, internal_pub_key: 'test_key' } as Account,
      { address: schedulerAddress, internal_pub_key: 'test_key2' } as Account,
      { address: otherAddress, internal_pub_key: 'test_key3' } as Account,
    ])
    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockResolvedValue(JSON.stringify(mockMeetingInfo))
    jest.spyOn(helper, 'apiUpdateMeeting').mockResolvedValue(mockSlot)

    await expect(
      deleteMeeting(true, accountAddress, 'meeting-type-1', mockMeetingInfo as any)
    ).resolves.not.toThrow()
  })
})

describe('updateMeeting', () => {
  it('should update a meeting successfully', async () => {
    const meetingId = randomUUID()
    const schedulerAccount = faker.datatype.uuid()
    const ownerAccount = faker.datatype.uuid()

    const mockAccount: Account = {
      address: schedulerAccount,
      created_at: new Date(),
      encoded_signature: faker.datatype.string(),
      id: faker.datatype.uuid(),
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

    const mockSlot: DBSlot = {
      id: meetingId,
      account_address: ownerAccount,
      start: new Date(),
      end: new Date(Date.now() + 3600000),
      meeting_info_encrypted: crypto.mockEncrypted,
      created_at: new Date(),
      recurrence: MeetingRepeat.NO_REPEAT,
      source: TimeSlotSource.MWW,
      version: 0,
    }

    const mockMeetingInfo: MeetingInfo & {
      id: string
      version: number
    } = {
      id: meetingId,
      meeting_id: meetingId,
      participants: [
        {
          account_address: schedulerAccount,
          meeting_id: meetingId,
          slot_id: randomUUID(),
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
        {
          account_address: ownerAccount,
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
      content: 'Test meeting',
      version: 0,
    }

    const newStartTime = new Date(Date.now() + 86400000)
    const newEndTime = new Date(Date.now() + 90000000)

    jest.spyOn(helper, 'getMeeting').mockResolvedValue(mockSlot)
    jest.spyOn(helper, 'getAccount').mockResolvedValue(mockAccount)
    jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
      mockAccount,
      { address: ownerAccount, internal_pub_key: 'test_key2' } as Account,
    ])
    jest
      .spyOn(crypto, 'getContentFromEncrypted')
      .mockResolvedValue(JSON.stringify(mockMeetingInfo))
    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: true })
    jest.spyOn(helper, 'apiUpdateMeeting').mockResolvedValue({
      ...mockSlot,
      start: newStartTime,
      end: newEndTime,
      version: 1,
    })

    const result = await updateMeeting(
      true,
      schedulerAccount,
      faker.datatype.uuid(),
      newStartTime,
      newEndTime,
      mockMeetingInfo as any,
      'test_signature',
      mockMeetingInfo.participants,
      'Updated meeting content',
      'https://meet.google.com/updated',
      MeetingProvider.GOOGLE_MEET
    )

    expect(result).toBeDefined()
    expect(helper.apiUpdateMeeting).toHaveBeenCalled()
  })
})

describe('generateIcs', () => {
  it('should generate ICS file content', async () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')
    const accountAddress = faker.datatype.uuid()
    const participants: ParticipantInfo[] = [
      {
        account_address: accountAddress,
        meeting_id: randomUUID(),
        slot_id: randomUUID(),
        status: ParticipationStatus.Accepted,
        type: ParticipantType.Owner,
        name: 'Test User',
      },
    ]

    const result = await generateIcs(
      {
        title: 'Test Meeting',
        content: 'This is a test meeting',
        start: startTime,
        end: endTime,
        meeting_url: 'https://meet.google.com/test',
        participants,
        meeting_id: randomUUID(),
        created_at: new Date(),
      } as any,
      accountAddress,
      MeetingChangeType.CREATE
    )

    expect(result).toBeDefined()
    expect(result.error).toBeFalsy()
    expect(result.value).toBeTruthy()
  })

  it('should handle ICS generation with reminders', async () => {
    const startTime = new Date('2024-01-15T10:00:00Z')
    const endTime = new Date('2024-01-15T11:00:00Z')
    const accountAddress = faker.datatype.uuid()
    const participants: ParticipantInfo[] = []

    const result = await generateIcs(
      {
        title: 'Test Meeting',
        content: 'Meeting with reminders',
        start: startTime,
        end: endTime,
        meeting_url: 'https://meet.google.com/test',
        participants,
        reminders: [MeetingReminders.MINUTES_15],
        meeting_id: randomUUID(),
        created_at: new Date(),
      } as any,
      accountAddress,
      MeetingChangeType.UPDATE
    )

    expect(result).toBeDefined()
    expect(result.error).toBeFalsy()
  })
})

describe('Recurring Meeting Functions', () => {
  describe('scheduleRecurringMeeting', () => {
    it('should schedule a recurring meeting series', async () => {
      const schedulerAccount = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        faker.datatype.uuid()
      )
      const targetAccount = faker.datatype.uuid()
      const participants: ParticipantInfo[] = [
        {
          account_address: schedulerAccount.address,
          meeting_id: randomUUID(),
          slot_id: randomUUID(),
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
        {
          account_address: targetAccount,
          meeting_id: randomUUID(),
          slot_id: randomUUID(),
          status: ParticipationStatus.Pending,
          type: ParticipantType.Owner,
        },
      ]

      jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
        schedulerAccount,
        mockAccount('test_key', targetAccount),
      ])
      jest.spyOn(helper, 'scheduleMeetingSeries').mockResolvedValue({
        meeting_id: 'series-123',
        slot_id: 'slot-123',
        account_address: schedulerAccount.address,
        id: randomUUID(),
        start: new Date(),
        end: new Date(),
        meeting_info_encrypted: crypto.mockEncrypted,
        created_at: new Date(),
        recurrence: MeetingRepeat.WEEKLY,
        source: TimeSlotSource.MWW,
        version: 0,
      } as any)

      const result = await scheduleRecurringMeeting(
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
        participants,
        MeetingRepeat.WEEKLY,
        MeetingProvider.HUDDLE,
        schedulerAccount,
        'Team meeting',
        'https://meet.example.com',
        'Weekly Standup'
      )

      expect(result).toBeDefined()
    })

    it('should handle recurring meeting creation errors', async () => {
      const schedulerAccount = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        faker.datatype.uuid()
      )
      const participants: ParticipantInfo[] = [
        {
          account_address: schedulerAccount.address,
          meeting_id: randomUUID(),
          slot_id: randomUUID(),
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
      ]

      jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([schedulerAccount])
      jest.spyOn(helper, 'scheduleMeetingSeries').mockRejectedValue(
        new Error('Creation failed')
      )

      await expect(
        scheduleRecurringMeeting(
          new Date('2024-01-15T10:00:00Z'),
          new Date('2024-01-15T11:00:00Z'),
          participants,
          MeetingRepeat.DAILY,
          MeetingProvider.HUDDLE,
          schedulerAccount
        )
      ).rejects.toThrow()
    })
  })

  describe('updateMeetingSeries', () => {
    it('should update an entire meeting series', async () => {
      const instanceId = 'series-123_1'
      const accountAddress = faker.datatype.uuid()
      const account = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        accountAddress
      )

      const otherAddress = faker.datatype.uuid()
      const otherAccount = mockAccount('test_key2', otherAddress)

      const mockMeetingInfo: MeetingInfo = {
        meeting_id: randomUUID(),
        participants: [
          {
            account_address: accountAddress,
            meeting_id: randomUUID(),
            slot_id: randomUUID(),
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Scheduler,
          },
          {
            account_address: otherAddress,
            meeting_id: randomUUID(),
            slot_id: randomUUID(),
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Owner,
          },
        ],
        related_slot_ids: [],
        rrule: [],
        created_at: new Date(),
        meeting_url: '',
      }

      jest.spyOn(helper, 'getSlotSeries').mockResolvedValue({
        id: 'series-123',
        account_address: accountAddress,
        default_meeting_info_encrypted: crypto.mockEncrypted,
        template_start: new Date('2024-01-15T10:00:00Z'),
        template_end: new Date('2024-01-15T11:00:00Z'),
      } as any)
      jest.spyOn(helper, 'getAccount').mockResolvedValue(account)
      jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
        account,
        otherAccount,
      ])
      
      jest.spyOn(crypto, 'getContentFromEncrypted').mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )
      jest.spyOn(helper, 'apiUpdateMeetingSeries').mockResolvedValue({
        success: true,
      } as any)

      const result = await updateMeetingSeries(
        instanceId,
        accountAddress,
        new Date('2024-01-15T10:00:00Z'),
        new Date('2024-01-15T11:00:00Z'),
        'signature',
        mockMeetingInfo.participants,
        'Updated content',
        'https://meet.example.com',
        MeetingProvider.HUDDLE
      )

      expect(result).toBeDefined()
    })
  })

  describe('deleteMeetingSeries', () => {
    it('should delete an entire meeting series', async () => {
      const instanceId = 'series-123_1'
      const accountAddress = faker.datatype.uuid()
      const account = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        accountAddress
      )

      const otherAddress = faker.datatype.uuid()
      const otherAccount = mockAccount('test_key2', otherAddress)
      const thirdAddress = faker.datatype.uuid()
      const thirdAccount = mockAccount('test_key3', thirdAddress)

      const mockMeetingInfo: MeetingInfo = {
        meeting_id: randomUUID(),
        participants: [
          {
            account_address: accountAddress,
            meeting_id: randomUUID(),
            slot_id: randomUUID(),
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Owner,
          },
          {
            account_address: otherAddress,
            meeting_id: randomUUID(),
            slot_id: randomUUID(),
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Scheduler,
          },
          {
            account_address: thirdAddress,
            meeting_id: randomUUID(),
            slot_id: randomUUID(),
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Invitee,
          },
        ],
        related_slot_ids: [],
        rrule: [],
        created_at: new Date(),
        meeting_url: '',
      }

      jest.spyOn(helper, 'getSlotSeries').mockResolvedValue({
        id: 'series-123',
        account_address: accountAddress,
        default_meeting_info_encrypted: crypto.mockEncrypted,
      } as any)
      jest.spyOn(helper, 'getSlotInstanceById').mockResolvedValue({
        id: instanceId,
        account_address: accountAddress,
        start: new Date(),
        end: new Date(),
      } as any)
      jest.spyOn(helper, 'getAccount').mockResolvedValue(account)
      jest.spyOn(storage, 'getSignature').mockReturnValue('test_signature')
      jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
        account,
        otherAccount,
        thirdAccount,
      ])
      
      jest.spyOn(crypto, 'getContentFromEncrypted').mockResolvedValue(
        JSON.stringify(mockMeetingInfo)
      )
      jest.spyOn(helper, 'apiUpdateMeetingSeries').mockResolvedValue({
        id: 'series-123',
        account_address: accountAddress,
        meeting_info_encrypted: crypto.mockEncrypted,
        start: new Date(),
        end: new Date(),
        created_at: new Date(),
        version: 1,
      } as any)

      const result = await deleteMeetingSeries(instanceId, accountAddress)

      expect(result).toBeDefined()
    })
  })
})

describe('Guest Meeting Functions', () => {
  describe('cancelMeetingGuest', () => {
    it('should cancel meeting as guest', async () => {
      const accountAddress = faker.datatype.uuid()
      const account = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        accountAddress
      )

      const mockMeeting: MeetingDecrypted = {
        id: 'meeting-123',
        meeting_id: randomUUID(),
        account_address: accountAddress,
        participants: [
          {
            account_address: accountAddress,
            slot_id: 'meeting-123',
            status: ParticipationStatus.Accepted,
            type: ParticipantType.Owner,
          } as ParticipantInfo,
        ],
        related_slot_ids: [],
        start: new Date(),
        end: new Date(),
        created_at: new Date(),
        version: 0,
        recurrence: MeetingRepeat.NO_REPEAT,
      } as MeetingDecrypted

      jest.spyOn(helper, 'getSlotByMeetingId').mockResolvedValue({
        id: 'meeting-123',
        meeting_id: mockMeeting.meeting_id,
        account_address: accountAddress,
        meeting_info_encrypted: crypto.mockEncrypted,
        version: 0,
        start: new Date(),
        end: new Date(),
        created_at: new Date(),
        user_type: 'guest',
        priority: 2,
      } as any)

      jest.spyOn(helper, 'decodeMeetingGuest').mockResolvedValue({
        id: 'meeting-123',
        meeting_id: mockMeeting.meeting_id,
        participants: mockMeeting.participants,
        related_slot_ids: [],
        rrule: [],
        created_at: new Date(),
        meeting_url: '',
        start: new Date(),
        end: new Date(),
        version: 0,
      } as any)

      jest.spyOn(helper, 'conferenceGuestMeetingCancel').mockResolvedValue({
        success: true,
      } as any)

      const result = await cancelMeetingGuest(mockMeeting)

      expect(result).toBeDefined()
    })
  })

  describe('updateMeetingAsGuest', () => {
    it('should update meeting as guest', async () => {
      const slotId = 'meeting-123'
      const meetingTypeId = randomUUID()
      const start = new Date('2024-01-16T10:00:00Z')
      const end = new Date('2024-01-16T11:00:00Z')
      const ownerAddress = faker.datatype.uuid()
      const schedulerAddress = faker.datatype.uuid()

      const participants: ParticipantInfo[] = [
        {
          account_address: schedulerAddress,
          meeting_id: '',
          slot_id: randomUUID(),
          status: ParticipationStatus.Accepted,
          type: ParticipantType.Scheduler,
        },
      ]

      jest.spyOn(helper, 'getMeetingGuest').mockResolvedValue({
        id: slotId,
        slots: [slotId],
        meeting_id: randomUUID(),
      } as any)
      jest.spyOn(helper, 'getSlotsByIds').mockResolvedValue([
        {
          id: slotId,
          account_address: ownerAddress,
          role: ParticipantType.Owner,
          version: 0,
          start,
          end,
          meeting_info_encrypted: crypto.mockEncrypted,
          created_at: new Date(),
        } as any,
      ])
      jest.spyOn(helper, 'getExistingAccounts').mockResolvedValue([
        { address: ownerAddress, internal_pub_key: 'test_key1' } as Account,
        { address: schedulerAddress, internal_pub_key: 'test_key2' } as Account,
      ])
      jest.spyOn(helper, 'generateMeetingUrl').mockResolvedValue({
        url: 'https://meet.example.com',
      } as any)
      jest.spyOn(helper, 'updateMeetingAsGuest').mockResolvedValue({
        id: slotId,
        account_address: ownerAddress,
        start,
        end,
        meeting_info_encrypted: crypto.mockEncrypted,
        created_at: new Date(),
        version: 1,
      } as any)

      const result = await updateMeetingAsGuest(
        slotId,
        meetingTypeId,
        start,
        end,
        participants,
        MeetingProvider.HUDDLE,
        'Updated content',
        'https://meet.example.com'
      )

      expect(result).toBeDefined()
    })
  })
})

describe('URL Generation Functions', () => {
  describe('generateGoogleCalendarUrl', () => {
    it('should generate Google Calendar add event URL', async () => {
      const meetingId = randomUUID()
      const accountAddress = faker.datatype.uuid()
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')
      const title = 'Test Meeting'
      const content = 'Description'
      const meetingUrl = 'https://meet.google.com/test'

      const url = await generateGoogleCalendarUrl(
        meetingId,
        accountAddress,
        start,
        end,
        title,
        content,
        meetingUrl
      )

      expect(url).toBeDefined()
      expect(url).toContain('calendar.google.com')
      expect(url).toContain('Test Meeting')
    })
  })

  describe('generateOffice365CalendarUrl', () => {
    it('should generate Office 365 Calendar add event URL', async () => {
      const meetingId = randomUUID()
      const accountAddress = faker.datatype.uuid()
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')
      const title = 'Test Meeting'
      const content = 'Description'

      const url = await generateOffice365CalendarUrl(
        meetingId,
        accountAddress,
        start,
        end,
        title,
        content
      )

      expect(url).toBeDefined()
      expect(url).toContain('outlook.office.com')
    })
  })

  describe('dateToLocalizedRange', () => {
    it('should format date range in local timezone', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')

      const result = dateToLocalizedRange(start, end, 'America/New_York')

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle different timezones', () => {
      const start = new Date('2024-01-15T10:00:00Z')
      const end = new Date('2024-01-15T11:00:00Z')

      const resultEst = dateToLocalizedRange(start, end, 'America/New_York')
      const resultUtc = dateToLocalizedRange(start, end, 'UTC')

      expect(resultEst).not.toEqual(resultUtc)
    })
  })
})

describe('Decryption Functions', () => {
  describe('decryptMeeting', () => {
    it('should decrypt meeting details', async () => {
      const accountAddress = faker.datatype.uuid()
      const account = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        accountAddress
      )

      const mockSlot: DBSlot = {
        id: 'meeting-123',
        account_address: accountAddress,
        start: new Date(),
        end: new Date(),
        meeting_info_encrypted: crypto.mockEncrypted,
        created_at: new Date(),
        recurrence: MeetingRepeat.NO_REPEAT,
        source: TimeSlotSource.MWW,
        version: 0,
      }

      jest.spyOn(crypto, 'getContentFromEncrypted').mockResolvedValue(
        JSON.stringify({
          meeting_id: 'meeting-123',
          title: 'Decrypted Meeting',
          content: 'Details',
          participants: [],
          related_slot_ids: [],
          rrule: [],
          created_at: new Date(),
          meeting_url: '',
        })
      )

      const result = await decryptMeeting(mockSlot as any, account)

      expect(result).toBeDefined()
      expect(result?.content).toBe('Details')
    })

    it('should throw DecryptionFailedError on decryption failure', async () => {
      const accountAddress = faker.datatype.uuid()
      const account = mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        accountAddress
      )

      const mockSlot: DBSlot = {
        id: 'meeting-123',
        account_address: accountAddress,
        start: new Date(),
        end: new Date(),
        meeting_info_encrypted: crypto.mockEncrypted,
        created_at: new Date(),
        recurrence: MeetingRepeat.NO_REPEAT,
        source: TimeSlotSource.MWW,
        version: 0,
      }

      jest.spyOn(crypto, 'getContentFromEncrypted').mockResolvedValue('')

      const result = await decryptMeeting(mockSlot as any, account)

      expect(result).toBeNull()
    })
  })

  describe('decryptMeetingGuest', () => {
    it('should decrypt meeting for guest', async () => {
      const mockGuestSlot = {
        meeting_id: 'meeting-123',
        encrypted_meeting: 'encrypted-data',
      }

      jest.spyOn(helper, 'getMeetingGuest').mockResolvedValue(mockGuestSlot as any)
      jest.spyOn(crypto, 'getContentFromEncryptedPublic').mockResolvedValue(
        JSON.stringify({
          title: 'Guest Meeting',
        })
      )

      const result = await decryptMeetingGuest('meeting-123', 'private-key')

      expect(result).toBeDefined()
      expect(result.title).toBe('Guest Meeting')
    })
  })

  describe('decodeMeeting', () => {
    it('should decode and decrypt meeting', async () => {
      const mockSlot = {
        meeting_id: 'meeting-123',
        encrypted_meeting: 'encrypted',
      }

      jest.spyOn(helper, 'getMeeting').mockResolvedValue(mockSlot as any)
      jest.spyOn(crypto, 'getContentFromEncrypted').mockResolvedValue(
        JSON.stringify({ title: 'Decoded' })
      )

      const result = await decodeMeeting('meeting-123', '0x123')

      expect(result).toBeDefined()
    })
  })
})

describe('RRULE and Recurrence Functions', () => {
  describe('getMeetingRepeatFromRule', () => {
    it('should parse RRULE to MeetingRepeat object', () => {
      const rruleString = 'FREQ=WEEKLY;COUNT=10;BYDAY=MO,WE,FR'
      const { RRule } = require('rrule')
      const rule = RRule.fromString(`DTSTART:20240115T100000Z\nRRULE:${rruleString}`)

      const result = getMeetingRepeatFromRule(rule)

      expect(result).toBeDefined()
      expect(result).toBe(MeetingRepeat.WEEKLY)
    })

    it('should handle daily recurrence', () => {
      const rruleString = 'FREQ=DAILY;COUNT=5'
      const { RRule } = require('rrule')
      const rule = RRule.fromString(`DTSTART:20240115T100000Z\nRRULE:${rruleString}`)

      const result = getMeetingRepeatFromRule(rule)

      expect(result).toBe(MeetingRepeat.DAILY)
    })

    it('should handle monthly recurrence', () => {
      const rruleString = 'FREQ=MONTHLY;COUNT=12'
      const { RRule } = require('rrule')
      const rule = RRule.fromString(`DTSTART:20240115T100000Z\nRRULE:${rruleString}`)

      const result = getMeetingRepeatFromRule(rule)

      expect(result).toBe(MeetingRepeat.MONTHLY)
    })
  })

  describe('handleRRULEForMeeting', () => {
    it('should convert MeetingRepeat to RRULE array', () => {
      const result = handleRRULEForMeeting(MeetingRepeat.WEEKLY, new Date('2024-01-15'))

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toContain('FREQ=WEEKLY')
    })
  })

  describe('isDiffRRULE', () => {
    it('should detect different RRULEs', () => {
      const rrule1 = ['FREQ=WEEKLY;COUNT=10']
      const rrule2 = ['FREQ=DAILY;COUNT=5']

      const result = isDiffRRULE(rrule1, rrule2)

      expect(result).toBe(true)
    })

    it('should return false for same RRULEs', () => {
      const rrule1 = ['FREQ=WEEKLY;COUNT=10']
      const rrule2 = ['FREQ=WEEKLY;COUNT=10']

      const result = isDiffRRULE(rrule1, rrule2)

      expect(result).toBe(false)
    })
  })
})

describe('Utility Functions', () => {
  describe('getOwnerPublicUrl', () => {
    it('should get owner public URL from account', async () => {
      const mockAccount = {
        address: '0x123',
        custom_url: 'custom-url',
      }

      jest.spyOn(helper, 'getAccount').mockResolvedValue(mockAccount as any)

      const result = await getOwnerPublicUrl('0x123')

      expect(result).toBeDefined()
    })
  })

  describe('loadMeetingAccountAddresses', () => {
    it('should load account addresses from meeting participants', async () => {
      const mockMeeting: MeetingInfo = {
        meeting_id: randomUUID(),
        participants: [
          { account_address: '0x123', status: ParticipationStatus.Accepted, type: ParticipantType.Owner } as ParticipantInfo,
          { account_address: '0x456', status: ParticipationStatus.Pending, type: ParticipantType.Scheduler } as ParticipantInfo,
        ],
        related_slot_ids: [],
        rrule: [],
        created_at: new Date(),
        meeting_url: '',
      }

      const result = await loadMeetingAccountAddresses(mockMeeting)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})

