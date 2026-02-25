/**
 * Unit tests for /api/secure/meetings/[id] endpoint
 * Testing meeting CRUD operations
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getMeetingFromDB: jest.fn(),
  getAccountFromDB: jest.fn(),
  updateMeeting: jest.fn(),
  deleteMeetingFromDB: jest.fn(),
}))

jest.mock('@/utils/user_manager', () => ({
  getParticipantBaseInfoFromAccount: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn(handler => handler),
}))

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}))

import * as Sentry from '@sentry/node'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/meetings/[id]/index'
import * as database from '@/utils/database'
import {
  GateConditionNotValidError,
  MeetingChangeConflictError,
  MeetingCreationError,
  MeetingSessionNotFoundError,
  TimeNotAvailableError,
  TransactionIsRequired,
} from '@/utils/errors'
import * as userManager from '@/utils/user_manager'

describe('/api/secure/meetings/[id]', () => {
  const mockGetMeetingFromDB = database.getMeetingFromDB as jest.Mock
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock
  const mockUpdateMeeting = database.updateMeeting as jest.Mock
  const mockDeleteMeetingFromDB = database.deleteMeetingFromDB as jest.Mock
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
      query: { id: 'meeting_123' },
      session: {
        account: {
          address: '0x1234567890abcdef',
          name: 'Test User',
        },
      } as any,
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

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('POST - Update Meeting', () => {
    beforeEach(() => {
      req.method = 'POST'
      req.body = {
        participants_mapping: [{ account_address: '0x1234567890abcdef' }],
        slotsToRemove: [],
      }
    })

    it('should update meeting successfully', async () => {
      const mockExistingSlot = {
        id: 'meeting_123',
        account_address: '0x1234567890abcdef',
        title: 'Meeting',
      }

      const mockAccount = {
        address: '0x1234567890abcdef',
        name: 'Test User',
      }

      const mockUpdatedMeeting = {
        id: 'meeting_123',
        title: 'Updated Meeting',
      }

      mockGetMeetingFromDB.mockResolvedValue(mockExistingSlot)
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockUpdateMeeting.mockResolvedValue(mockUpdatedMeeting)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingFromDB).toHaveBeenCalledWith('meeting_123')
      expect(mockUpdateMeeting).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockUpdatedMeeting)
    })

    it('should return 400 when id is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Required parameter not provided')
    })

    it('should return 403 when user is not meeting owner', async () => {
      const mockExistingSlot = {
        id: 'meeting_123',
        account_address: '0xdifferentuser',
      }

      mockGetMeetingFromDB.mockResolvedValue(mockExistingSlot)
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(sendMock).toHaveBeenCalledWith(
        "You can't edit a meeting that is not yours"
      )
    })

    it('should return 403 when scheduling for someone else', async () => {
      const mockExistingSlot = {
        account_address: '0x1234567890abcdef',
      }

      req.body = {
        participants_mapping: [
          { account_address: '0xotheruser' }, // Not the current user
        ],
        slotsToRemove: [],
      }

      mockGetMeetingFromDB.mockResolvedValue(mockExistingSlot)
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(sendMock).toHaveBeenCalledWith(
        "You can't schedule a meeting for someone else"
      )
    })

    it('should allow deletion even when not a participant', async () => {
      const mockExistingSlot = {
        account_address: '0x1234567890abcdef',
      }

      req.body = {
        participants_mapping: [{ account_address: '0xotheruser' }],
        slotsToRemove: ['meeting_123'], // Deleting this slot
      }

      mockGetMeetingFromDB.mockResolvedValue(mockExistingSlot)
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockResolvedValue({ id: 'meeting_123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateMeeting).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 409 for time not available error', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(new TimeNotAvailableError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should return 412 for meeting creation error', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(new MeetingCreationError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(412)
    })

    it('should return 417 for meeting change conflict error', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(new MeetingChangeConflictError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(417)
    })

    it('should return 405 for gate condition error', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(new GateConditionNotValidError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 404 for meeting session not found', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(
        new MeetingSessionNotFoundError('Session not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 400 for transaction required error', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(new TransactionIsRequired())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 500 and capture exception for unknown errors', async () => {
      mockGetMeetingFromDB.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeeting.mockRejectedValue(new Error('Unknown error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })
  })

  describe('DELETE - Remove Meeting', () => {
    beforeEach(() => {
      req.method = 'DELETE'
      req.body = {
        meeting: {
          participants: [],
          related_slot_ids: [],
          meeting_id: 'meet_123',
          title: 'Test Meeting',
        },
        currentTimezone: 'America/New_York',
      }
    })

    it('should delete meeting successfully', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteMeetingFromDB).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ removed: ['meeting_123'] })
    })

    it('should delete meeting with related slots', async () => {
      req.body = {
        meeting: {
          participants: [],
          related_slot_ids: ['slot_1', 'slot_2'],
          meeting_id: 'meet_123',
        },
        currentTimezone: 'UTC',
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith({
        removed: ['meeting_123', 'slot_1', 'slot_2'],
      })
    })

    it('should return 400 when id is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 409 for time conflict errors', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(new TimeNotAvailableError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should return 417 for change conflict errors', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(
        new MeetingChangeConflictError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(417)
    })
  })
})
