/**
 * Unit tests for /api/quickpoll/calendar/office365/connect endpoint
 */

process.env.MS_GRAPH_CLIENT_ID = 'test-ms-graph-client-id'
process.env.MS_GRAPH_CLIENT_SECRET = 'test-ms-graph-client-secret'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/quickpoll/calendar/office365/connect'

describe('/api/quickpoll/calendar/office365/connect', () => {
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

  describe('GET method', () => {
    beforeEach(() => {
      req = {
        method: 'GET',
        query: {},
      }
    })

    it('should return Microsoft OAuth authorization URL without state', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        url: expect.stringContaining('login.microsoftonline.com'),
      })
      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      expect(url).toContain(`client_id=${process.env.MS_GRAPH_CLIENT_ID}`)
      expect(url).toContain('response_type=code')
      expect(url).toContain('redirect_uri=')
      expect(url).toContain('scope=')
    })

    it('should return auth URL with state parameter', async () => {
      req.query = { state: 'test-state-value' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      expect(url).toContain('state=test-state-value')
    })

    it('should include correct redirect URI in auth URL', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      expect(url).toContain('quickpoll/calendar/office365/callback')
    })

    it('should include Office 365 scopes in auth URL', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      expect(url).toContain('scope=')
      expect(url).toContain('Calendars')
    })

    it('should handle state as array by ignoring it', async () => {
      req.query = { state: ['state1', 'state2'] }

      await handler(req as NextApiRequest, res as NextApiResponse)

      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      // State param exists but is empty
      expect(url).toContain('state=')
    })

    it('should use common tenant endpoint', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      expect(url).toContain('common/oauth2/v2.0/authorize')
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

    it('should not respond for PATCH method', async () => {
      req = {
        method: 'PATCH',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })
  })

  describe('Environment configuration', () => {
    it('should use MS_GRAPH_CLIENT_ID from environment', async () => {
      req = {
        method: 'GET',
        query: {},
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      const url = (jsonMock.mock.calls[0][0] as { url: string }).url
      expect(url).toContain(`client_id=${process.env.MS_GRAPH_CLIENT_ID}`)
    })
  })
})
