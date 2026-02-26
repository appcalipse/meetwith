/**
 * Unit tests for /api/secure/meetings/series endpoint
 * Testing recurring meeting creation
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getAccountFromDB: jest.fn(),
  saveRecurringMeetings: jest.fn(),
}))

jest.mock('@/utils/user_manager', () => ({
  getParticipantBaseInfoFromAccount: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn(handler => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/meetings/series'
import * as database from '@/utils/database'
import {
  AllMeetingSlotsUsedError,
  GateConditionNotValidError,
  MeetingCreationError,
  TimeNotAvailableError,
  TransactionIsRequired,
} from '@/utils/errors'
import * as userManager from '@/utils/user_manager'

describe('/api/secure/meetings/series', () => {
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock
  const mockSaveRecurringMeetings = database.saveRecurringMeetings as jest.Mock
  const mockGetParticipantBaseInfoFromAccount =
    userManager.getParticipantBaseInfoFromAccount as jest.Mock
  const mockSentry = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      session: {
        account: {
          address: '0x1234567890abcdef',
          name: 'Test User',
        },
      } as any,
      body: {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          count: 5,
        },
      },
    }

    res = {
      status: statusMock,
    }

    mockGetParticipantBaseInfoFromAccount.mockReturnValue({
      address: '0x1234567890abcdef',
      name: 'Test User',
    })
  })

  describe('Method Validation', () => {
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

  describe('Successful Series Creation', () => {
    it('should create recurring meeting series successfully', async () => {
      const mockAccount = {
        address: '0x1234567890abcdef',
        name: 'Test User',
      }

      const mockMeetingResult = {
        id: 'series_123',
        title: 'Weekly Standup',
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          count: 5,
        },
      }

      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockSaveRecurringMeetings.mockResolvedValue(mockMeetingResult)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockSaveRecurringMeetings).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockMeetingResult)
    })

    it('should handle daily recurrence', async () => {
      req.body = {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        recurrence: {
          frequency: 'daily',
          interval: 1,
          count: 10,
        },
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'daily_series' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle monthly recurrence', async () => {
      req.body = {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        recurrence: {
          frequency: 'monthly',
          interval: 1,
          count: 12,
        },
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'monthly_series' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle recurrence with until date', async () => {
      req.body = {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        recurrence: {
          frequency: 'weekly',
          interval: 2,
          until: '2024-12-31',
        },
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'until_series' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Validation Errors', () => {
    it('should return 403 when scheduling for someone else', async () => {
      req.body = {
        participants_mapping: [
          { account_address: '0xotheruser' }, // Not the current user
        ],
      }

      mockGetAccountFromDB.mockResolvedValue({
        address: '0x1234567890abcdef',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(sendMock).toHaveBeenCalledWith(
        "You can't schedule a meeting for someone else"
      )
    })

    it('should return 403 when participant list is empty', async () => {
      req.body = {
        participants_mapping: [],
      }

      mockGetAccountFromDB.mockResolvedValue({
        address: '0x1234567890abcdef',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should allow multiple participants including self', async () => {
      req.body = {
        participants_mapping: [
          { account_address: '0x1234567890abcdef' },
          { account_address: '0xotheruser' },
        ],
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'multi_series' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
    })

    it('should return 409 for time not available error', async () => {
      mockSaveRecurringMeetings.mockRejectedValue(new TimeNotAvailableError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should return 412 for meeting creation error', async () => {
      mockSaveRecurringMeetings.mockRejectedValue(new MeetingCreationError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(412)
    })

    it('should return 403 for gate condition error', async () => {
      mockSaveRecurringMeetings.mockRejectedValue(
        new GateConditionNotValidError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 402 for all meeting slots used error', async () => {
      mockSaveRecurringMeetings.mockRejectedValue(
        new AllMeetingSlotsUsedError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(402)
    })

    it('should return 400 for transaction required error', async () => {
      mockSaveRecurringMeetings.mockRejectedValue(new TransactionIsRequired())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 500 and capture exception for Error objects', async () => {
      mockSaveRecurringMeetings.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('Database error')
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should return 500 for non-Error objects', async () => {
      mockSaveRecurringMeetings.mockRejectedValue('String error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('Unknown error occurred')
    })

    it('should handle account fetch errors', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Account not found'))

      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow('Account not found')
    })
  })

  describe('Edge Cases', () => {
    it('should handle case-insensitive address matching', async () => {
      req.body = {
        participants_mapping: [
          { account_address: '0x1234567890ABCDEF' }, // Different casing of same address
        ],
      }

      mockGetAccountFromDB.mockResolvedValue({
        address: '0x1234567890abcdef',
      })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'case_series' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should match despite different casing
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing session', async () => {
      req.session = undefined

      // Should fail when trying to access account.address
      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow()
    })

    it('should handle complex recurrence patterns', async () => {
      req.body = {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        recurrence: {
          frequency: 'weekly',
          interval: 2,
          count: 10,
          byweekday: ['MO', 'WE', 'FR'],
        },
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'complex_series' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing recurrence field', async () => {
      req.body = {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        // No recurrence field
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockSaveRecurringMeetings.mockResolvedValue({ id: 'single_meeting' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })
})
