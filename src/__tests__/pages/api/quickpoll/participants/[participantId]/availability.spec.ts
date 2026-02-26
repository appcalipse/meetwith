/**
 * Unit tests for /api/quickpoll/participants/[participantId]/availability endpoint
 * Testing update participant availability functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  updateQuickPollParticipantAvailability: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/quickpoll/participants/[participantId]/availability'
import * as database from '@/utils/database'

describe('/api/quickpoll/participants/[participantId]/availability', () => {
  const mockUpdateQuickPollParticipantAvailability =
    database.updateQuickPollParticipantAvailability as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockParticipant = {
    id: 'participant-123',
    name: 'John Doe',
    email: 'john@example.com',
    available_slots: ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'],
    timezone: 'America/New_York',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'PUT',
      query: {
        participantId: 'participant-123',
      },
      body: {
        available_slots: ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'],
        timezone: 'America/New_York',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('PUT /api/quickpoll/participants/[participantId]/availability', () => {
    it('should update participant availability successfully', async () => {
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue(
        mockParticipant
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateQuickPollParticipantAvailability).toHaveBeenCalledWith(
        'participant-123',
        ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'],
        'America/New_York',
        undefined
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockParticipant)
    })

    it('should return 400 when participantId is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Participant ID is required',
      })
      expect(mockUpdateQuickPollParticipantAvailability).not.toHaveBeenCalled()
    })

    it('should return 400 when available_slots is missing', async () => {
      req.body = { timezone: 'America/New_York' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error:
          'Either available_slots or availability_block_ids must be provided',
      })
      expect(mockUpdateQuickPollParticipantAvailability).not.toHaveBeenCalled()
    })

    it('should return 400 when available_slots is not an array', async () => {
      req.body = { available_slots: 'invalid', timezone: 'America/New_York' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error:
          'Either available_slots or availability_block_ids must be provided',
      })
      expect(mockUpdateQuickPollParticipantAvailability).not.toHaveBeenCalled()
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockUpdateQuickPollParticipantAvailability.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Database error' })
    })

    it('should handle non-Error exceptions', async () => {
      mockUpdateQuickPollParticipantAvailability.mockRejectedValue(
        'string error'
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'An unexpected error occurred',
      })
    })

    it('should work without timezone', async () => {
      req.body = {
        available_slots: ['2024-01-01T10:00:00Z'],
      }
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue(
        mockParticipant
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateQuickPollParticipantAvailability).toHaveBeenCalledWith(
        'participant-123',
        ['2024-01-01T10:00:00Z'],
        undefined,
        undefined
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('PATCH /api/quickpoll/participants/[participantId]/availability', () => {
    it('should update participant availability with PATCH method', async () => {
      req.method = 'PATCH'
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue(
        mockParticipant
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateQuickPollParticipantAvailability).toHaveBeenCalledWith(
        'participant-123',
        ['2024-01-01T10:00:00Z', '2024-01-01T11:00:00Z'],
        'America/New_York',
        undefined
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockParticipant)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 405 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
      expect(mockUpdateQuickPollParticipantAvailability).not.toHaveBeenCalled()
    })

    it('should return 405 for POST requests', async () => {
      req.method = 'POST'

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
  })
})
