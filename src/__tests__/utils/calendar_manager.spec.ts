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
} from '@/types/Meeting'
import {
  ParticipantInfo,
  ParticipantType,
  ParticipationStatus,
} from '@/types/ParticipantInfo'
import * as helper from '@/utils/api_helper'
import { sanitizeParticipants, scheduleMeeting } from '@/utils/calendar_manager'
import * as crypto from '@/utils/cryptography'
import { MeetingWithYourselfError, TimeNotAvailableError } from '@/utils/errors'

jest.mock('@/utils/api_helper')
jest.mock('@/utils/cryptography')
jest.mock('uuid')

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
