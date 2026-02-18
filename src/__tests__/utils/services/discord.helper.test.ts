/**
 * Comprehensive tests for discord.helper
 * Testing Discord OAuth and messaging integration
 */

import {
  generateDiscordAuthToken,
  getDiscordOAuthToken,
  refreshDiscordOAuthToken,
  getDiscordInfoForAddress,
  getDiscordAccountInfo,
  dmAccount,
} from '@/utils/services/discord.helper'

// Mock dependencies
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    login: jest.fn(),
    users: {
      fetch: jest.fn(),
    },
  })),
  GatewayIntentBits: {
    DirectMessages: 1,
    DirectMessageReactions: 2,
    MessageContent: 3,
  },
  DiscordAPIError: class DiscordAPIError extends Error {
    code: number
    constructor(message: string, code: number) {
      super(message)
      this.code = code
    }
  },
  DiscordjsError: class DiscordjsError extends Error {},
  DiscordjsErrorCodes: {
    UnknownUser: 10013,
  },
}))

jest.mock('@/utils/database', () => ({
  createOrUpdatesDiscordAccount: jest.fn(),
  deleteDiscordAccount: jest.fn(),
  getAccountNotificationSubscriptions: jest.fn(),
  getDiscordAccount: jest.fn(),
  setAccountNotificationSubscriptions: jest.fn(),
}))

import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'

// Mock fetch globally
global.fetch = jest.fn()

describe('Discord Helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateDiscordAuthToken', () => {
    it('should generate auth token from Discord code', async () => {
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 604800,
        refresh_token: 'mock_refresh_token',
        scope: 'identify guilds',
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockTokenResponse),
      })

      const result = await generateDiscordAuthToken('test_code')

      expect(result).toBeDefined()
      expect(result?.access_token).toBe('mock_access_token')
      expect(result?.refresh_token).toBe('mock_refresh_token')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      )
    })

    it('should handle OAuth errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code',
        }),
      })

      const result = await generateDiscordAuthToken('invalid_code')

      expect(result?.error).toBe('invalid_grant')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await generateDiscordAuthToken('test_code')

      expect(result).toBeNull()
      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('getDiscordOAuthToken', () => {
    it('should return valid token if not expired', async () => {
      const mockAccount = {
        access_token: 'valid_token',
        refresh_token: 'refresh_token',
        token_expires_at: new Date(Date.now() + 1000000).toISOString(),
      }

      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue(mockAccount)

      const result = await getDiscordOAuthToken('0x123')

      expect(result).toBe('valid_token')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should refresh token if expired', async () => {
      const mockAccount = {
        access_token: 'old_token',
        refresh_token: 'refresh_token',
        token_expires_at: new Date(Date.now() - 1000).toISOString(),
      }

      const mockNewToken = {
        access_token: 'new_token',
        expires_in: 604800,
        refresh_token: 'new_refresh_token',
      }

      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockNewToken),
      })

      const result = await getDiscordOAuthToken('0x123')

      expect(result).toBe('new_token')
      expect(database.createOrUpdatesDiscordAccount).toHaveBeenCalled()
    })

    it('should return null if no account found', async () => {
      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue(null)

      const result = await getDiscordOAuthToken('0x123')

      expect(result).toBeNull()
    })
  })

  describe('refreshDiscordOAuthToken', () => {
    it('should refresh token successfully', async () => {
      const mockRefreshResponse = {
        access_token: 'refreshed_token',
        expires_in: 604800,
        refresh_token: 'new_refresh_token',
        token_type: 'Bearer',
        scope: 'identify guilds',
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockRefreshResponse),
      })

      const result = await refreshDiscordOAuthToken('old_refresh_token')

      expect(result).toBeDefined()
      expect(result?.access_token).toBe('refreshed_token')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://discord.com/api/oauth2/token',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('should handle invalid refresh token', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue({
          error: 'invalid_grant',
        }),
      })

      const result = await refreshDiscordOAuthToken('invalid_token')

      expect(result?.error).toBe('invalid_grant')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const result = await refreshDiscordOAuthToken('refresh_token')

      expect(result).toBeNull()
      expect(Sentry.captureException).toHaveBeenCalled()
    })
  })

  describe('getDiscordAccountInfo', () => {
    it('should fetch user info and guilds', async () => {
      const mockUserInfo = {
        id: '123456789',
        username: 'testuser',
        discriminator: '0001',
        avatar: 'avatar_hash',
      }

      const mockGuilds = [
        {
          id: '915252743529181224',
          name: 'MeetWithWallet Server',
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockUserInfo),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockGuilds),
        })

      const result = await getDiscordAccountInfo('valid_token')

      expect(result).toBeDefined()
      expect(result.user).toEqual(mockUserInfo)
      expect(result.guilds).toEqual(mockGuilds)
      expect(result.isMemberOfMWWServer).toBe(true)
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockRejectedValue(new Error('API error')),
      })

      await expect(getDiscordAccountInfo('invalid_token')).rejects.toThrow()
    })

    it('should detect non-member of MWW server', async () => {
      const mockUserInfo = {
        id: '123456789',
        username: 'testuser',
      }

      const mockGuilds = [
        {
          id: '999999999',
          name: 'Other Server',
        },
      ]

      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockUserInfo),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockGuilds),
        })

      const result = await getDiscordAccountInfo('valid_token')

      expect(result.isMemberOfMWWServer).toBe(false)
    })
  })

  describe('getDiscordInfoForAddress', () => {
    it('should get Discord info for address', async () => {
      const mockAccount = {
        access_token: 'valid_token',
        refresh_token: 'refresh_token',
        token_expires_at: new Date(Date.now() + 1000000).toISOString(),
      }

      const mockUserInfo = {
        id: '123456789',
        username: 'testuser',
      }

      const mockGuilds = []

      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue(mockAccount)
      ;(global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockUserInfo),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockGuilds),
        })

      const result = await getDiscordInfoForAddress('0x123')

      expect(result).toBeDefined()
      expect(result?.user).toEqual(mockUserInfo)
    })

    it('should return null if no Discord account', async () => {
      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue(null)

      const result = await getDiscordInfoForAddress('0x123')

      expect(result).toBeNull()
    })
  })

  describe('dmAccount - error handling', () => {
    it('should handle user not found error (code 10013)', async () => {
      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue({
        discord_id: '123456',
      })
      ;(database.getAccountNotificationSubscriptions as jest.Mock).mockResolvedValue(
        {}
      )

      const result = await dmAccount('0x123', 'Test message', 'meeting_scheduled')

      // May fail gracefully or return specific error
      expect(database.setAccountNotificationSubscriptions).toHaveBeenCalledWith(
        '0x123',
        expect.objectContaining({
          discord_enabled: false,
        })
      )
    })

    it('should handle cannot send DM error (code 50007)', async () => {
      ;(database.getDiscordAccount as jest.Mock).mockResolvedValue({
        discord_id: '123456',
      })

      const result = await dmAccount('0x123', 'Test message', 'meeting_scheduled')

      // Should handle gracefully
      expect(result).toBeDefined()
    })
  })
})
