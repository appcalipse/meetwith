/**
 * Unit tests for /api/server/discord/meet/simple endpoint
 * Testing simple Discord meeting creation
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getAccountFromDiscordId: jest.fn(),
}))

jest.mock('@/utils/api_helper', () => ({
  getSuggestedSlots: jest.fn(),
}))

jest.mock('@/utils/calendar_manager', () => ({
  scheduleMeeting: jest.fn(),
  selectDefaultProvider: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/discord/meet/simple'
import * as database from '@/utils/database'
import { getSuggestedSlots } from '@/utils/api_helper'
import { scheduleMeeting, selectDefaultProvider } from '@/utils/calendar_manager'
import { ApiFetchError } from '@/utils/errors'
import { SchedulingType } from '@/types/Meeting'

describe('/api/server/discord/meet/simple', () => {
  const mockGetAccountFromDiscordId = database.getAccountFromDiscordId as jest.Mock
  const mockGetSuggestedSlots = getSuggestedSlots as jest.Mock
  const mockScheduleMeeting = scheduleMeeting as jest.Mock
  const mockSelectDefaultProvider = selectDefaultProvider as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockScheduler = {
    address: '0x123',
    discord_id: 'scheduler-discord-id',
    preferences: {
      name: 'Scheduler',
      timezone: 'America/New_York',
      meetingProviders: ['google', 'zoom'],
    },
  }

  const mockAccounts = [
    { address: '0x123', preferences: { name: 'Scheduler' } },
    { address: '0x456', preferences: { name: 'Participant 1' } },
  ]

  const mockSlots = [
    {
      start: '2024-01-01T10:00:00Z',
      end: '2024-01-01T11:00:00Z',
    },
  ]

  const mockMeeting = {
    id: 'meeting-123',
    title: 'Test Meeting',
    start: '2024-01-01T10:00:00Z',
    end: '2024-01-01T11:00:00Z',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        schedulerDiscordId: 'scheduler-discord-id',
        accounts: mockAccounts,
        duration: 60,
        interval: 7,
        title: 'Test Meeting',
        description: 'Test Description',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/discord/meet/simple', () => {
    it('should create meeting successfully', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockResolvedValue(mockMeeting)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDiscordId).toHaveBeenCalledWith('scheduler-discord-id')
      expect(mockGetSuggestedSlots).toHaveBeenCalledWith(
        ['0x123', '0x456'],
        expect.any(Date),
        expect.any(Date),
        60
      )
      expect(mockScheduleMeeting).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockMeeting)
    })

    it('should return 404 when scheduler account not found', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith(
        expect.stringContaining("You don't have a Meetwith account")
      )
    })

    it('should return 409 when no available slots', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
      expect(sendMock).toHaveBeenCalledWith(
        expect.stringContaining('There is no slot that fits')
      )
    })

    it('should return 400 when provider not enabled', async () => {
      req.body.provider = 'teams'
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith(
        expect.stringContaining("You don't have the selected location enabled")
      )
    })

    it('should use default provider when not specified', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockResolvedValue(mockMeeting)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSelectDefaultProvider).toHaveBeenCalledWith(['google', 'zoom'])
      expect(mockScheduleMeeting).toHaveBeenCalledWith(
        false,
        SchedulingType.DISCORD,
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        expect.any(Array),
        'google',
        mockScheduler,
        'Test Description',
        undefined,
        undefined,
        'Test Meeting',
        []
      )
    })

    it('should use specified provider when valid', async () => {
      req.body.provider = 'google'
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockResolvedValue(mockMeeting)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockScheduleMeeting).toHaveBeenCalledWith(
        false,
        SchedulingType.DISCORD,
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        expect.any(Array),
        'google',
        expect.any(Object),
        expect.any(String),
        undefined,
        undefined,
        expect.any(String),
        []
      )
    })

    it('should handle notBefore parameter', async () => {
      req.body.notBefore = '15:00'
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockResolvedValue(mockMeeting)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSuggestedSlots).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle reminder parameter', async () => {
      req.body.reminder = 15
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockResolvedValue(mockMeeting)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockScheduleMeeting).toHaveBeenCalledWith(
        expect.any(Boolean),
        SchedulingType.DISCORD,
        expect.any(String),
        expect.any(Date),
        expect.any(Date),
        expect.any(Array),
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        undefined,
        undefined,
        expect.any(String),
        [15]
      )
    })

    it('should handle ApiFetchError', async () => {
      const error = new ApiFetchError(400, 'API error')
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockRejectedValue(error)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(sendMock).toHaveBeenCalledWith('API error')
    })

    it('should handle generic errors', async () => {
      const error = new Error('Database error')
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockRejectedValue(error)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('Database error')
    })

    it('should handle non-Error exceptions', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(mockScheduler)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockRejectedValue('string error')
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('An unexpected error occurred.')
    })

    it('should use default timezone when not provided', async () => {
      const schedulerWithoutTz = {
        ...mockScheduler,
        preferences: { ...mockScheduler.preferences, timezone: undefined },
      }
      mockGetAccountFromDiscordId.mockResolvedValue(schedulerWithoutTz)
      mockGetSuggestedSlots.mockResolvedValue(mockSlots)
      mockScheduleMeeting.mockResolvedValue(mockMeeting)
      mockSelectDefaultProvider.mockReturnValue('google')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetAccountFromDiscordId).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
