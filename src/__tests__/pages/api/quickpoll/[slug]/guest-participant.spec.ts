/**
 * Unit tests for /api/quickpoll/[slug]/guest-participant endpoint
 */

jest.mock('@/utils/database', () => ({
  addQuickPollParticipant: jest.fn(),
  getQuickPollBySlug: jest.fn(),
  getQuickPollParticipantByIdentifier: jest.fn(),
  updateQuickPollGuestDetails: jest.fn(),
  updateQuickPollParticipantAvailability: jest.fn(),
  updateQuickPollParticipantStatus: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/[slug]/guest-participant'
import * as database from '@/utils/database'
import { PollVisibility, QuickPollParticipantStatus, QuickPollParticipantType } from '@/types/QuickPoll'

describe('/api/quickpoll/[slug]/guest-participant', () => {
  const mockAddQuickPollParticipant = database.addQuickPollParticipant as jest.Mock
  const mockGetQuickPollBySlug = database.getQuickPollBySlug as jest.Mock
  const mockGetQuickPollParticipantByIdentifier = database.getQuickPollParticipantByIdentifier as jest.Mock
  const mockUpdateQuickPollGuestDetails = database.updateQuickPollGuestDetails as jest.Mock
  const mockUpdateQuickPollParticipantAvailability = database.updateQuickPollParticipantAvailability as jest.Mock
  const mockUpdateQuickPollParticipantStatus = database.updateQuickPollParticipantStatus as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  const mockPollData = {
    poll: {
      id: 'poll-123',
      slug: 'test-poll',
      visibility: PollVisibility.PUBLIC,
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
  })

  describe('POST method', () => {
    beforeEach(() => {
      req = {
        method: 'POST',
        query: { slug: 'test-poll' },
        body: {
          guest_email: 'test@example.com',
          guest_name: 'Test User',
          available_slots: [
            { start: '2024-01-01T10:00:00Z', end: '2024-01-01T11:00:00Z' },
          ],
          timezone: 'America/New_York',
        },
      }
    })

    it('should create new participant with availability', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue({
        ...mockParticipant,
        available_slots: req.body.available_slots,
      })
      mockUpdateQuickPollParticipantStatus.mockResolvedValue({
        ...mockParticipant,
        status: QuickPollParticipantStatus.ACCEPTED,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddQuickPollParticipant).toHaveBeenCalledWith('poll-123', {
        guest_email: 'test@example.com',
        guest_name: 'Test User',
        participant_type: QuickPollParticipantType.INVITEE,
      })
      expect(mockUpdateQuickPollParticipantAvailability).toHaveBeenCalledWith(
        'participant-123',
        req.body.available_slots,
        'America/New_York'
      )
      expect(mockUpdateQuickPollParticipantStatus).toHaveBeenCalledWith(
        'participant-123',
        QuickPollParticipantStatus.ACCEPTED
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        participant: expect.objectContaining({
          id: 'participant-123',
        }),
      })
    })

    it('should update existing participant availability', async () => {
      mockGetQuickPollParticipantByIdentifier.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue({
        ...mockParticipant,
        available_slots: req.body.available_slots,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddQuickPollParticipant).not.toHaveBeenCalled()
      expect(mockUpdateQuickPollParticipantAvailability).toHaveBeenCalledWith(
        'participant-123',
        req.body.available_slots,
        'America/New_York'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should update participant name if provided for existing participant', async () => {
      mockGetQuickPollParticipantByIdentifier.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollGuestDetails.mockResolvedValue({
        ...mockParticipant,
        guest_name: 'Updated Name',
      })
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue(mockParticipant)

      req.body.guest_name = 'Updated Name'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateQuickPollGuestDetails).toHaveBeenCalledWith(
        'participant-123',
        'Updated Name',
        'test@example.com'
      )
    })

    it('should return 400 when slug is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Poll slug is required' })
    })

    it('should return 400 when email is missing', async () => {
      req.body = {
        available_slots: [],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Email is required' })
    })

    it('should return 400 when available_slots is missing', async () => {
      req.body = {
        guest_email: 'test@example.com',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Available slots must be provided as an array',
      })
    })

    it('should return 400 when available_slots is not an array', async () => {
      req.body = {
        guest_email: 'test@example.com',
        available_slots: 'not-an-array',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Available slots must be provided as an array',
      })
    })

    it('should return 403 for private poll with non-invited participant', async () => {
      mockGetQuickPollBySlug.mockResolvedValue({
        poll: {
          id: 'poll-123',
          slug: 'private-poll',
          visibility: PollVisibility.PRIVATE,
        },
      })
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'This is a private poll. Only invited participants can add availability.',
      })
    })

    it('should trim email and convert to lowercase', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollParticipantStatus.mockResolvedValue(mockParticipant)

      req.body.guest_email = '  TEST@EXAMPLE.COM  '

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollParticipantByIdentifier).toHaveBeenCalledWith(
        'poll-123',
        'test@example.com'
      )
      expect(mockAddQuickPollParticipant).toHaveBeenCalledWith(
        'poll-123',
        expect.objectContaining({
          guest_email: 'test@example.com',
        })
      )
    })

    it('should use default guest name if not provided', async () => {
      mockGetQuickPollParticipantByIdentifier.mockRejectedValue(new Error('not found'))
      mockAddQuickPollParticipant.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollParticipantAvailability.mockResolvedValue(mockParticipant)
      mockUpdateQuickPollParticipantStatus.mockResolvedValue(mockParticipant)

      delete req.body.guest_name

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddQuickPollParticipant).toHaveBeenCalledWith(
        'poll-123',
        expect.objectContaining({
          guest_name: 'Guest',
        })
      )
    })

    it('should handle database errors', async () => {
      mockGetQuickPollBySlug.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database error',
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

  describe('Non-POST methods', () => {
    it('should return 405 for GET method', async () => {
      req = {
        method: 'GET',
        query: { slug: 'test-poll' },
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for PUT method', async () => {
      req = {
        method: 'PUT',
        query: { slug: 'test-poll' },
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE method', async () => {
      req = {
        method: 'DELETE',
        query: { slug: 'test-poll' },
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
