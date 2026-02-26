/**
 * Comprehensive unit tests for api_helper.ts
 * Testing all API request/response logic, error handling, and retries
 */

// Set environment variables before imports
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_THIRDWEB_ID = 'test-thirdweb-id'
process.env.PIN_SALT = 'test-salt'
process.env.RESEND_API_KEY = 'test-resend-key'
process.env.FROM_MAIL = 'test@example.com'
process.env.SERVER_SECRET = 'test-server-secret'

// Mock Sentry before imports
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Mock query client
jest.mock('@/utils/react_query', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    fetchQuery: jest.fn(),
  },
}))

// Mock calendar_manager
jest.mock('@/utils/calendar_manager', () => ({
  decodeMeeting: jest.fn(),
  meetWithSeriesPreprocessors: jest.fn(),
}))

// Mock storage
jest.mock('@/utils/storage', () => ({
  getSignature: jest.fn(),
}))

// Mock token.gate.service
jest.mock('@/utils/token.gate.service', () => ({
  safeConvertConditionFromAPI: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import {
  apiCancelMeetingSeries,
  apiUpdateMeeting,
  apiUpdateMeetingInstance,
  apiUpdateMeetingSeries,
  cancelCryptoSubscription,
  cancelMeeting,
  cancelMeetingGuest,
  cancelMeetingInstance,
  createHuddleRoom,
  createZoomMeeting,
  deleteConnectedCalendar,
  deleteDiscordIntegration,
  deleteGroup,
  duplicateAvailabilityBlock,
  editGroup,
  fetchBusySlotsForMultipleAccounts,
  fetchBusySlotsRawForMultipleAccounts,
  fetchBusySlotsRawForQuickPollParticipants,
  generateDiscordAccount,
  getAccount,
  getAccountByDomain,
  getBillingPlans,
  getBusySlots,
  getExistingAccounts,
  getExistingAccountsSimple,
  getFullAccountInfo,
  getGateCondition,
  getGroup,
  getGroupMemberAvailabilities,
  getGroupsEmpty,
  getGroupsFull,
  getGroupsFullWithMetadata,
  getMeetings,
  getMeetingTypesForAvailabilityBlock,
  getOwnAccount,
  getSubscriptionHistory,
  getWalletPOAPs,
  internalFetch,
  isSlotFreeApiCall,
  joinGroup,
  leaveGroup,
  removeGroupMember,
  removeMeetingType,
  saveAccountChanges,
  saveAvatar,
  saveBanner,
  saveMeetingType,
  scheduleMeeting,
  scheduleMeetingAsGuest,
  scheduleMeetingFromServer,
  scheduleMeetingSeries,
  subscribeToBillingPlan,
  syncMeeting,
  syncSubscriptions,
  updateConnectedCalendar,
  updateMeetingAsGuest,
  updateMeetingType,
  uploadGroupAvatar,
  validateWebdav,
} from '@/utils/api_helper'
import { apiUrl } from '@/utils/constants'

import {
  AccountNotFoundError,
  AllMeetingSlotsUsedError,
  ApiFetchError,
  GateConditionNotValidError,
  MeetingCreationError,
  MeetingNotFoundError,
  ServiceUnavailableError,
  TimeNotAvailableError,
  TransactionIsRequired,
} from '@/utils/errors'
import { queryClient } from '@/utils/react_query'

const accountAddress = faker.datatype.uuid()
const account = mockAccount(
  'd96dd87a62d050242b799888740739bdbaacdd18e57f059803ed41e27b1898448d95a7fac66d17c06309719f6a2729cbdda2646d391385817b6a6ce8dd834fef',
  accountAddress
)

const otherAddress = faker.datatype.uuid()

const mockedMeetingInfo: MeetingInfo = mockMeetingInfo([
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
])

const mockQuickPollParticipant = mockAddQuickPollParticipant(accountAddress)
describe('api_helper.ts', () => {
  let originalFetch: typeof global.fetch
  const mockCaptureException = Sentry.captureException as jest.Mock
  const mockInvalidateQueries = queryClient.invalidateQueries as jest.Mock
  const mockFetchQuery = queryClient.fetchQuery as jest.Mock

  beforeAll(() => {
    originalFetch = global.fetch
  })

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  describe('internalFetch', () => {
    it('should make a successful GET request', async () => {
      const mockData = { id: 1, name: 'test' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockData,
      })

      const result = await internalFetch('/test')

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/test`,
        expect.objectContaining({
          method: 'GET',
          mode: 'cors',
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should make a successful POST request with body', async () => {
      const mockData = { success: true }
      const requestBody = { field: 'value' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 201,
        json: async () => mockData,
      })

      const result = await internalFetch('/test', 'POST', requestBody)

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/test`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should handle FormData requests', async () => {
      const mockData = { url: 'http://example.com/image.jpg' }
      const formData = new FormData()
      formData.append('file', 'test')

      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockData,
      })

      const result = await internalFetch(
        '/upload',
        'POST',
        formData,
        {},
        {},
        true
      )

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/upload`,
        expect.objectContaining({
          method: 'POST',
          body: formData,
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should throw ApiFetchError on non-2xx status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(internalFetch('/test')).rejects.toThrow(ApiFetchError)
    })

    it('should retry on network failure', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce({
          status: 200,
          json: async () => ({ success: true }),
        })

      const result = await internalFetch('/test')

      expect(global.fetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true })
    })

    it('should not retry on 500 error', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        status: 500,
        text: async () => 'Server Error',
      })

      await expect(internalFetch('/test')).rejects.toThrow(ApiFetchError)

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should not retry when withRetry is false', async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new TypeError('Failed to fetch'))

      await expect(
        internalFetch('/test', 'GET', null, {}, {}, false, false)
      ).rejects.toThrow()

      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should throw ServiceUnavailableError on 504 error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 504,
        text: async () => 'Gateway Timeout',
      })

      await expect(internalFetch('/test')).rejects.toThrow(
        ServiceUnavailableError
      )
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('should capture non-account 404 errors to Sentry', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(internalFetch('/other-endpoint')).rejects.toThrow()
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('should handle custom headers', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ success: true }),
      })

      await internalFetch('/test', 'GET', null, {}, { 'X-Custom': 'value' })

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      )
    })

    it('should handle AbortSignal', async () => {
      const controller = new AbortController()
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ success: true }),
      })

      await internalFetch('/test', 'GET', null, { signal: controller.signal })

      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/test`,
        expect.objectContaining({
          signal: controller.signal,
        })
      )
    })
  })

  describe('getAccount', () => {
    it('should fetch account by identifier', async () => {
      const mockAccount = { address: '0x123', name: 'Test User' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockAccount,
      })

      const result = await getAccount('0x123')

      expect(result).toEqual(mockAccount)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/accounts/0x123`,
        expect.any(Object)
      )
    })

    it('should throw AccountNotFoundError on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(getAccount('0x123')).rejects.toThrow(AccountNotFoundError)
    })
  })

  describe('getOwnAccount', () => {
    it('should fetch own account', async () => {
      const mockAccount = {
        address: '0x123',
        name: 'My Account',
        email: 'test@example.com',
      }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockAccount,
      })

      const result = await getOwnAccount('0x123')

      expect(result).toEqual(mockAccount)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/accounts`,
        expect.any(Object)
      )
    })

    it('should throw AccountNotFoundError on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(getOwnAccount('0x123')).rejects.toThrow(AccountNotFoundError)
    })
  })

  describe('getAccountByDomain', () => {
    it('should fetch subscription by domain', async () => {
      const mockSubscription = { id: 'sub_123', domain: 'example.com' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSubscription,
      })

      const result = await getAccountByDomain('example.com')

      expect(result).toEqual(mockSubscription)
    })

    it('should return null on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      const result = await getAccountByDomain('nonexistent.com')

      expect(result).toBeNull()
    })
  })

  describe('getExistingAccountsSimple', () => {
    it('should fetch simple account info for addresses', async () => {
      const mockAccounts = [
        { address: '0x123', name: 'User 1' },
        { address: '0x456', name: 'User 2' },
      ]
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockAccounts,
      })

      const result = await getExistingAccountsSimple(['0x123', '0x456'])

      expect(result).toEqual(mockAccounts)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/accounts/existing`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            addresses: ['0x123', '0x456'],
            fullInformation: false,
          }),
        })
      )
    })
  })

  describe('getExistingAccounts', () => {
    it('should fetch full account info using query client', async () => {
      const mockAccounts = [{ address: '0x123', name: 'User 1' }]
      mockFetchQuery.mockResolvedValue(mockAccounts)

      const result = await getExistingAccounts(['0x123'])

      expect(result).toEqual(mockAccounts)
      expect(mockFetchQuery).toHaveBeenCalled()
    })
  })

  describe('saveAccountChanges', () => {
    it('should save account changes and invalidate cache', async () => {
      const mockAccount = { address: '0x123', name: 'Updated Name' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockAccount,
      })

      const result = await saveAccountChanges(mockAccount as any)

      expect(result).toEqual(mockAccount)
      expect(mockInvalidateQueries).toHaveBeenCalled()
    })
  })

  describe('saveAvatar', () => {
    it('should upload avatar and invalidate cache', async () => {
      const mockUrl = 'http://example.com/avatar.jpg'
      const formData = new FormData()
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockUrl,
      })

      const result = await saveAvatar(formData, '0x123')

      expect(result).toEqual(mockUrl)
      expect(mockInvalidateQueries).toHaveBeenCalled()
    })
  })

  describe('saveBanner', () => {
    it('should upload banner and invalidate cache', async () => {
      const mockUrl = 'http://example.com/banner.jpg'
      const formData = new FormData()
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockUrl,
      })

      const result = await saveBanner(formData, '0x123')

      expect(result).toEqual(mockUrl)
      expect(mockInvalidateQueries).toHaveBeenCalled()
    })
  })

  describe('scheduleMeetingFromServer', () => {
    it('should schedule meeting from server with secret', async () => {
      const mockSlot = { id: 'slot_123', start_time: '2024-01-01T10:00:00Z' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const meeting = {
        scheduler_address: '0x123',
        start_time: '2024-01-01T10:00:00Z',
        duration: 30,
      }

      const result = await scheduleMeetingFromServer('0x123', meeting as any)

      expect(result).toEqual(mockSlot)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/server/meetings`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Server-Secret': 'test-server-secret',
          }),
        })
      )
    })

    it('should throw TimeNotAvailableError on 409', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 409,
        text: async () => 'Conflict',
      })

      await expect(
        scheduleMeetingFromServer('0x123', {} as any)
      ).rejects.toThrow(TimeNotAvailableError)
    })

    it('should throw MeetingCreationError on 412', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 412,
        text: async () => 'Precondition Failed',
      })

      await expect(
        scheduleMeetingFromServer('0x123', {} as any)
      ).rejects.toThrow(MeetingCreationError)
    })

    it('should throw GateConditionNotValidError on 403', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 403,
        text: async () => 'Forbidden',
      })

      await expect(
        scheduleMeetingFromServer('0x123', {} as any)
      ).rejects.toThrow(GateConditionNotValidError)
    })
  })

  describe('getFullAccountInfo', () => {
    it('should fetch full account info from server', async () => {
      const mockAccount = {
        address: '0x123',
        name: 'Test',
        email: 'test@example.com',
      }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockAccount,
      })

      const result = await getFullAccountInfo('0x123')

      expect(result).toEqual(mockAccount)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/server/accounts/0x123`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Server-Secret': 'test-server-secret',
          }),
        })
      )
    })

    it('should throw AccountNotFoundError on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(getFullAccountInfo('0x123')).rejects.toThrow(
        AccountNotFoundError
      )
    })
  })

  describe('scheduleMeeting', () => {
    it('should schedule a meeting', async () => {
      const mockSlot = { id: 'slot_123' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await scheduleMeeting({} as any)

      expect(result).toEqual(mockSlot)
    })

    it('should throw AllMeetingSlotsUsedError on 402', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 402,
        text: async () => 'Payment Required',
      })

      await expect(scheduleMeeting({} as any)).rejects.toThrow(
        AllMeetingSlotsUsedError
      )
    })

    it('should throw TransactionIsRequired on 400', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 400,
        text: async () => 'Bad Request',
      })

      await expect(scheduleMeeting({} as any)).rejects.toThrow(
        TransactionIsRequired
      )
    })

    it('should throw TimeNotAvailableError on 409', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 409,
        text: async () => 'Conflict',
      })

      await expect(scheduleMeeting({} as any)).rejects.toThrow(
        TimeNotAvailableError
      )
    })

    it('should throw MeetingCreationError on 412', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 412,
        text: async () => 'Precondition Failed',
      })

      await expect(scheduleMeeting({} as any)).rejects.toThrow(
        MeetingCreationError
      )
    })

    it('should throw GateConditionNotValidError on 403', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 403,
        text: async () => 'Forbidden',
      })

      await expect(scheduleMeeting({} as any)).rejects.toThrow(
        GateConditionNotValidError
      )
    })
  })

  describe('scheduleMeetingSeries', () => {
    it('should schedule a meeting series', async () => {
      const mockSlot = { id: 'series_123' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await scheduleMeetingSeries({} as any)

      expect(result).toEqual(mockSlot)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/series`,
        expect.any(Object)
      )
    })

    it('should handle all error cases like scheduleMeeting', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 402,
        text: async () => 'Payment Required',
      })

      await expect(scheduleMeetingSeries({} as any)).rejects.toThrow(
        AllMeetingSlotsUsedError
      )
    })
  })

  describe('scheduleMeetingAsGuest', () => {
    it('should schedule meeting as guest', async () => {
      const mockSlot = { id: 'guest_slot_123' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await scheduleMeetingAsGuest({} as any)

      expect(result).toEqual(mockSlot)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/meetings/guest`,
        expect.any(Object)
      )
    })
  })

  describe('updateMeetingAsGuest', () => {
    it('should update meeting as guest', async () => {
      const mockSlot = { id: 'slot_123', updated: true }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await updateMeetingAsGuest('slot_123', {} as any)

      expect(result).toEqual(mockSlot)
    })

    it('should throw MeetingNotFoundError on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(updateMeetingAsGuest('slot_123', {} as any)).rejects.toThrow(
        MeetingNotFoundError
      )
    })

    it('should throw TimeNotAvailableError on 409', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 409,
        text: async () => 'Conflict',
      })

      await expect(updateMeetingAsGuest('slot_123', {} as any)).rejects.toThrow(
        TimeNotAvailableError
      )
    })
  })

  describe('apiUpdateMeeting', () => {
    it('should update a meeting', async () => {
      const mockSlot = { id: 'slot_123', updated: true }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await apiUpdateMeeting('slot_123', {} as any)

      expect(result).toEqual(mockSlot)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/slot_123`,
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('should throw MeetingNotFoundError on 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 404,
        text: async () => 'Not Found',
      })

      await expect(apiUpdateMeeting('slot_123', {} as any)).rejects.toThrow(
        MeetingNotFoundError
      )
    })
  })

  describe('apiUpdateMeetingInstance', () => {
    it('should update a meeting instance', async () => {
      const mockSlot = { id: 'instance_123' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await apiUpdateMeetingInstance('instance_123', {} as any)

      expect(result).toEqual(mockSlot)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/instances/instance_123`,
        expect.any(Object)
      )
    })
  })

  describe('apiUpdateMeetingSeries', () => {
    it('should update a meeting series', async () => {
      const mockSlot = { id: 'series_123' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlot,
      })

      const result = await apiUpdateMeetingSeries('series_123', {} as any)

      expect(result).toEqual(mockSlot)
    })
  })

  describe('cancelMeeting', () => {
    it('should cancel a meeting', async () => {
      const mockResponse = { removed: ['slot_1'] }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })

      const meeting = { id: 'meeting_123' } as any
      const result = await cancelMeeting(meeting, 'America/New_York')

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/meeting_123`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should throw TimeNotAvailableError on 409', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 409,
        text: async () => 'Conflict',
      })

      await expect(
        cancelMeeting({ id: 'meeting_123' } as any, 'America/New_York')
      ).rejects.toThrow(TimeNotAvailableError)
    })
  })

  describe('apiCancelMeetingSeries', () => {
    it('should cancel a meeting series', async () => {
      const mockResponse = { success: true }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })

      const result = await apiCancelMeetingSeries(
        randomUUID(),
        mockedMeetingInfo,
        'Africa/Lagos'
      )

      expect(result).toEqual(mockResponse)
    })
  })

  describe('cancelMeetingInstance', () => {
    it('should cancel a meeting instance', async () => {
      const mockResponse = { success: true }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })

      const result = await cancelMeetingInstance({} as any, 'Africa/Lagos')

      expect(result).toEqual(mockResponse)
    })
  })

  describe('cancelMeetingGuest', () => {
    it('should cancel meeting as guest', async () => {
      const mockResponse = { removed: ['slot_1'] }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })

      const meeting = { id: 'meeting_123' } as any
      const result = await cancelMeetingGuest(meeting, 'America/New_York')

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/meeting_123`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('isSlotFreeApiCall', () => {
    it('should check if slot is free', async () => {
      const mockResponse = { isFree: true }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })

      const result = await isSlotFreeApiCall(
        '0x123',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T10:30:00Z')
      )

      expect(result).toEqual(mockResponse)
    })

    it('should return isFree false on 409', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        status: 409,
        text: async () => 'Conflict',
      })

      const result = await isSlotFreeApiCall(
        '0x123',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T10:30:00Z')
      )

      expect(result).toEqual({ isFree: false })
    })
  })

  describe('saveMeetingType', () => {
    it('should save a new meeting type', async () => {
      const mockMeetingType = { id: 'mt_123', name: 'New Meeting' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockMeetingType,
      })

      const result = await saveMeetingType({} as any)

      expect(result).toEqual(mockMeetingType)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/type`,
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  describe('updateMeetingType', () => {
    it('should update an existing meeting type', async () => {
      const mockMeetingType = { id: 'mt_123', name: 'Updated Meeting' }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockMeetingType,
      })

      const result = await updateMeetingType({} as any)

      expect(result).toEqual(mockMeetingType)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/type`,
        expect.objectContaining({ method: 'PATCH' })
      )
    })
  })

  describe('removeMeetingType', () => {
    it('should remove a meeting type', async () => {
      const mockResponse = { success: true }
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockResponse,
      })

      const result = await removeMeetingType('mt_123')

      expect(result).toEqual(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(
        `${apiUrl}/secure/meetings/type`,
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('getMeetings', () => {
    it('should fetch meetings', async () => {
      const mockMeetings = [
        {
          id: 'meeting_1',
          start: '2024-01-01T10:00:00Z',
          end: '2024-01-01T11:00:00Z',
        },
        {
          id: 'meeting_2',
          start: '2024-01-02T10:00:00Z',
          end: '2024-01-02T11:00:00Z',
        },
      ]
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockMeetings,
      })

      const result = await getMeetings('0x123')

      expect(result).toHaveLength(2)
      expect(result[0].id).toEqual('meeting_1')
      expect(result[0].start).toBeInstanceOf(Date)
    })
  })

  describe('getBusySlots', () => {
    it('should fetch busy slots for an account', async () => {
      const mockSlots = [
        { start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' },
        { start: '2024-01-01T14:00:00Z', end: '2024-01-01T15:00:00Z' },
      ]
      mockFetchQuery.mockResolvedValue(mockSlots)

      const result = await getBusySlots(
        '0x123',
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z')
      )

      expect(result).toHaveLength(2)
      expect(result[0].start).toBeInstanceOf(Date)
    })
  })

  describe('fetchBusySlotsForMultipleAccounts', () => {
    it('should fetch busy slots for multiple accounts', async () => {
      const mockSlots = [
        {
          start: '2024-01-01T10:00:00Z',
          end: '2024-01-01T11:00:00Z',
          address: '0x123',
        },
        {
          start: '2024-01-01T14:00:00Z',
          end: '2024-01-01T15:00:00Z',
          address: '0x456',
        },
      ]
      global.fetch = jest.fn().mockResolvedValue({
        status: 200,
        json: async () => mockSlots,
      })

      const result = await fetchBusySlotsForMultipleAccounts(
        ['0x123', '0x456'],
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-31T23:59:59Z'),
        'AND' as any
      )

      expect(result).toHaveLength(2)
      expect(result[0].start).toBeInstanceOf(Date)
    })
  })

  describe('Group Management', () => {
    describe('getGroupsFull', () => {
      it('should fetch full groups', async () => {
        const mockGroups = [{ id: 'group_1', name: 'Team A' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockGroups,
        })

        const result = await getGroupsFull()

        expect(result).toEqual(mockGroups)
      })
    })

    describe('getGroupsEmpty', () => {
      it('should fetch empty groups', async () => {
        const mockGroups = [{ id: 'group_1' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockGroups,
        })

        const result = await getGroupsEmpty()

        expect(result).toEqual(mockGroups)
      })
    })

    describe('joinGroup', () => {
      it('should join a group', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await joinGroup('group_123')

        expect(result).toBe(true)
      })
    })

    describe('leaveGroup', () => {
      it('should leave a group', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await leaveGroup('group_123')

        expect(result).toBe(true)
      })
    })

    describe('deleteGroup', () => {
      it('should delete a group', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await deleteGroup('group_123')

        expect(result).toBe(true)
      })
    })

    describe('getGroup', () => {
      it('should fetch a specific group', async () => {
        const mockGroup = { id: 'group_123', name: 'Team A' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockGroup,
        })

        const result = await getGroup('group_123')

        expect(result).toEqual(mockGroup)
      })
    })
  })

  describe('Contact Management', () => {
    describe('sendContactListInvite', () => {
      it('should send contact invite', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await sendContactListInvite({
          addresses: ['0x123'],
        } as any)

        expect(result).toEqual(mockResponse)
      })
    })

    describe('getContacts', () => {
      it('should fetch contacts with pagination', async () => {
        const mockContacts = [{ address: '0x123', name: 'Contact 1' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockContacts,
        })

        const result = await getContacts(10, 0, '')

        expect(result).toEqual(mockContacts)
      })
    })

    describe('acceptContactInvite', () => {
      it('should accept contact invite', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await acceptContactInvite('invite_123')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('rejectContactInvite', () => {
      it('should reject contact invite', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await rejectContactInvite('invite_123')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('removeContact', () => {
      it('should remove a contact', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await removeContact('0x123')

        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('QuickPoll Management', () => {
    describe('createQuickPoll', () => {
      it('should create a quick poll', async () => {
        const mockPoll = { id: 'poll_123', title: 'Team Meeting' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockPoll,
        })

        const result = await createQuickPoll({ title: 'Team Meeting' } as any)

        expect(result).toEqual(mockPoll)
      })
    })

    describe('getQuickPollById', () => {
      it('should fetch quick poll by id', async () => {
        const mockPoll = { id: 'poll_123', title: 'Team Meeting' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockPoll,
        })

        const result = await getQuickPollById('poll_123')

        expect(result).toEqual(mockPoll)
      })
    })

    describe('updateQuickPoll', () => {
      it('should update a quick poll', async () => {
        const mockPoll = { id: 'poll_123', title: 'Updated Meeting' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockPoll,
        })

        const result = await updateQuickPoll('poll_123', {} as any)

        expect(result).toEqual(mockPoll)
      })
    })

    describe('deleteQuickPoll', () => {
      it('should delete a quick poll', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await deleteQuickPoll('poll_123')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('addQuickPollParticipant', () => {
      it('should add participant to quick poll', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await addQuickPollParticipant(mockQuickPollParticipant)

        expect(result).toEqual(mockResponse)
      })
    })

    describe('cancelQuickPoll', () => {
      it('should cancel a quick poll', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await cancelQuickPoll('poll_123')

        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Payment and Transaction Management', () => {
    describe('createCryptoTransaction', () => {
      it('should create crypto transaction', async () => {
        const mockTx = { id: 'tx_123', hash: '0xabc' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockTx,
        })

        const result = await createCryptoTransaction({} as any)

        expect(result).toEqual(mockTx)
      })
    })

    describe('getPaymentPreferences', () => {
      it('should fetch payment preferences', async () => {
        const mockPrefs = { stripe_enabled: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockPrefs,
        })

        const result = await getPaymentPreferences()

        expect(result).toEqual(mockPrefs)
      })
    })

    describe('updatePaymentPreferences', () => {
      it('should update payment preferences', async () => {
        const mockPrefs = { stripe_enabled: false }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockPrefs,
        })

        const result = await updatePaymentPreferences(
          accountAddress,
          mockPaymentPreferences()
        )

        expect(result).toEqual(mockPrefs)
      })
    })

    describe('getStripeOnboardingLink', () => {
      it('should get stripe onboarding link', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ url: 'https://stripe.com/onboard' }),
        })

        const result = await getStripeOnboardingLink('US')

        expect(result).toEqual('https://stripe.com/onboard')
      })
    })

    describe('generateCheckoutLink', () => {
      it('should generate checkout link', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ url: 'https://checkout.com/session' }),
        })

        const result = await generateCheckoutLink({} as any)

        expect(result).toEqual('https://checkout.com/session')
      })
    })
  })

  describe('Calendar Integration', () => {
    describe('getGoogleAuthConnectUrl', () => {
      it('should get Google auth connect URL', async () => {
        const mockResponse = { url: 'https://accounts.google.com/auth' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await getGoogleAuthConnectUrl('state123')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('getOffice365ConnectUrl', () => {
      it('should get Office365 connect URL', async () => {
        const mockResponse = { url: 'https://login.microsoftonline.com/auth' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await getOffice365ConnectUrl('state456')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('addOrUpdateICloud', () => {
      it('should add or update iCloud calendar', async () => {
        const mockResponse = { connected: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await addOrUpdateICloud({
          url: 'https://caldav.icloud.com',
          username: 'user@icloud.com',
          password: 'app-specific-password',
          calendars: [],
        })

        expect(result).toEqual(mockResponse)
      })
    })

    describe('listConnectedCalendars', () => {
      it('should list connected calendars', async () => {
        const mockCalendars = [{ id: 'cal_1', provider: 'google' }]
        mockFetchQuery.mockResolvedValue(mockCalendars)

        const result = await listConnectedCalendars(false)

        expect(result).toEqual(mockCalendars)
      })
    })
  })

  describe('Authentication', () => {
    describe('login', () => {
      it('should login successfully', async () => {
        const mockAccount = { address: '0x123', name: 'User' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockAccount,
        })

        const result = await login('0x123')

        expect(result).toEqual(mockAccount)
      })

      it('should throw AccountNotFoundError on 404', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 404,
          text: async () => 'Not Found',
        })

        await expect(login('0x123')).rejects.toThrow(AccountNotFoundError)
      })
    })

    describe('signup', () => {
      it('should signup successfully', async () => {
        const mockAccount = {
          address: '0x123',
          name: 'New User',
          jti: 'jwt_123',
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockAccount,
        })

        const result = await signup(
          '0x123',
          'signature',
          'America/New_York',
          12345
        )

        expect(result).toEqual(mockAccount)
        expect(global.fetch).toHaveBeenCalledWith(
          `${apiUrl}/auth/signup`,
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              address: '0x123',
              nonce: 12345,
              signature: 'signature',
              timezone: 'America/New_York',
            }),
          })
        )
      })
    })
  })

  describe('Availability Blocks', () => {
    describe('getAvailabilityBlocks', () => {
      it('should fetch availability blocks', async () => {
        const mockBlocks = [{ id: 'block_1', name: 'Morning Hours' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockBlocks,
        })

        const result = await getAvailabilityBlocks()

        expect(result).toEqual(mockBlocks)
      })
    })

    describe('createAvailabilityBlock', () => {
      it('should create availability block', async () => {
        const mockBlock = { id: 'block_123', name: 'New Block' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockBlock,
        })

        const result = await createAvailabilityBlock({} as any)

        expect(result).toEqual(mockBlock)
      })
    })

    describe('updateAvailabilityBlock', () => {
      it('should update availability block', async () => {
        const mockBlock = { id: 'block_123', name: 'Updated Block' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockBlock,
        })

        const result = await updateAvailabilityBlock({} as any)

        expect(result).toEqual(mockBlock)
      })
    })

    describe('deleteAvailabilityBlock', () => {
      it('should delete availability block', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({}),
        })

        await deleteAvailabilityBlock('block_123')

        expect(global.fetch).toHaveBeenCalledWith(
          `${apiUrl}/secure/availabilities/block_123`,
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })
  })

  describe('Meeting Types', () => {
    describe('getMeetingTypes', () => {
      it('should fetch meeting types', async () => {
        const mockTypes = [{ id: 'mt_1', name: '30 min meeting' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockTypes,
        })

        const result = await getMeetingTypes()

        expect(result).toEqual(mockTypes)
      })
    })

    describe('getMeetingType', () => {
      it('should fetch single meeting type', async () => {
        const mockType = { id: 'mt_123', name: '30 min meeting' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockType,
        })

        const result = await getMeetingType('mt_123')

        expect(result).toEqual(mockType)
      })
    })
  })

  describe('Notification Management', () => {
    describe('getNotificationSubscriptions', () => {
      it('should fetch notification subscriptions', async () => {
        const mockNotifications = { email: true, sms: false }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockNotifications,
        })

        const result = await getNotificationSubscriptions()

        expect(result).toEqual(mockNotifications)
      })
    })

    describe('setNotificationSubscriptions', () => {
      it('should update notification subscriptions', async () => {
        const mockNotifications = { email: false, sms: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockNotifications,
        })

        const result = await setNotificationSubscriptions({
          email: false,
        } as any)

        expect(result).toEqual(mockNotifications)
      })

      it('should update with verification code', async () => {
        const mockNotifications = { email: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockNotifications,
        })

        await setNotificationSubscriptions({ email: true } as any, 'code123')

        expect(global.fetch).toHaveBeenCalledWith(
          `${apiUrl}/secure/notifications?code=code123`,
          expect.any(Object)
        )
      })
    })
  })

  describe('Security Features', () => {
    describe('verifyPin', () => {
      it('should verify PIN', async () => {
        const mockResponse = { valid: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await verifyPin('1234')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('sendResetPinLink', () => {
      it('should send reset PIN link', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await sendResetPinLink('test@example.com')

        expect(result).toEqual(mockResponse)
      })
    })

    describe('sendEnablePinLink', () => {
      it('should send enable PIN link', async () => {
        const mockResponse = { success: true }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await sendEnablePinLink('test@example.com')

        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Subscription Management', () => {
    describe('subscribeWithCoupon', () => {
      it('should subscribe with coupon', async () => {
        const mockResponse = { subscription_id: 'sub_123' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await subscribeWithCoupon({} as any)

        expect(result).toEqual(mockResponse)
      })
    })

    describe('updateCustomSubscriptionDomain', () => {
      it('should update custom subscription domain', async () => {
        const mockResponse = { domain: 'custom.example.com' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResponse,
        })

        const result = await updateCustomSubscriptionDomain({} as any)

        expect(result).toEqual(mockResponse)
      })
    })
  })

  describe('Bulk Operations', () => {
    describe('fetchBusySlotsRawForMultipleAccounts', () => {
      it('should fetch busy slots for multiple accounts', async () => {
        const mockAccounts = ['0x123', '0x456']
        const mockSlots = [
          {
            start: '2024-01-01T10:00:00Z',
            end: '2024-01-01T11:00:00Z',
            address: '0x123',
          },
          {
            start: '2024-01-02T10:00:00Z',
            end: '2024-01-02T11:00:00Z',
            address: '0x456',
          },
        ]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockSlots,
        })

        const result = await fetchBusySlotsRawForMultipleAccounts(
          mockAccounts,
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )

        expect(result).toHaveLength(2)
        expect(result[0].start).toBeInstanceOf(Date)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/meetings/busy/team'),
          expect.any(Object)
        )
      })

      it('should handle empty account list', async () => {
        const mockSlots: any[] = []
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockSlots,
        })

        const result = await fetchBusySlotsRawForMultipleAccounts(
          [],
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )

        expect(result).toEqual([])
      })
    })

    describe('fetchBusySlotsRawForQuickPollParticipants', () => {
      it('should fetch busy slots for quick poll participants', async () => {
        const mockParticipants = [
          { account_address: '0x123' },
          { account_address: '0x456' },
        ]
        const mockSlots = [
          {
            start: '2024-01-01T10:00:00Z',
            end: '2024-01-01T11:00:00Z',
            address: '0x123',
          },
          {
            start: '2024-01-02T10:00:00Z',
            end: '2024-01-02T11:00:00Z',
            address: '0x456',
          },
        ]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockSlots,
        })

        const result = await fetchBusySlotsRawForQuickPollParticipants(
          mockParticipants as any,
          new Date('2024-01-01'),
          new Date('2024-01-31')
        )

        expect(result).toHaveLength(2)
        expect(result[0].start).toBeInstanceOf(Date)
      })
    })
  })

  describe('Group Management Extended', () => {
    describe('getGroupsFullWithMetadata', () => {
      it('should fetch groups with metadata', async () => {
        const mockGroups = {
          groups: [{ id: 'group-1', name: 'Test Group' }],
          metadata: { total: 1, page: 1 },
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockGroups,
        })

        const result = await getGroupsFullWithMetadata()

        expect(result).toEqual(mockGroups)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/group'),
          expect.any(Object)
        )
      })
    })

    describe('removeGroupMember', () => {
      it('should remove a group member', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await removeGroupMember('group-123', '0xMember', false)

        expect(result).toBe(true)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/group/group-123/remove'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    })

    describe('editGroup', () => {
      it('should update group details', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await editGroup(
          'group-123',
          'Updated Group',
          undefined,
          undefined,
          'New description'
        )

        expect(result).toBe(true)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/group/group-123'),
          expect.objectContaining({
            method: 'PUT',
          })
        )
      })
    })

    describe('uploadGroupAvatar', () => {
      it('should upload group avatar', async () => {
        const mockFile = new File(['test'], 'avatar.png', {
          type: 'image/png',
        })
        const mockFormData = new FormData()
        mockFormData.append('file', mockFile)
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ url: 'https://example.com/avatar.png' }),
        })

        const result = await uploadGroupAvatar('group-123', mockFormData)

        expect(result).toEqual({ url: 'https://example.com/avatar.png' })
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/group/group-123/avatar'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('getGroupMemberAvailabilities', () => {
      it('should fetch member availabilities for a group', async () => {
        const mockAvailabilities = [{ member_address: '0x123', blocks: [] }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockAvailabilities,
        })

        const result = await getGroupMemberAvailabilities(
          'group-123',
          accountAddress
        )

        expect(result).toEqual(mockAvailabilities)
      })
    })
  })

  describe('Calendar Operations Extended', () => {
    describe('syncMeeting', () => {
      it('should sync a meeting to calendars', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        await syncMeeting({ id: 'meeting-123' } as any, 'slot-123')

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/meetings/sync'),
          expect.any(Object)
        )
      })

      it('should silently handle sync errors', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 500,
          text: async () => 'Server Error',
        })

        // syncMeeting swallows errors - should not throw
        await expect(
          syncMeeting({ id: 'meeting-123' } as any, 'slot-123')
        ).resolves.toBeUndefined()
      })
    })

    describe('deleteConnectedCalendar', () => {
      it('should delete a connected calendar', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await deleteConnectedCalendar(
          'calendar-123',
          TimeSlotSource.GOOGLE
        )

        expect(result).toEqual({ success: true })
        expect(queryClient.invalidateQueries).toHaveBeenCalled()
      })
    })

    describe('updateConnectedCalendar', () => {
      it('should update calendar settings', async () => {
        const calendarData = {
          id: 'cal-123',
          enabled: true,
          sync: true,
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => calendarData,
        })

        const result = await updateConnectedCalendar(
          randomUUID(),
          TimeSlotSource.GOOGLE,
          []
        )

        expect(result).toEqual(calendarData)
        expect(queryClient.invalidateQueries).toHaveBeenCalled()
      })
    })
  })

  describe('Subscription and Billing', () => {
    describe('syncSubscriptions', () => {
      it('should sync subscription status', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ synced: true }),
        })

        const result = await syncSubscriptions()

        expect(result).toEqual({ synced: true })
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/subscriptions/sync'),
          expect.any(Object)
        )
      })
    })

    describe('getSubscriptionHistory', () => {
      it('should fetch subscription history', async () => {
        const mockHistory = [
          { id: 'sub-1', status: 'active', created_at: '2024-01-01' },
        ]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockHistory,
        })

        const result = await getSubscriptionHistory()

        expect(result).toEqual(mockHistory)
      })
    })

    describe('getBillingPlans', () => {
      it('should fetch available billing plans', async () => {
        const mockPlans = [
          { id: 'plan-1', name: 'Pro', price: 10 },
          { id: 'plan-2', name: 'Enterprise', price: 50 },
        ]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ plans: mockPlans }),
        })

        const result = await getBillingPlans()

        expect(result).toEqual(mockPlans)
      })
    })

    describe('subscribeToBillingPlan', () => {
      it('should subscribe to a billing plan', async () => {
        const subscriptionData = {
          plan_id: 'plan-1',
          payment_method: 'card',
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ subscription_id: 'sub-123' }),
        })

        const result = await subscribeToBillingPlan(subscriptionData as any)

        expect(result).toEqual({ subscription_id: 'sub-123' })
      })

      it('should handle payment required error', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 402,
          json: async () => ({ error: 'Payment required' }),
        })

        await expect(
          subscribeToBillingPlan({ plan_id: 'plan-1' } as any)
        ).rejects.toThrow()
      })
    })

    describe('cancelCryptoSubscription', () => {
      it('should cancel crypto subscription', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ cancelled: true }),
        })

        const result = await cancelCryptoSubscription()

        expect(result).toEqual({ cancelled: true })
      })
    })
  })

  describe('Availability Blocks Extended', () => {
    describe('duplicateAvailabilityBlock', () => {
      it('should duplicate an availability block', async () => {
        const mockBlock = {
          id: 'block-new',
          name: 'Copy of Block',
          days: [1, 2, 3],
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockBlock,
        })

        const result = await duplicateAvailabilityBlock({
          id: 'block-123',
          modifiedData: {},
        } as any)

        expect(result).toEqual(mockBlock)
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/secure/availabilities/block-123'),
          expect.objectContaining({ method: 'POST' })
        )
      })
    })

    describe('getMeetingTypesForAvailabilityBlock', () => {
      it('should fetch meeting types using an availability block', async () => {
        const mockMeetingTypes = [{ id: 'type-1', name: 'Meeting Type 1' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockMeetingTypes,
        })

        const result = await getMeetingTypesForAvailabilityBlock('block-123')

        expect(result).toEqual(mockMeetingTypes)
      })
    })
  })

  describe('Advanced Features', () => {
    describe('getGateCondition', () => {
      it('should fetch gate condition for meeting type', async () => {
        const mockGate = {
          conditions: [],
          elements: [{ type: 'ERC20', itemId: '0x123' }],
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockGate,
        })

        const result = await getGateCondition('type-123')

        expect(result).toEqual(mockGate)
      })
    })

    describe('getWalletPOAPs', () => {
      it('should fetch POAPs for wallet', async () => {
        const mockPOAPs = [{ event: { id: 1, name: 'POAP Event' } }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockPOAPs,
        })

        const result = await getWalletPOAPs('0x123')

        expect(result).toEqual(mockPOAPs)
      })
    })

    describe('createHuddleRoom', () => {
      it('should create a Huddle room', async () => {
        const mockRoom = {
          roomId: 'room-123',
          url: 'https://huddle.com/room-123',
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockRoom,
        })

        const result = await createHuddleRoom('meeting-123')

        expect(result).toEqual(mockRoom)
      })
    })

    describe('createZoomMeeting', () => {
      it('should create a Zoom meeting', async () => {
        const mockMeeting = {
          id: 'zoom-123',
          join_url: 'https://zoom.us/j/123',
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockMeeting,
        })

        const result = await createZoomMeeting({
          topic: 'Test Meeting',
          start_time: new Date('2024-01-01'),
        } as any)

        expect(result).toEqual(mockMeeting)
      })
    })

    describe('validateWebdav', () => {
      it('should validate WebDAV credentials', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ valid: true }),
        })

        const result = await validateWebdav(
          'https://example.com/dav',
          'user',
          'pass'
        )

        expect(result).toEqual({ valid: true })
      })

      it('should handle invalid credentials', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 401,
          json: async () => ({ error: 'Unauthorized' }),
        })

        await expect(
          validateWebdav('https://example.com/dav', 'user', 'wrong')
        ).rejects.toThrow()
      })
    })
  })

  describe('Discord and Telegram', () => {
    describe('generateDiscordAccount', () => {
      it('should generate Discord account link', async () => {
        const mockAccount = {
          discord_id: 'discord-123',
          linked: true,
        }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockAccount,
        })

        const result = await generateDiscordAccount(randomUUID())

        expect(result).toEqual(mockAccount)
      })
    })

    describe('deleteDiscordIntegration', () => {
      it('should delete Discord integration', async () => {
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => ({ success: true }),
        })

        const result = await deleteDiscordIntegration()

        expect(result).toEqual({ success: true })
      })
    })
  })

  describe('Utility Functions', () => {
    describe('searchForAccounts', () => {
      it('should search for accounts', async () => {
        const mockResults = [{ address: '0x123', name: 'User 1' }]
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockResults,
        })

        const result = await searchForAccounts('user', 0)

        expect(result).toEqual(mockResults)
      })
    })

    describe('getCoinConfig', () => {
      it('should fetch coin configuration', async () => {
        const mockConfig = { btc: { enabled: true } }
        mockFetchQuery.mockResolvedValue(mockConfig)

        const result = await getCoinConfig()

        expect(result).toEqual(mockConfig)
      })
    })

    describe('getUserLocale', () => {
      it('should fetch user locale', async () => {
        const mockLocale = { language: 'en', country: 'US' }
        global.fetch = jest.fn().mockResolvedValue({
          status: 200,
          json: async () => mockLocale,
        })

        const result = await getUserLocale()

        expect(result).toEqual(mockLocale)
      })
    })
  })
})

import faker from '@faker-js/faker'
import { randomUUID } from 'crypto'
// Import additional functions for extended tests
import {
  mockAccount,
  mockAddQuickPollParticipant,
  mockMeetingInfo,
  mockPaymentPreferences,
} from '@/testing/mocks'
import { ParticipantType, ParticipationStatus } from '@/types/ParticipantInfo'
import {
  acceptContactInvite,
  addOrUpdateICloud,
  addQuickPollParticipant,
  cancelQuickPoll,
  createAvailabilityBlock,
  createCryptoTransaction,
  createQuickPoll,
  deleteAvailabilityBlock,
  deleteQuickPoll,
  generateCheckoutLink,
  getAvailabilityBlocks,
  getCoinConfig,
  getContacts,
  getGoogleAuthConnectUrl,
  getMeetingType,
  getMeetingTypes,
  getNotificationSubscriptions,
  getOffice365ConnectUrl,
  getPaymentPreferences,
  getQuickPollById,
  getStripeOnboardingLink,
  getUserLocale,
  listConnectedCalendars,
  login,
  rejectContactInvite,
  removeContact,
  searchForAccounts,
  sendContactListInvite,
  sendEnablePinLink,
  sendResetPinLink,
  setNotificationSubscriptions,
  signup,
  subscribeWithCoupon,
  updateAvailabilityBlock,
  updateCustomSubscriptionDomain,
  updatePaymentPreferences,
  updateQuickPoll,
  verifyPin,
} from '@/utils/api_helper'
import { MeetingInfo, TimeSlotSource } from '../../types/Meeting'
