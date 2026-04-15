/**
 * Unit tests for /api/secure/contact/index endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getContacts: jest.fn(),
  getContactLean: jest.fn(),
  isProAccountAsync: jest.fn(),
  initDB: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/contact/index'
import * as database from '@/utils/database'

describe('/api/secure/contact/index', () => {
  const mockGetContacts = database.getContacts as jest.Mock
  const mockGetContactLean = database.getContactLean as jest.Mock
  const mockIsProAccountAsync = database.isProAccountAsync as jest.Mock
  const mockInitDB = database.initDB as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockContacts = [
    {
      id: 'contact-1',
      address: '0xcontact1',
      name: 'Contact One',
      email: 'contact1@example.com',
    },
    {
      id: 'contact-2',
      address: '0xcontact2',
      name: 'Contact Two',
      email: 'contact2@example.com',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'GET',
      query: {},
      session: {
        account: {
          address: '0x1234567890abcdef',
        },
      } as any,
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/secure/contact', () => {
    it('should return all contacts', async () => {
      mockGetContacts.mockResolvedValue({ result: mockContacts })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockInitDB).toHaveBeenCalled()
      expect(mockGetContacts).toHaveBeenCalledWith('0x1234567890abcdef', undefined, undefined, undefined)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockContacts)
    })

    it('should return metadata when requested', async () => {
      req.query = { metadata: 'true' }
      mockIsProAccountAsync.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockIsProAccountAsync).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(jsonMock).toHaveBeenCalledWith({
        upgradeRequired: false,
      })
    })

    it('should indicate upgrade required for non-pro users', async () => {
      req.query = { metadata: 'true' }
      mockIsProAccountAsync.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith({
        upgradeRequired: true,
      })
    })

    it('should return lean contacts when type=lean', async () => {
      req.query = { type: 'lean' }
      mockGetContactLean.mockResolvedValue({ result: mockContacts })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetContactLean).toHaveBeenCalledWith('0x1234567890abcdef', undefined, undefined, undefined)
      expect(jsonMock).toHaveBeenCalledWith(mockContacts)
    })

    it('should support search query', async () => {
      req.query = { q: 'contact' }
      mockGetContacts.mockResolvedValue({ result: mockContacts })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetContacts).toHaveBeenCalledWith('0x1234567890abcdef', 'contact', undefined, undefined)
    })

    it('should support pagination with limit and offset', async () => {
      req.query = { limit: '10', offset: '5' }
      mockGetContacts.mockResolvedValue({ result: mockContacts })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetContacts).toHaveBeenCalledWith('0x1234567890abcdef', undefined, 10, 5)
    })

    it('should handle empty contact list', async () => {
      mockGetContacts.mockResolvedValue({ result: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith([])
    })

    it('should return 401 for unauthorized requests', async () => {
      req.session = { account: { address: undefined } } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(sendMock).toHaveBeenCalledWith('Unauthorized')
    })

    it('should handle database errors', async () => {
      mockGetContacts.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should filter duplicate contacts', async () => {
      const duplicateContacts = [
        ...mockContacts,
        { ...mockContacts[0] }, // duplicate
      ]
      mockGetContacts.mockResolvedValue({ result: duplicateContacts })

      await handler(req as NextApiRequest, res as NextApiResponse)

      const result = jsonMock.mock.calls[0][0]
      expect(result.length).toBe(2)
    })

    it('should handle null results', async () => {
      mockGetContacts.mockResolvedValue({ result: null })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith([])
    })
  })

  describe('Non-GET methods', () => {
    it('should return 405 for POST', async () => {
      req.method = 'POST'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
    })

    it('should return 405 for DELETE', async () => {
      req.method = 'DELETE'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for PATCH', async () => {
      req.method = 'PATCH'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for PUT', async () => {
      req.method = 'PUT'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
