import faker from '@faker-js/faker'

import { Account, SimpleAccountInfo } from '@/types/Account'
import { SchedulingType, TimeSlotSource } from '@/types/Meeting'
import { ParticipantType } from '@/types/Meeting'
import * as helper from '@/utils/api_helper'
import { scheduleMeeting } from '@/utils/calendar_manager'
import { MeetingWithYourselfError, TimeNotAvailableError } from '@/utils/errors'

jest.mock('@/utils/api_helper')

class NoErrorThrownError extends Error {}

const mockAccount = (internal_pub_key: string, address: string): Account => {
  return {
    id: faker.datatype.uuid(),
    created: faker.date.past(),
    address: address || faker.finance.bitcoinAddress(),
    internal_pub_key: internal_pub_key || faker.finance.bitcoinAddress(),
    encoded_signature: faker.datatype.string(),
    nonce: faker.datatype.number(),
    is_invited: faker.datatype.boolean(),
    subscriptions: [],
    preferences_path: faker.datatype.string(),
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
    const sourceAccount = targetAccount
    const participants: string[] = []
    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()

    // when
    const error = await getError(async () =>
      scheduleMeeting(
        schedulingType,
        targetAccount,
        participants,
        meetingTypeId,
        startTime,
        endTime,
        sourceAccount,
        undefined,
        undefined,
        undefined,
        meetingContent,
        meetingUrl
      )
    )

    expect(error).toBeInstanceOf(MeetingWithYourselfError)
  })

  it('should throw error if slot is not available', async () => {
    // given
    const schedulingType = SchedulingType.REGULAR
    const targetAccount = faker.datatype.uuid()
    const participants = [faker.datatype.uuid()]
    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()

    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: false })

    // when
    const error = await getError(async () =>
      scheduleMeeting(
        schedulingType,
        targetAccount,
        participants,
        meetingTypeId,
        startTime,
        endTime,
        undefined,
        undefined,
        undefined,
        undefined,
        meetingContent,
        meetingUrl
      )
    )

    expect(error).toBeInstanceOf(TimeNotAvailableError)
  })

  it('should be able to create a regular scheduling', async () => {
    // given
    const schedulingType = SchedulingType.REGULAR
    const targetAccount = faker.datatype.uuid()
    const participants = [faker.datatype.uuid()]
    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()
    const meetingInfoPath = faker.system.filePath()

    const existingAccounts: Account[] = [
      mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        targetAccount
      ),
      mockAccount(
        '34fd741e60fabc8107dc9a42894d988760f0a275c00b427a716d0b66d0ec4b19faca7a7eef33e007b1b21f8d0ff5595ad12d5b5a102f7d5da5d54c1113367bf3',
        participants[0]
      ),
    ]

    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: true })
    jest
      .spyOn(helper, 'getExistingAccounts')
      .mockResolvedValue(existingAccounts)

    jest.spyOn(helper, 'scheduleMeeting').mockResolvedValue({
      id: faker.datatype.uuid(),
      account_address: targetAccount,
      start: new Date(startTime),
      end: new Date(endTime),
      meeting_info_file_path: meetingInfoPath,
      meeting_info_encrypted: {
        ciphertext: '',
        ephemPublicKey: '',
        iv: '',
        mac: '',
      },
      version: 0,
      created_at: new Date(),
      source: TimeSlotSource.MWW,
    })

    // when
    const result = await scheduleMeeting(
      schedulingType,
      targetAccount,
      participants,
      meetingTypeId,
      startTime,
      endTime,
      undefined,
      undefined,
      undefined,
      undefined,
      meetingContent,
      meetingUrl
    )

    // then
    expect(helper.isSlotFreeApiCall).toBeCalledWith(
      targetAccount,
      startTime,
      endTime,
      meetingTypeId
    )
    expect(result).toMatchObject({
      start: startTime,
      meeting_info_file_path: meetingInfoPath,
      participants_mapping: [
        {
          account_address: targetAccount,
          type: ParticipantType.Owner,
        },
        {
          account_address: participants[0],
          type: ParticipantType.Invitee,
        },
      ],
      related_slot_ids: [],
      type: SchedulingType.REGULAR,
      version: 0,
    })
  })

  it('should be able to create a guest scheduling', async () => {
    // given
    const schedulingType = SchedulingType.GUEST
    const guestEmail = faker.internet.email()
    const guestName = faker.internet.userName()
    const targetAccount = faker.datatype.uuid()
    const participants = [faker.datatype.uuid()]
    const meetingTypeId = faker.datatype.uuid()
    const startTime = faker.date.past()
    const endTime = faker.date.future()
    const meetingContent = faker.random.words(3)
    const meetingUrl = faker.internet.url()
    const meetingInfoPath = faker.system.filePath()

    const existingAccounts: Account[] = [
      mockAccount(
        'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
        targetAccount
      ),
      mockAccount(
        '34fd741e60fabc8107dc9a42894d988760f0a275c00b427a716d0b66d0ec4b19faca7a7eef33e007b1b21f8d0ff5595ad12d5b5a102f7d5da5d54c1113367bf3',
        participants[0]
      ),
    ]

    jest.spyOn(helper, 'isSlotFreeApiCall').mockResolvedValue({ isFree: true })
    jest
      .spyOn(helper, 'getExistingAccounts')
      .mockResolvedValue(existingAccounts)

    jest.spyOn(helper, 'scheduleMeetingAsGuest').mockResolvedValue({
      id: faker.datatype.uuid(),
      account_address: targetAccount,
      start: new Date(startTime),
      end: new Date(endTime),
      meeting_info_file_path: meetingInfoPath,
      meeting_info_encrypted: {
        ciphertext: '',
        ephemPublicKey: '',
        iv: '',
        mac: '',
      },
      version: 0,
      created_at: new Date(),
      source: TimeSlotSource.MWW,
    })

    // when
    const result = await scheduleMeeting(
      schedulingType,
      targetAccount,
      participants,
      meetingTypeId,
      startTime,
      endTime,
      undefined,
      [{ email: guestEmail, name: guestName, scheduler: false }],
      undefined,
      undefined,
      meetingContent,
      meetingUrl
    )

    // then
    expect(helper.isSlotFreeApiCall).toBeCalledWith(
      targetAccount,
      startTime,
      endTime,
      meetingTypeId
    )
    expect(result).toMatchObject({
      start: startTime,
      meeting_info_file_path: meetingInfoPath,
      participants_mapping: [
        {
          account_address: existingAccounts[0].address,
          type: 'owner',
        },
        {
          account_address: existingAccounts[1].address,
          type: 'invitee',
        },
        {
          guest_email: guestEmail,
        },
      ],
      related_slot_ids: [],
      type: SchedulingType.GUEST,
      version: 0,
    })
  })
})
