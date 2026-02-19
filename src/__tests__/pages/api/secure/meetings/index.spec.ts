/**
 * Unit tests for /api/secure/meetings (index) endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getAccountFromDB: jest.fn(),
  getAccountNotificationSubscriptions: jest.fn(),
  setAccountNotificationSubscriptions: jest.fn(),
  saveMeeting: jest.fn(),
}))

jest.mock('@/utils/user_manager', () => ({
  getParticipantBaseInfoFromAccount: jest.fn(),
}))

jest.mock('@/utils/validations', () => ({
  isValidEmail: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/meetings/index'
import * as database from '@/utils/database'
import * as userManager from '@/utils/user_manager'
import * as validations from '@/utils/validations'
import * as Sentry from '@sentry/nextjs'
import { 
  TimeNotAvailableError,
  MeetingCreationError,
  GateConditionNotValidError,
  AllMeetingSlotsUsedError,
  TransactionIsRequired,
} from '@/utils/errors'
import { NotificationChannel } from '@/types/AccountNotifications'

describe('/api/secure/meetings/index', () => {
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock
  const mockGetAccountNotificationSubscriptions = database.getAccountNotificationSubscriptions as jest.Mock
  const mockSetAccountNotificationSubscriptions = database.setAccountNotificationSubscriptions as jest.Mock
  const mockSaveMeeting = database.saveMeeting as jest.Mock
  const mockGetParticipantBaseInfoFromAccount = userManager.getParticipantBaseInfoFromAccount as jest.Mock
  const mockIsValidEmail = validations.isValidEmail as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockAccount = {
    address: '0x1234567890abcdef',
    nonce: 12345,
    internal_pub_key: 'pubkey123',
    preferences: {
      name: 'Test User',
    },
  }

  const mockParticipant = {
    account_address: '0x1234567890abcdef',
    name: 'Test User',
  }

  const mockMeetingRequest = {
    participants_mapping: [
      {
        account_address: '0x1234567890abcdef',
        email: 'test@example.com',
      },
    ],
    emailToSendReminders: 'test@example.com',
    start_time: '2024-02-01T10:00:00Z',
    end_time: '2024-02-01T11:00:00Z',
    title: 'Test Meeting',
  }

  const mockMeetingResult = {
    id: 'meeting-123',
    ...mockMeetingRequest,
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: mockMeetingRequest,
      session: {
        account: {
          address: '0x1234567890abcdef',
        },
      } as any,
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/secure/meetings', () => {
    it('should create meeting successfully', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [],
      })
      mockSetAccountNotificationSubscriptions.mockResolvedValue(undefined)
      mockSaveMeeting.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockSaveMeeting).toHaveBeenCalledWith(mockParticipant, mockMeetingRequest)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockMeetingResult)
    })

    it('should return 403 when trying to schedule for someone else', async () => {
      req.body = {
        ...mockMeetingRequest,
        participants_mapping: [
          {
            account_address: '0xdifferentaddress',
          },
        ],
      }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(sendMock).toHaveBeenCalledWith("You can't schedule a meeting for someone else")
    })

    it('should add email notification subscription if valid email provided', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [],
      })
      mockSaveMeeting.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSetAccountNotificationSubscriptions).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        {
          notification_types: [
            {
              channel: NotificationChannel.EMAIL,
              destination: 'test@example.com',
              disabled: false,
            },
          ],
        }
      )
    })

    it('should not duplicate email notification subscription', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          {
            channel: NotificationChannel.EMAIL,
            destination: 'existing@example.com',
            disabled: false,
          },
        ],
      })
      mockSaveMeeting.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSetAccountNotificationSubscriptions).not.toHaveBeenCalled()
    })

    it('should return 409 for TimeNotAvailableError', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({ notification_types: [] })
      mockSaveMeeting.mockRejectedValue(new TimeNotAvailableError('Time not available'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should return 412 for MeetingCreationError', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({ notification_types: [] })
      mockSaveMeeting.mockRejectedValue(new MeetingCreationError('Creation failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(412)
    })

    it('should return 403 for GateConditionNotValidError', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({ notification_types: [] })
      mockSaveMeeting.mockRejectedValue(new GateConditionNotValidError('Gate condition not met'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 402 for AllMeetingSlotsUsedError', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({ notification_types: [] })
      mockSaveMeeting.mockRejectedValue(new AllMeetingSlotsUsedError('All slots used'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(402)
    })

    it('should return 400 for TransactionIsRequired', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({ notification_types: [] })
      mockSaveMeeting.mockRejectedValue(new TransactionIsRequired('Transaction required'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 500 for generic errors', async () => {
      const genericError = new Error('Something went wrong')
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({ notification_types: [] })
      mockSaveMeeting.mockRejectedValue(genericError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(genericError)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('Something went wrong')
    })

    it('should handle invalid email gracefully', async () => {
      req.body = {
        ...mockMeetingRequest,
        emailToSendReminders: 'invalid-email',
      }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(false)
      mockSaveMeeting.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSetAccountNotificationSubscriptions).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing emailToSendReminders', async () => {
      req.body = {
        ...mockMeetingRequest,
        emailToSendReminders: undefined,
      }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockSaveMeeting.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockIsValidEmail).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle notification subscription errors gracefully', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockGetParticipantBaseInfoFromAccount.mockReturnValue(mockParticipant)
      mockIsValidEmail.mockReturnValue(true)
      mockGetAccountNotificationSubscriptions.mockRejectedValue(new Error('DB error'))
      mockSaveMeeting.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Non-POST methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
