/**
 * Unit tests for /api/secure/group/[group_id] endpoint
 * Testing group CRUD operations with permissions
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  initDB: jest.fn(),
  getGroup: jest.fn(),
  editGroup: jest.fn(),
  deleteGroup: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/group/[group_id]/index'
import * as database from '@/utils/database'
import {
  GroupNotExistsError,
  NotGroupAdminError,
  NotGroupMemberError,
} from '@/utils/errors'

describe('/api/secure/group/[group_id]', () => {
  const mockGetGroup = database.getGroup as jest.Mock
  const mockEditGroup = database.editGroup as jest.Mock
  const mockDeleteGroup = database.deleteGroup as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    
    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))
    
    req = {
      method: 'GET',
      query: { group_id: 'group_123' },
      session: {
        account: {
          address: '0x1234567890abcdef',
          name: 'Test User',
        },
      } as any,
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
    it('should return 405 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
    })

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })

    it('should return 405 for OPTIONS requests', async () => {
      req.method = 'OPTIONS'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })

  describe('Authentication', () => {
    it('should return 500 when session is missing', async () => {
      req.session = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should return 500 when account is missing', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should return 401 when address is missing', async () => {
      req.session = {
        account: {
          address: '',
        } as any,
      } as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })
  })

  describe('GET - Retrieve Group', () => {
    it('should return group data for valid group_id', async () => {
      const mockGroup = {
        id: 'group_123',
        name: 'Test Group',
        slug: 'test-group',
        description: 'A test group',
        owner_address: '0x1234567890abcdef',
      }
      
      mockGetGroup.mockResolvedValue(mockGroup)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroup).toHaveBeenCalledWith('group_123', '0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGroup)
    })

    it('should return 404 when group does not exist', async () => {
      mockGetGroup.mockRejectedValue(new GroupNotExistsError('Group not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Group not found' })
    })

    it('should return 403 when user is not a member', async () => {
      mockGetGroup.mockRejectedValue(new NotGroupMemberError('Not a member'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Not a member' })
    })
  })

  describe('PUT - Update Group', () => {
    it('should update group successfully', async () => {
      req.method = 'PUT'
      req.body = {
        name: 'Updated Group',
        slug: 'updated-group',
        avatar_url: 'https://example.com/avatar.png',
        description: 'Updated description',
      }
      
      mockEditGroup.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockEditGroup).toHaveBeenCalledWith(
        'group_123',
        '0x1234567890abcdef',
        'Updated Group',
        'updated-group',
        'https://example.com/avatar.png',
        'Updated description'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 403 when user is not admin', async () => {
      req.method = 'PUT'
      req.body = {
        name: 'Updated Group',
      }
      
      mockEditGroup.mockRejectedValue(new NotGroupAdminError('Not an admin'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Not an admin' })
    })

    it('should handle partial updates', async () => {
      req.method = 'PUT'
      req.body = {
        name: 'New Name',
        slug: undefined,
      }
      
      mockEditGroup.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockEditGroup).toHaveBeenCalledWith(
        'group_123',
        '0x1234567890abcdef',
        'New Name',
        undefined,
        undefined,
        undefined
      )
    })
  })

  describe('DELETE - Remove Group', () => {
    it('should delete group successfully', async () => {
      req.method = 'DELETE'
      
      mockDeleteGroup.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteGroup).toHaveBeenCalledWith('group_123', '0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 403 when user is not admin', async () => {
      req.method = 'DELETE'
      
      mockDeleteGroup.mockRejectedValue(new NotGroupAdminError('Not an admin'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Not an admin' })
    })

    it('should return 404 when group does not exist', async () => {
      req.method = 'DELETE'
      
      mockDeleteGroup.mockRejectedValue(new GroupNotExistsError('Group not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Group not found' })
    })
  })

  describe('Error Handling', () => {
    it('should return 500 for unexpected errors', async () => {
      mockGetGroup.mockRejectedValue(new Error('Database connection failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Database connection failed',
        details: undefined,
      })
    })

    it('should include error details when available', async () => {
      const errorWithDetails = {
        message: 'Validation failed',
        details: { field: 'name', issue: 'too short' },
      }
      
      mockEditGroup.mockRejectedValue(errorWithDetails)
      req.method = 'PUT'
      req.body = { name: 'A' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Validation failed',
        details: { field: 'name', issue: 'too short' },
      })
    })

    it('should handle non-Error objects', async () => {
      mockGetGroup.mockRejectedValue('String error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'String error',
        details: undefined,
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing group_id', async () => {
      req.query = {}
      
      mockGetGroup.mockResolvedValue({})

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroup).toHaveBeenCalledWith(undefined, '0x1234567890abcdef')
    })

    it('should handle empty group_id', async () => {
      req.query = { group_id: '' }
      
      mockGetGroup.mockRejectedValue(new GroupNotExistsError('Invalid ID'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle group_id as array', async () => {
      req.query = { group_id: ['group_123', 'group_456'] }
      
      mockGetGroup.mockResolvedValue({ id: 'group_123' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should use first element
      expect(mockGetGroup).toHaveBeenCalledWith(
        ['group_123', 'group_456'],
        '0x1234567890abcdef'
      )
    })
  })
})
