/**
 * Unit tests for /api/secure/group/index endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  createGroupInDB: jest.fn(),
  isProAccountAsync: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@/utils/errors', () => ({
  AccountNotFoundError: class extends Error {},
  GroupCreationError: class extends Error {
    details: string
    constructor(message: string, details: string = '') {
      super(message)
      this.details = details
    }
  },
  SchedulingGroupLimitExceededError: class extends Error {
    constructor() {
      super('Group limit exceeded')
    }
  },
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/group/index'
import * as database from '@/utils/database'
import {
  AccountNotFoundError,
  GroupCreationError,
  SchedulingGroupLimitExceededError,
} from '@/utils/errors'

describe('/api/secure/group/index', () => {
  const mockCreateGroupInDB = database.createGroupInDB as jest.Mock
  const mockIsProAccountAsync = database.isProAccountAsync as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockGroup = {
    id: 'group-123',
    name: 'Test Group',
    slug: 'test-group',
    owner_address: '0x1234567890abcdef',
    created_at: '2024-01-01',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        name: 'Test Group',
        slug: 'test-group',
      },
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

  describe('POST /api/secure/group', () => {
    it('should create group for pro users', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateGroupInDB.mockResolvedValue(mockGroup)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockIsProAccountAsync).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockCreateGroupInDB).toHaveBeenCalledWith('Test Group', '0x1234567890abcdef', 'test-group')
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith(mockGroup)
    })

    it('should create group without slug', async () => {
      req.body = { name: 'Test Group' }
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateGroupInDB.mockResolvedValue(mockGroup)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateGroupInDB).toHaveBeenCalledWith('Test Group', '0x1234567890abcdef', undefined)
      expect(statusMock).toHaveBeenCalledWith(201)
    })

    it('should return 403 for non-pro users', async () => {
      mockIsProAccountAsync.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateGroupInDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Group limit exceeded' })
    })

    it('should return 401 for unauthorized requests', async () => {
      req.session = { account: undefined } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(sendMock).toHaveBeenCalledWith('Unauthorized')
    })

    it('should return 400 when name is missing', async () => {
      req.body = { slug: 'test-group' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateGroupInDB).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Name is required' })
    })

    it('should return 400 when name is empty', async () => {
      req.body = { name: '', slug: 'test-group' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should handle AccountNotFoundError', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateGroupInDB.mockRejectedValue(new AccountNotFoundError('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User account not found' })
    })

    it('should handle GroupCreationError with details', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateGroupInDB.mockRejectedValue(new GroupCreationError('Failed to create', 'Duplicate slug'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to create',
        details: 'Duplicate slug',
      })
    })

    it('should handle SchedulingGroupLimitExceededError directly', async () => {
      mockIsProAccountAsync.mockRejectedValue(new SchedulingGroupLimitExceededError())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should handle generic errors', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockCreateGroupInDB.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Internal server error',
        details: 'Database error',
      })
    })
  })

  describe('Non-POST methods', () => {
    it('should return 405 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method Not Allowed' })
    })

    it('should return 405 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })
})
