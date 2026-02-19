/**
 * Unit tests for /api/secure/meetings/type endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getMeetingTypes: jest.fn(),
  createMeetingType: jest.fn(),
  updateMeetingType: jest.fn(),
  deleteMeetingType: jest.fn(),
  isProAccountAsync: jest.fn(),
  countFreeMeetingTypes: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@/utils/errors', () => ({
  LastMeetingTypeError: class extends Error {},
  MeetingSlugAlreadyExists: class extends Error {},
  MeetingTypeLimitExceededError: class extends Error {},
  PaidMeetingTypeNotAllowedError: class extends Error {},
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/meetings/type'
import * as database from '@/utils/database'
import {
  LastMeetingTypeError,
  MeetingSlugAlreadyExists,
  MeetingTypeLimitExceededError,
  PaidMeetingTypeNotAllowedError,
} from '@/utils/errors'
import { SessionType } from '@/utils/constants/meeting-types'

describe('/api/secure/meetings/type', () => {
  const mockGetMeetingTypes = database.getMeetingTypes as jest.Mock
  const mockCreateMeetingType = database.createMeetingType as jest.Mock
  const mockUpdateMeetingType = database.updateMeetingType as jest.Mock
  const mockDeleteMeetingType = database.deleteMeetingType as jest.Mock
  const mockIsProAccountAsync = database.isProAccountAsync as jest.Mock
  const mockCountFreeMeetingTypes = database.countFreeMeetingTypes as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockMeetingTypes = [
    { id: '1', name: 'Free Meeting', type: SessionType.FREE, slug: 'free-meeting' },
    { id: '2', name: 'Paid Meeting', type: SessionType.PAID, slug: 'paid-meeting' },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: {},
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

  describe('GET /api/secure/meetings/type', () => {
    it('should return all meeting types with pro status', async () => {
      mockGetMeetingTypes.mockResolvedValue(mockMeetingTypes)
      mockIsProAccountAsync.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingTypes).toHaveBeenCalledWith('0x1234567890abcdef', undefined, undefined)
      expect(mockIsProAccountAsync).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        isPro: true,
        meetingTypes: mockMeetingTypes,
        total: 2,
        upgradeRequired: false,
      })
    })

    it('should indicate upgrade required for free users with 1+ free types', async () => {
      mockGetMeetingTypes.mockResolvedValue([mockMeetingTypes[0]])
      mockIsProAccountAsync.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith({
        isPro: false,
        meetingTypes: [mockMeetingTypes[0]],
        total: 1,
        upgradeRequired: true,
      })
    })

    it('should support pagination with limit and offset', async () => {
      req.query = { limit: '10', offset: '5' }
      mockGetMeetingTypes.mockResolvedValue(mockMeetingTypes)
      mockIsProAccountAsync.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingTypes).toHaveBeenCalledWith('0x1234567890abcdef', 10, 5)
    })

    it('should handle empty meeting types', async () => {
      mockGetMeetingTypes.mockResolvedValue([])
      mockIsProAccountAsync.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith({
        isPro: false,
        meetingTypes: [],
        total: 0,
        upgradeRequired: false,
      })
    })
  })

  describe('POST /api/secure/meetings/type', () => {
    const newMeetingType = {
      name: 'New Meeting',
      type: SessionType.FREE,
      slug: 'new-meeting',
      duration: 30,
    }

    beforeEach(() => {
      req.method = 'POST'
      req.body = newMeetingType
    })

    it('should create meeting type for pro users', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateMeetingType.mockResolvedValue({ id: '3', ...newMeetingType })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateMeetingType).toHaveBeenCalledWith('0x1234567890abcdef', newMeetingType)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ id: '3', ...newMeetingType })
    })

    it('should prevent free users from creating paid meeting types', async () => {
      req.body = { ...newMeetingType, type: SessionType.PAID }
      mockIsProAccountAsync.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateMeetingType).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should enforce 1 meeting type limit for free users', async () => {
      mockIsProAccountAsync.mockResolvedValue(false)
      mockCountFreeMeetingTypes.mockResolvedValue(1)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateMeetingType).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should allow free users to create first free meeting type', async () => {
      mockIsProAccountAsync.mockResolvedValue(false)
      mockCountFreeMeetingTypes.mockResolvedValue(0)
      mockCreateMeetingType.mockResolvedValue({ id: '3', ...newMeetingType })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateMeetingType).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle slug already exists error', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateMeetingType.mockRejectedValue(new MeetingSlugAlreadyExists('Slug exists'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('PATCH /api/secure/meetings/type', () => {
    const updatePayload = {
      id: '1',
      name: 'Updated Meeting',
      duration: 45,
    }

    beforeEach(() => {
      req.method = 'PATCH'
      req.body = updatePayload
    })

    it('should update meeting type successfully', async () => {
      mockUpdateMeetingType.mockResolvedValue({ ...updatePayload, type: SessionType.FREE })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateMeetingType).toHaveBeenCalledWith('0x1234567890abcdef', '1', updatePayload)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ ...updatePayload, type: SessionType.FREE })
    })

    it('should handle update errors', async () => {
      mockUpdateMeetingType.mockRejectedValue(new Error('Update failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('DELETE /api/secure/meetings/type', () => {
    beforeEach(() => {
      req.method = 'DELETE'
      req.body = { typeId: '1' }
    })

    it('should delete meeting type successfully', async () => {
      mockDeleteMeetingType.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteMeetingType).toHaveBeenCalledWith('0x1234567890abcdef', '1')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should prevent deleting last meeting type', async () => {
      mockDeleteMeetingType.mockRejectedValue(new LastMeetingTypeError('Cannot delete last type'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
    })

    it('should handle delete errors', async () => {
      mockDeleteMeetingType.mockRejectedValue(new Error('Delete failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Error handling', () => {
    it('should return 404 for unsupported methods', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle generic errors', async () => {
      mockGetMeetingTypes.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })
})
