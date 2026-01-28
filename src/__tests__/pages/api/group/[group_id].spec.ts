/**
 * Unit tests for /api/group/[group_id]/index endpoint
 * Testing GET requests, authorization, and error handling
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock database
jest.mock('@/utils/database', () => ({
  getGroupName: jest.fn(),
  initDB: jest.fn(),
}))

// Mock iron session
jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/group/[group_id]/index'
import {
  GroupNotExistsError,
  NotGroupMemberError,
} from '@/utils/errors'
import * as database from '@/utils/database'
import * as sessionRoute from '@/ironAuth/withSessionApiRoute'

describe('/api/group/[group_id]', () => {
  const mockGetGroupName = database.getGroupName as jest.Mock
  const mockInitDB = database.initDB as jest.Mock
  const mockWithSessionRoute = sessionRoute.withSessionRoute as jest.Mock

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
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
    it('should return 405 for non-GET requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
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
  })

  describe('Successful Group Retrieval', () => {
    it('should return group data for valid group_id', async () => {
      const mockGroup = {
        id: 'group_123',
        name: 'Engineering Team',
        description: 'Our engineering team',
      }
      
      mockGetGroupName.mockResolvedValue(mockGroup)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockInitDB).toHaveBeenCalled()
      expect(mockGetGroupName).toHaveBeenCalledWith('group_123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGroup)
    })

    it('should handle group with special characters', async () => {
      req.query = { group_id: 'group-with-dashes_123' }
      const mockGroup = {
        id: 'group-with-dashes_123',
        name: 'Special Group',
      }
      
      mockGetGroupName.mockResolvedValue(mockGroup)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroupName).toHaveBeenCalledWith('group-with-dashes_123')
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Authorization Errors', () => {
    it('should return 403 when user is not a group member', async () => {
      mockGetGroupName.mockRejectedValue(
        new NotGroupMemberError('group_123')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
      }))
    })

    it('should handle unauthorized access attempts', async () => {
      const error = new NotGroupMemberError('private_group')
      mockGetGroupName.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ error: error.message })
    })
  })

  describe('Not Found Errors', () => {
    it('should return 404 when group does not exist', async () => {
      mockGetGroupName.mockRejectedValue(
        new GroupNotExistsError('nonexistent_group')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.any(String),
      }))
    })
  })

  describe('Error Handling', () => {
    it('should return 500 for database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockGetGroupName.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith(dbError)
    })

    it('should handle unexpected errors', async () => {
      mockGetGroupName.mockRejectedValue('Unexpected error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Database Initialization', () => {
    it('should initialize database on every request', async () => {
      mockGetGroupName.mockResolvedValue({ id: 'group_123', name: 'Test' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockInitDB).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty group_id', async () => {
      req.query = { group_id: '' }
      mockGetGroupName.mockRejectedValue(new GroupNotExistsError(''))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroupName).toHaveBeenCalledWith('')
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle very long group_id', async () => {
      const longId = 'a'.repeat(500)
      req.query = { group_id: longId }
      mockGetGroupName.mockResolvedValue({ id: longId, name: 'Group' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroupName).toHaveBeenCalledWith(longId)
    })

    it('should handle UUID format group_id', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      req.query = { group_id: uuid }
      mockGetGroupName.mockResolvedValue({ id: uuid, name: 'UUID Group' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroupName).toHaveBeenCalledWith(uuid)
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Session Middleware', () => {
    it('should wrap handler with session route', () => {
      expect(mockWithSessionRoute).toHaveBeenCalled()
    })
  })
})
