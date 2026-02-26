/**
 * Unit tests for /api/quickpoll/participants/[participantId]/index endpoint
 * Testing get participant by ID functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getQuickPollParticipantById: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/participants/[participantId]/index'
import * as database from '@/utils/database'

describe('/api/quickpoll/participants/[participantId]', () => {
  const mockGetQuickPollParticipantById =
    database.getQuickPollParticipantById as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockParticipant = {
    id: 'participant-123',
    name: 'John Doe',
    email: 'john@example.com',
    poll_id: 'poll-456',
    available_slots: ['2024-01-01T10:00:00Z'],
    timezone: 'America/New_York',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'GET',
      query: {
        participantId: 'participant-123',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/quickpoll/participants/[participantId]', () => {
    it('should get participant successfully', async () => {
      mockGetQuickPollParticipantById.mockResolvedValue(mockParticipant)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollParticipantById).toHaveBeenCalledWith('participant-123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockParticipant)
    })

    it('should return 400 when participantId is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Participant ID is required' })
      expect(mockGetQuickPollParticipantById).not.toHaveBeenCalled()
    })

    it('should return 404 when participant not found', async () => {
      const error = new Error('Participant not found')
      mockGetQuickPollParticipantById.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Participant not found' })
    })

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed')
      mockGetQuickPollParticipantById.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database connection failed' })
    })

    it('should handle non-Error exceptions', async () => {
      mockGetQuickPollParticipantById.mockRejectedValue('string error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'An unexpected error occurred' })
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 405 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
      expect(mockGetQuickPollParticipantById).not.toHaveBeenCalled()
    })

    it('should return 405 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })
  })
})
