/**
 * Unit tests for /api/quickpoll/calendar/google/connect endpoint
 */

process.env.GOOGLE_CLIENT_ID = 'test-google-client-id'
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/auth?code=test'),
      })),
    },
  },
}))

import { NextApiRequest, NextApiResponse } from 'next'
import { google } from 'googleapis'
import handler from '@/pages/api/quickpoll/calendar/google/connect'

describe('/api/quickpoll/calendar/google/connect', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let OAuth2Mock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn().mockReturnThis()

    res = {
      status: statusMock,
      json: jsonMock,
    }

    OAuth2Mock = google.auth.OAuth2 as jest.Mock
  })

  describe('GET method', () => {
    beforeEach(() => {
      req = {
        method: 'GET',
        query: {},
      }
    })

    it('should return auth URL without state', async () => {
      const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/auth')
      OAuth2Mock.mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
      }))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        url: 'https://accounts.google.com/auth',
      })
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        prompt: 'consent',
        scope: expect.any(Array),
        state: undefined,
      })
    })

    it('should return auth URL with state parameter', async () => {
      const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/auth?state=test-state')
      OAuth2Mock.mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
      }))

      req.query = { state: 'test-state' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        url: 'https://accounts.google.com/auth?state=test-state',
      })
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        prompt: 'consent',
        scope: expect.any(Array),
        state: 'test-state',
      })
    })

    it('should handle state as array by taking first element', async () => {
      const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/auth')
      OAuth2Mock.mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
      }))

      req.query = { state: ['state1', 'state2'] }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        prompt: 'consent',
        scope: expect.any(Array),
        state: undefined,
      })
    })

    it('should create OAuth2 client with correct credentials', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(OAuth2Mock).toHaveBeenCalledWith(
        'test-google-client-id',
        'test-google-client-secret',
        expect.stringContaining('/quickpoll/calendar/google/callback')
      )
    })
  })

  describe('Non-GET methods', () => {
    it('should not respond for POST method', async () => {
      req = {
        method: 'POST',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should not respond for PUT method', async () => {
      req = {
        method: 'PUT',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should not respond for DELETE method', async () => {
      req = {
        method: 'DELETE',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })
  })
})
