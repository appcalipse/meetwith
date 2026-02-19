/**
 * Unit tests for /api/quickpoll/[slug]/participant/[identifier] endpoint
 */

jest.mock('@/utils/database', () => ({
  getQuickPollBySlug: jest.fn(),
  getQuickPollParticipantByIdentifier: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/[slug]/participant/[identifier]'
import * as database from '@/utils/database'

describe('/api/quickpoll/[slug]/participant/[identifier]', () => {
  const mockGetQuickPollBySlug = database.getQuickPollBySlug as jest.Mock
  const mockGetQuickPollParticipantByIdentifier = database.getQuickPollParticipantByIdentifier as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockPollData = {
    poll: {
      id: 'poll-123',
      slug: 'test-poll',
    },
  }

  const mockParticipant = {
    id: 'participant-123',
    guest_email: 'test@example.com',
    guest_name: 'Test User',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn().mockReturnThis()

    res = {
      status: statusMock,
      json: jsonMock,
    }

    mockGetQuickPollBySlug.mockResolvedValue(mockPollData)
    mockGetQuickPollParticipantByIdentifier.mockResolvedValue(mockParticipant)
  })

  describe('GET method', () => {
    beforeEach(() => {
      req = {
        method: 'GET',
        query: {
          slug: 'test-poll',
          identifier: 'test@example.com',
        },
      }
    })

    it('should successfully retrieve participant by email identifier', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollBySlug).toHaveBeenCalledWith('test-poll')
      expect(mockGetQuickPollParticipantByIdentifier).toHaveBeenCalledWith(
        'poll-123',
        'test@example.com'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockParticipant)
    })

    it('should handle URL-encoded identifier', async () => {
      req.query = {
        slug: 'test-poll',
        identifier: 'test%40example.com',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollParticipantByIdentifier).toHaveBeenCalledWith(
        'poll-123',
        'test@example.com'
      )
    })

    it('should return 400 when slug is missing', async () => {
      req.query = { identifier: 'test@example.com' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Poll slug and identifier are required',
      })
    })

    it('should return 400 when identifier is missing', async () => {
      req.query = { slug: 'test-poll' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Poll slug and identifier are required',
      })
    })

    it('should return 404 when participant is not found', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(
        new Error('Participant not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Participant not found' })
    })

    it('should return 500 for database errors', async () => {
      mockGetQuickPollBySlug.mockRejectedValue(new Error('Database connection error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database connection error',
      })
    })

    it('should handle unexpected errors', async () => {
      mockGetQuickPollBySlug.mockRejectedValue('String error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'An unexpected error occurred',
      })
    })
  })

  describe('Non-GET methods', () => {
    it('should return 405 for POST method', async () => {
      req = {
        method: 'POST',
        query: { slug: 'test-poll', identifier: 'test@example.com' },
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for PUT method', async () => {
      req = {
        method: 'PUT',
        query: { slug: 'test-poll', identifier: 'test@example.com' },
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE method', async () => {
      req = {
        method: 'DELETE',
        query: { slug: 'test-poll', identifier: 'test@example.com' },
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
