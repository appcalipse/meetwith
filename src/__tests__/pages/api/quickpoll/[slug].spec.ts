/**
 * Unit tests for /api/quickpoll/[slug] endpoint
 * Testing GET requests, error handling, and poll status validation
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

// Mock database
jest.mock('@/utils/database', () => ({
  getQuickPollBySlug: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/quickpoll/[slug]'
import { PollStatus } from '@/types/QuickPoll'
import * as database from '@/utils/database'
import {
  QuickPollAlreadyCancelledError,
  QuickPollAlreadyCompletedError,
  QuickPollExpiredError,
  QuickPollSlugNotFoundError,
} from '@/utils/errors'

describe('/api/quickpoll/[slug]', () => {
  const mockCaptureException = Sentry.captureException as jest.Mock
  const mockGetQuickPollBySlug = database.getQuickPollBySlug as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock }))

    req = {
      method: 'GET',
      query: { slug: 'test-poll-slug' },
    }

    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
    it('should return 405 for non-GET requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })

  describe('Slug Validation', () => {
    it('should return 400 when slug is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Slug is required' })
    })

    it('should return 400 when slug is empty string', async () => {
      req.query = { slug: '' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('Successful Poll Retrieval', () => {
    it('should return poll data for active poll', async () => {
      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-slug',
          title: 'Team Meeting',
          status: PollStatus.ONGOING,
          expires_at: null,
        },
        participants: [],
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollBySlug).toHaveBeenCalledWith('test-poll-slug')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockPollData)
    })

    it('should return poll data when not yet expired', async () => {
      const futureDate = new Date(Date.now() + 86400000) // 24 hours from now
      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-slug',
          title: 'Team Meeting',
          status: PollStatus.ONGOING,
          expires_at: futureDate.toISOString(),
        },
        participants: [],
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockPollData)
    })
  })

  describe('Poll Status Validation', () => {
    it('should return 410 for expired poll', async () => {
      const pastDate = new Date(Date.now() - 86400000) // 24 hours ago
      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-slug',
          status: PollStatus.ONGOING,
          expires_at: pastDate.toISOString(),
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(410)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('expired'),
        })
      )
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('should return 410 for completed poll', async () => {
      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-slug',
          status: PollStatus.COMPLETED,
          expires_at: null,
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(410)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
    })

    it('should return 410 for cancelled poll', async () => {
      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-slug',
          status: PollStatus.CANCELLED,
          expires_at: null,
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(410)
      expect(mockCaptureException).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should return 404 when poll not found', async () => {
      mockGetQuickPollBySlug.mockRejectedValue(
        new QuickPollSlugNotFoundError('nonexistent-slug')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
        })
      )
      expect(mockCaptureException).toHaveBeenCalled()
    })

    it('should return 500 for database errors', async () => {
      mockGetQuickPollBySlug.mockRejectedValue(
        new Error('Database connection failed')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database connection failed',
      })
    })

    it('should handle unknown errors gracefully', async () => {
      mockGetQuickPollBySlug.mockRejectedValue('Unknown error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'An unexpected error occurred',
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle polls expiring exactly now', async () => {
      const now = new Date()
      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-slug',
          status: PollStatus.ONGOING,
          expires_at: now.toISOString(),
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should be treated as expired
      expect(statusMock).toHaveBeenCalledWith(410)
    })

    it('should handle special characters in slug', async () => {
      req.query = { slug: 'test-poll-with-special-chars_123' }

      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: 'test-poll-with-special-chars_123',
          status: PollStatus.ONGOING,
          expires_at: null,
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollBySlug).toHaveBeenCalledWith(
        'test-poll-with-special-chars_123'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle very long slugs', async () => {
      const longSlug = 'a'.repeat(200)
      req.query = { slug: longSlug }

      const mockPollData = {
        poll: {
          id: 'poll_123',
          slug: longSlug,
          status: PollStatus.ONGOING,
          expires_at: null,
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue(mockPollData)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollBySlug).toHaveBeenCalledWith(longSlug)
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Sentry Integration', () => {
    it('should capture exceptions to Sentry', async () => {
      const testError = new Error('Test error for Sentry')
      mockGetQuickPollBySlug.mockRejectedValue(testError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(testError)
    })

    it('should capture custom errors to Sentry', async () => {
      const customError = new QuickPollExpiredError()
      mockGetQuickPollBySlug.mockResolvedValue({
        poll: {
          status: PollStatus.ONGOING,
          expires_at: new Date(Date.now() - 1000).toISOString(),
        },
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalled()
    })
  })
})
