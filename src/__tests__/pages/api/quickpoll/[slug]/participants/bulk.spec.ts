/**
 * Unit tests for /api/quickpoll/[slug]/participants/bulk endpoint
 */

jest.mock('@/utils/database', () => ({
  getQuickPollBySlug: jest.fn(),
  updateQuickPollParticipants: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/nextjs'
import handler from '@/pages/api/quickpoll/[slug]/participants/bulk'
import * as database from '@/utils/database'
import { QuickPollParticipantStatus, QuickPollParticipantType } from '@/types/QuickPoll'
import { MeetingPermissions } from '@/utils/constants/schedule'

describe('/api/quickpoll/[slug]/participants/bulk', () => {
  const mockGetQuickPollBySlug = database.getQuickPollBySlug as jest.Mock
  const mockUpdateQuickPollParticipants = database.updateQuickPollParticipants as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn().mockReturnThis()

    res = {
      status: statusMock,
      json: jsonMock,
    }
  })

  describe('POST method', () => {
    beforeEach(() => {
      req = {
        method: 'POST',
        query: { slug: 'test-poll' },
        body: {
          participants: [
            {
              guest_email: 'user1@example.com',
              guest_name: 'User One',
              participant_type: QuickPollParticipantType.INVITEE,
              status: QuickPollParticipantStatus.PENDING,
            },
            {
              guest_email: 'user2@example.com',
              guest_name: 'User Two',
              participant_type: QuickPollParticipantType.INVITEE,
              status: QuickPollParticipantStatus.PENDING,
            },
          ],
        },
      }

      mockGetQuickPollBySlug.mockResolvedValue({
        poll: {
          id: 'poll-123',
          permissions: [MeetingPermissions.INVITE_GUESTS],
        },
      })
      mockUpdateQuickPollParticipants.mockResolvedValue(undefined)
    })

    it('should successfully add bulk participants', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetQuickPollBySlug).toHaveBeenCalledWith('test-poll')
      expect(mockUpdateQuickPollParticipants).toHaveBeenCalledWith('poll-123', {
        toAdd: [
          {
            account_address: undefined,
            guest_email: 'user1@example.com',
            guest_name: 'User One',
            participant_type: QuickPollParticipantType.INVITEE,
            status: QuickPollParticipantStatus.PENDING,
          },
          {
            account_address: undefined,
            guest_email: 'user2@example.com',
            guest_name: 'User Two',
            participant_type: QuickPollParticipantType.INVITEE,
            status: QuickPollParticipantStatus.PENDING,
          },
        ],
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 400 when slug is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Poll slug is required' })
    })

    it('should return 400 when participants array is missing', async () => {
      req.body = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Participants array is required' })
    })

    it('should return 400 when participants is not an array', async () => {
      req.body = { participants: 'not-an-array' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Participants array is required' })
    })

    it('should return 400 when participants array is empty', async () => {
      req.body = { participants: [] }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Participants array is required' })
    })

    it('should return 403 when user does not have invite permission', async () => {
      mockGetQuickPollBySlug.mockResolvedValue({
        poll: {
          id: 'poll-123',
          permissions: [],
        },
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'You do not have permission to add participants',
      })
    })

    it('should return 403 when permissions are undefined', async () => {
      mockGetQuickPollBySlug.mockResolvedValue({
        poll: {
          id: 'poll-123',
        },
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'You do not have permission to add participants',
      })
    })

    it('should trim and lowercase email addresses', async () => {
      req.body.participants = [
        {
          guest_email: '  USER@EXAMPLE.COM  ',
          guest_name: 'User',
          participant_type: QuickPollParticipantType.INVITEE,
          status: QuickPollParticipantStatus.PENDING,
        },
      ]

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateQuickPollParticipants).toHaveBeenCalledWith('poll-123', {
        toAdd: [
          expect.objectContaining({
            guest_email: 'user@example.com',
          }),
        ],
      })
    })

    it('should handle participants with account addresses', async () => {
      req.body.participants = [
        {
          account_address: '0x123',
          guest_email: 'user@example.com',
          guest_name: 'User',
          participant_type: QuickPollParticipantType.INVITEE,
          status: QuickPollParticipantStatus.PENDING,
        },
      ]

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateQuickPollParticipants).toHaveBeenCalledWith('poll-123', {
        toAdd: [
          expect.objectContaining({
            account_address: '0x123',
          }),
        ],
      })
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
