/**
 * Unit tests for /api/groupSchedule/[id] endpoint
 * Testing GET requests for team meeting requests
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  selectTeamMeetingRequest: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/groupSchedule/[id]'
import * as database from '@/utils/database'

describe('/api/groupSchedule/[id]', () => {
  const mockSelectTeamMeetingRequest = database.selectTeamMeetingRequest as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockTeamMeetingRequest = {
    id: 'meeting-123',
    title: 'Team Meeting',
    description: 'Weekly sync',
    start: new Date('2024-02-01T10:00:00Z'),
    end: new Date('2024-02-01T11:00:00Z'),
    participants: ['0x123', '0x456'],
    created_at: new Date('2024-01-01'),
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: { id: 'meeting-123' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/groupSchedule/[id]', () => {
    it('should return 200 with team meeting request for valid id', async () => {
      mockSelectTeamMeetingRequest.mockResolvedValue(mockTeamMeetingRequest)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectTeamMeetingRequest).toHaveBeenCalledWith('meeting-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockTeamMeetingRequest)
    })

    it('should return 404 when meeting request not found', async () => {
      mockSelectTeamMeetingRequest.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectTeamMeetingRequest).toHaveBeenCalledWith('meeting-123')
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 when meeting request is undefined', async () => {
      mockSelectTeamMeetingRequest.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle missing id parameter', async () => {
      req.query = {}
      mockSelectTeamMeetingRequest.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectTeamMeetingRequest).toHaveBeenCalledWith(undefined)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle database errors', async () => {
      mockSelectTeamMeetingRequest.mockRejectedValue(new Error('Database error'))

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow(
        'Database error'
      )
    })

    it('should handle numeric id', async () => {
      req.query = { id: '12345' }
      mockSelectTeamMeetingRequest.mockResolvedValue(mockTeamMeetingRequest)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectTeamMeetingRequest).toHaveBeenCalledWith('12345')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle UUID id', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      req.query = { id: uuid }
      mockSelectTeamMeetingRequest.mockResolvedValue(mockTeamMeetingRequest)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectTeamMeetingRequest).toHaveBeenCalledWith(uuid)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle array id parameter', async () => {
      req.query = { id: ['meeting-1', 'meeting-2'] }
      mockSelectTeamMeetingRequest.mockResolvedValue(mockTeamMeetingRequest)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectTeamMeetingRequest).toHaveBeenCalledWith('meeting-1')
    })

    it('should return meeting with empty participants', async () => {
      const emptyMeeting = { ...mockTeamMeetingRequest, participants: [] }
      mockSelectTeamMeetingRequest.mockResolvedValue(emptyMeeting)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(emptyMeeting)
    })

    it('should return meeting with minimal data', async () => {
      const minimalMeeting = { id: 'meeting-123' }
      mockSelectTeamMeetingRequest.mockResolvedValue(minimalMeeting)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(minimalMeeting)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockSelectTeamMeetingRequest).not.toHaveBeenCalled()
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
