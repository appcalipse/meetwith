/**
 * Tests for zoom.helper
 * Testing Zoom OAuth and token management
 */

import { promises } from 'fs'
import {
  getAccessToken,
  saveCredentials,
  refreshAccessToken,
  encodeServerKeys,
  ZOOM_API_URL,
  ZOOM_AUTH_URL,
} from '@/utils/zoom.helper'

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

describe('zoom.helper', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Constants', () => {
    it('should export ZOOM_API_URL', () => {
      expect(ZOOM_API_URL).toBe('https://api.zoom.us/v2')
    })

    it('should export ZOOM_AUTH_URL', () => {
      expect(ZOOM_AUTH_URL).toBe('https://zoom.us/oauth/token')
    })
  })

  describe('encodeServerKeys', () => {
    it('should encode credentials to base64', () => {
      const result = encodeServerKeys('client_id', 'client_secret')
      
      const decoded = Buffer.from(result, 'base64').toString('utf-8')
      expect(decoded).toBe('client_id:client_secret')
    })

    it('should handle special characters', () => {
      const result = encodeServerKeys('id@123', 'secret!@#')
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('saveCredentials', () => {
    it('should save credentials with expiration', async () => {
      const mockCredentials = {
        access_token: 'test_token',
        token_type: 'bearer',
        expires_in: 3600,
      }

      ;(promises.writeFile as jest.Mock).mockResolvedValue(undefined)

      await saveCredentials(mockCredentials)

      expect(promises.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('zoom-token.json'),
        expect.stringContaining('test_token')
      )

      const writtenData = JSON.parse(
        (promises.writeFile as jest.Mock).mock.calls[0][1]
      )
      expect(writtenData.access_token).toBe('test_token')
      expect(writtenData.expires_at).toBeDefined()
      expect(typeof writtenData.expires_at).toBe('number')
    })
  })

  describe('getAccessToken', () => {
    it('should return cached token if not expired', async () => {
      const futureExpiry = Date.now() + 10000000
      const mockFileContent = JSON.stringify({
        access_token: 'cached_token',
        expires_at: futureExpiry,
      })

      ;(promises.readFile as jest.Mock).mockResolvedValue(mockFileContent)

      const result = await getAccessToken()

      expect(result).toBe('cached_token')
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should refresh token if expired', async () => {
      const pastExpiry = Date.now() - 1000
      const mockFileContent = JSON.stringify({
        access_token: 'old_token',
        expires_at: pastExpiry,
      })

      const mockNewToken = {
        access_token: 'new_token',
        token_type: 'bearer',
        expires_in: 3600,
      }

      ;(promises.readFile as jest.Mock).mockResolvedValue(mockFileContent)
      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockNewToken),
      })
      ;(promises.writeFile as jest.Mock).mockResolvedValue(undefined)

      const result = await getAccessToken()

      expect(result).toBe('new_token')
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle missing token file', async () => {
      ;(promises.readFile as jest.Mock).mockRejectedValue(
        new Error('ENOENT: no such file')
      )

      await expect(getAccessToken()).rejects.toThrow()
    })

    it('should handle invalid JSON in token file', async () => {
      ;(promises.readFile as jest.Mock).mockResolvedValue('invalid json')

      // Should use empty object when JSON is invalid
      const mockNewToken = {
        access_token: 'refreshed_token',
        expires_in: 3600,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockNewToken),
      })
      ;(promises.writeFile as jest.Mock).mockResolvedValue(undefined)

      const result = await getAccessToken()

      expect(result).toBe('refreshed_token')
    })
  })

  describe('refreshAccessToken', () => {
    it('should fetch new token from Zoom', async () => {
      const mockToken = {
        access_token: 'new_zoom_token',
        token_type: 'bearer',
        expires_in: 3600,
        scope: 'meeting:write',
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockToken),
      })
      ;(promises.writeFile as jest.Mock).mockResolvedValue(undefined)

      const result = await refreshAccessToken()

      expect(result).toBe('new_zoom_token')

      expect(global.fetch).toHaveBeenCalledWith(
        ZOOM_AUTH_URL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.any(Headers),
        })
      )
    })

    it('should handle API errors', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

      await expect(refreshAccessToken()).rejects.toThrow('API Error')
    })

    it('should send correct grant_type', async () => {
      const mockToken = {
        access_token: 'token',
        expires_in: 3600,
      }

      ;(global.fetch as jest.Mock).mockResolvedValue({
        json: jest.fn().mockResolvedValue(mockToken),
      })
      ;(promises.writeFile as jest.Mock).mockResolvedValue(undefined)

      await refreshAccessToken()

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0]
      const body = fetchCall[1].body as URLSearchParams
      
      expect(body.get('grant_type')).toBe('account_credentials')
    })
  })
})
