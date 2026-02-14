/**
 * Unit tests for /api/server/webhook/discord-reminder endpoint
 * Testing Discord reminder webhook functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getDiscordAccounts: jest.fn(),
  getSlotsForAccountMinimal: jest.fn(),
  getConferenceDataBySlotId: jest.fn(),
}))

jest.mock('@/utils/services/discord.helper', () => ({
  dmAccount: jest.fn(),
}))

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/node'
import handler from '@/pages/api/server/webhook/discord-reminder'
import * as database from '@/utils/database'
import { dmAccount } from '@/utils/services/discord.helper'

describe('/api/server/webhook/discord-reminder', () => {
  const mockGetDiscordAccounts = database.getDiscordAccounts as jest.Mock
  const mockGetSlotsForAccountMinimal = database.getSlotsForAccountMinimal as jest.Mock
  const mockGetConferenceDataBySlotId = database.getConferenceDataBySlotId as jest.Mock
  const mockDmAccount = dmAccount as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let sendMock: jest.Mock
  let consoleInfoSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  const mockDiscordAccounts = [
    {
      account_address: '0x123',
      discord_id: 'discord-123',
      timezone: 'America/New_York',
    },
  ]

  const mockSlots = [
    {
      id: 'slot-123',
      start: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      end: new Date(Date.now() + 75 * 60 * 1000).toISOString(),
    },
  ]

  const mockMeeting = {
    title: 'Test Meeting',
    meeting_url: 'https://meet.example.com/123',
    reminders: [15],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T10:00:00Z'))

    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))

    req = {
      method: 'POST',
    }

    res = {
      status: statusMock,
    }

    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.useRealTimers()
    consoleInfoSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('POST /api/server/webhook/discord-reminder', () => {
    it('should send Discord reminders successfully', async () => {
      mockGetDiscordAccounts.mockResolvedValue(mockDiscordAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue(mockMeeting)
      mockDmAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetDiscordAccounts).toHaveBeenCalled()
      expect(mockGetSlotsForAccountMinimal).toHaveBeenCalledWith(
        '0x123',
        expect.any(Date)
      )
      expect(mockGetConferenceDataBySlotId).toHaveBeenCalledWith('slot-123')
      expect(mockDmAccount).toHaveBeenCalledWith(
        '0x123',
        'discord-123',
        expect.stringContaining('Test Meeting')
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith('OK')
    })

    it('should handle accounts with no slots', async () => {
      mockGetDiscordAccounts.mockResolvedValue(mockDiscordAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetConferenceDataBySlotId).not.toHaveBeenCalled()
      expect(mockDmAccount).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle slots without IDs', async () => {
      mockGetDiscordAccounts.mockResolvedValue(mockDiscordAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue([{ id: null, start: new Date(), end: new Date() }])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetConferenceDataBySlotId).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle meetings without reminders', async () => {
      mockGetDiscordAccounts.mockResolvedValue(mockDiscordAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue({ ...mockMeeting, reminders: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDmAccount).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle empty discord accounts', async () => {
      mockGetDiscordAccounts.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSlotsForAccountMinimal).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle errors and continue processing', async () => {
      const error = new Error('Discord API error')
      mockGetDiscordAccounts.mockResolvedValue(mockDiscordAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue(mockMeeting)
      mockDmAccount.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle timeout', async () => {
      mockGetDiscordAccounts.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(mockDiscordAccounts), 25000))
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      jest.advanceTimersByTime(20000)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockGetDiscordAccounts.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(503)
      expect(sendMock).toHaveBeenCalledWith('Resource Unavailable')
    })

    it('should send message with meeting details', async () => {
      mockGetDiscordAccounts.mockResolvedValue(mockDiscordAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue(mockMeeting)
      mockDmAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDmAccount).toHaveBeenCalledWith(
        '0x123',
        'discord-123',
        expect.stringContaining('Test Meeting')
      )
      expect(mockDmAccount).toHaveBeenCalledWith(
        '0x123',
        'discord-123',
        expect.stringContaining('https://meet.example.com/123')
      )
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetDiscordAccounts).not.toHaveBeenCalled()
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
  })
})
