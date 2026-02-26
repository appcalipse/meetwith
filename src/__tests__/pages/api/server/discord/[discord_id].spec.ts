/**
 * Unit tests for /api/server/discord/[discord_id] endpoint
 * Testing get account by Discord ID functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getAccountFromDiscordId: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/discord/[discord_id]'
import * as database from '@/utils/database'

describe('/api/server/discord/[discord_id]', () => {
  const mockGetAccountFromDiscordId = database.getAccountFromDiscordId as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockAccount = {
    address: '0x123',
    discord_id: 'discord-456',
    preferences: {
      name: 'John Doe',
      timezone: 'America/New_York',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: {
        discord_id: 'discord-456',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/server/discord/[discord_id]', () => {
    it('should get account by discord ID successfully', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDiscordId).toHaveBeenCalledWith('discord-456')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockAccount)
    })

    it('should return 404 when account not found', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith("Account doesn't exist or isn't linked.")
    })

    it('should return 404 when account is undefined', async () => {
      mockGetAccountFromDiscordId.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith("Account doesn't exist or isn't linked.")
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

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
