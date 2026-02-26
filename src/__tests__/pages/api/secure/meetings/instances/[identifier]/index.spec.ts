/**
 * Unit tests for /api/secure/meetings/instances/[identifier] endpoint
 * Testing meeting instance CRUD operations
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getSlotInstance: jest.fn(),
  getAccountFromDB: jest.fn(),
  updateMeetingInstance: jest.fn(),
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
import handler from '@/pages/api/secure/meetings/instances/[identifier]/index'
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

describe('/api/secure/meetings/instances/[identifier]', () => {
  const mockGetSlotInstance = database.getSlotInstance as jest.Mock
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock
  const mockUpdateMeetingInstance = database.updateMeetingInstance as jest.Mock
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
      method: 'GET',
      query: { identifier: 'instance_123' },
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
    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for OPTIONS requests', async () => {
      req.method = 'OPTIONS'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('GET - Retrieve Meeting Instance', () => {
    it('should return meeting instance successfully', async () => {
      const mockInstance = {
        id: 'instance_123',
        meeting_id: 'meeting_456',
        title: 'Team Sync',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        account_address: '0x1234567890abcdef',
      }

      mockGetSlotInstance.mockResolvedValue(mockInstance)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSlotInstance).toHaveBeenCalledWith('instance_123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockInstance)
    })

    it('should return 500 when instance not found', async () => {
      mockGetSlotInstance.mockRejectedValue(new Error('Instance not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unknown error occurred' })
    })

    it('should handle database errors gracefully', async () => {
      mockGetSlotInstance.mockRejectedValue(
        new Error('Database connection failed')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle null instance response', async () => {
      mockGetSlotInstance.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(null)
    })
  })

  describe('POST - Update Meeting Instance', () => {
    beforeEach(() => {
      req.method = 'POST'
      req.body = {
        title: 'Updated Meeting',
        start_time: '2024-01-15T14:00:00Z',
      }
    })

    it('should update meeting instance successfully', async () => {
      const mockExistingInstance = {
        id: 'instance_123',
        account_address: '0x1234567890abcdef',
      }

      const mockUpdatedInstance = {
        id: 'instance_123',
        title: 'Updated Meeting',
        start_time: '2024-01-15T14:00:00Z',
      }

      mockGetSlotInstance.mockResolvedValue(mockExistingInstance)
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockResolvedValue(mockUpdatedInstance)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSlotInstance).toHaveBeenCalledWith('instance_123')
      expect(mockUpdateMeetingInstance).toHaveBeenCalledWith(
        expect.any(Object),
        req.body
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockUpdatedInstance)
    })

    it('should return 403 when user is not meeting owner', async () => {
      const mockExistingInstance = {
        id: 'instance_123',
        account_address: '0xdifferentuser',
      }

      mockGetSlotInstance.mockResolvedValue(mockExistingInstance)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(sendMock).toHaveBeenCalledWith(
        "You can't edit a meeting that is not yours"
      )
    })

    it('should return 409 for time not available error', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(new TimeNotAvailableError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should return 412 for meeting creation error', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(new MeetingCreationError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(412)
    })

    it('should return 417 for meeting change conflict error', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(
        new MeetingChangeConflictError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(417)
    })

    it('should return 405 for gate condition error', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(
        new GateConditionNotValidError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 404 for meeting session not found', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(
        new MeetingSessionNotFoundError('meeting_123')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith(
        'Meeting session not found for id: meeting_123'
      )
    })

    it('should return 400 for transaction required error', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(new TransactionIsRequired())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 500 and capture exception for unknown errors', async () => {
      mockGetSlotInstance.mockResolvedValue({
        account_address: '0x1234567890abcdef',
      })
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockUpdateMeetingInstance.mockRejectedValue(new Error('Unknown error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })
  })

  describe('DELETE - Remove Meeting Instance', () => {
    beforeEach(() => {
      req.method = 'DELETE'
      req.body = {
        meeting: {
          participants: [],
          related_slot_ids: [],
          meeting_id: 'meeting_456',
          title: 'Team Sync',
        },
        currentTimezone: 'UTC',
      }
    })

    it('should delete meeting instance successfully', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteMeetingFromDB).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ removed: ['instance_123'] })
    })

    it('should delete instance with related slots', async () => {
      req.body = {
        meeting: {
          participants: [],
          related_slot_ids: ['slot_1', 'slot_2'],
          meeting_id: 'meeting_456',
        },
        currentTimezone: 'America/New_York',
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith({
        removed: ['instance_123', 'slot_1', 'slot_2'],
      })
    })

    it('should return 400 when identifier is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('Required parameter not provided')
    })

    it('should handle guest participants in deletion', async () => {
      req.body = {
        meeting: {
          participants: [
            { guest_email: 'guest1@example.com' },
            { guest_email: 'guest2@example.com' },
          ],
          related_slot_ids: [],
          meeting_id: 'meeting_456',
        },
        currentTimezone: 'UTC',
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteMeetingFromDB).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.arrayContaining([
          expect.objectContaining({ guest_email: 'guest1@example.com' }),
          expect.objectContaining({ guest_email: 'guest2@example.com' }),
        ]),
        expect.any(String),
        expect.any(String),
        undefined,
        undefined
      )
    })

    it('should return 409 for time not available error', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(new TimeNotAvailableError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should return 417 for change conflict error', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(
        new MeetingChangeConflictError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(417)
    })

    it('should return 412 for meeting creation error', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(new MeetingCreationError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(412)
    })

    it('should return 403 for gate condition error', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(
        new GateConditionNotValidError()
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 500 and capture exception for unknown errors', async () => {
      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockRejectedValue(new Error('Unknown error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty identifier string', async () => {
      req.query = { identifier: '' }

      mockGetSlotInstance.mockResolvedValue({ id: '' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSlotInstance).toHaveBeenCalledWith('')
    })

    it('should handle identifier as array', async () => {
      req.query = { identifier: ['id1', 'id2'] }

      mockGetSlotInstance.mockResolvedValue({ id: 'id1' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSlotInstance).toHaveBeenCalled()
    })

    it('should handle missing session', async () => {
      req.method = 'POST'
      req.session = undefined
      req.body = {}

      // Should fail when trying to access account.address
      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow()
    })

    it('should handle instance with complex data', async () => {
      const complexInstance = {
        id: 'instance_123',
        meeting_id: 'meeting_456',
        title: 'Complex Meeting with "quotes" & special chars',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        account_address: '0x1234567890abcdef',
        participants: [
          { address: '0xuser1', name: "O'Brien" },
          { guest_email: 'guest@example.com' },
        ],
        location: 'Room 123 <Building A>',
      }

      mockGetSlotInstance.mockResolvedValue(complexInstance)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(complexInstance)
    })

    it('should handle timezone variations in deletion', async () => {
      req.method = 'DELETE'
      req.body = {
        meeting: {
          participants: [],
          related_slot_ids: [],
          meeting_id: 'meeting_456',
        },
        currentTimezone: 'Asia/Tokyo',
      }

      mockGetAccountFromDB.mockResolvedValue({ address: '0x1234567890abcdef' })
      mockDeleteMeetingFromDB.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteMeetingFromDB).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Array),
        expect.any(Array),
        'meeting_456',
        'Asia/Tokyo',
        undefined,
        undefined
      )
    })
  })
})
