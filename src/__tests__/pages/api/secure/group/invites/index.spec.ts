/**
 * Unit tests for /api/secure/group/invites endpoint
 * Testing group invitation listing
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  initDB: jest.fn(),
  getAccountNotificationSubscriptionEmail: jest.fn(),
  getGroupInvites: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/group/invites/index'
import * as database from '@/utils/database'

describe('/api/secure/group/invites', () => {
  const mockGetAccountNotificationSubscriptionEmail = database.getAccountNotificationSubscriptionEmail as jest.Mock
  const mockGetGroupInvites = database.getGroupInvites as jest.Mock

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
      expect(sendMock).toHaveBeenCalledWith('Unauthorized')
    })
  })

  describe('Successful Retrieval', () => {
    it('should return list of group invites', async () => {
      const mockInvites = [
        {
          group: {
            id: 'group_1',
            name: 'Team Alpha',
            slug: 'team-alpha',
          },
        },
        {
          group: {
            id: 'group_2',
            name: 'Team Beta',
            slug: 'team-beta',
          },
        },
      ]
      
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue(mockInvites)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountNotificationSubscriptionEmail).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockGetGroupInvites).toHaveBeenCalledWith({
        address: '0x1234567890abcdef',
        email: 'user@example.com',
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([
        {
          id: 'group_1',
          name: 'Team Alpha',
          slug: 'team-alpha',
        },
        {
          id: 'group_2',
          name: 'Team Beta',
          slug: 'team-beta',
        },
      ])
    })

    it('should return empty array when no invites exist', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([])
    })

    it('should handle user without email', async () => {
      const mockInvites = [
        {
          group: {
            id: 'group_1',
            name: 'Team',
            slug: 'team',
          },
        },
      ]
      
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue(null)
      mockGetGroupInvites.mockResolvedValue(mockInvites)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroupInvites).toHaveBeenCalledWith({
        address: '0x1234567890abcdef',
        email: null,
      })
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle user with undefined email', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue(undefined)
      mockGetGroupInvites.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGroupInvites).toHaveBeenCalledWith({
        address: '0x1234567890abcdef',
        email: undefined,
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle groups with missing fields', async () => {
      const mockInvites = [
        {
          group: {
            id: 'group_1',
            name: 'Incomplete Group',
            // slug is missing
          },
        },
      ]
      
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue(mockInvites)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([
        {
          id: 'group_1',
          name: 'Incomplete Group',
          slug: undefined,
        },
      ])
    })

    it('should handle groups with extra fields', async () => {
      const mockInvites = [
        {
          group: {
            id: 'group_1',
            name: 'Complete Group',
            slug: 'complete-group',
            description: 'Extra field',
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      ]
      
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue(mockInvites)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([
        {
          id: 'group_1',
          name: 'Complete Group',
          slug: 'complete-group',
        },
      ])
    })

    it('should handle large number of invites', async () => {
      const mockInvites = Array.from({ length: 100 }, (_, i) => ({
        group: {
          id: `group_${i}`,
          name: `Group ${i}`,
          slug: `group-${i}`,
        },
      }))
      
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue(mockInvites)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock.mock.calls[0][0]).toHaveLength(100)
    })

    it('should handle special characters in group names', async () => {
      const mockInvites = [
        {
          group: {
            id: 'group_1',
            name: 'Team "Alpha" & Beta\'s <Group>',
            slug: 'team-alpha-beta',
          },
        },
      ]
      
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue(mockInvites)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([
        {
          id: 'group_1',
          name: 'Team "Alpha" & Beta\'s <Group>',
          slug: 'team-alpha-beta',
        },
      ])
    })
  })

  describe('Error Handling', () => {
    it('should return 500 when email lookup fails', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should return 500 when invite lookup fails', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockRejectedValue(new Error('Query failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle database connection errors', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockRejectedValue(new Error('Connection timeout'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle null invites response', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Will fail when trying to map over null
      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle malformed invite data', async () => {
      mockGetAccountNotificationSubscriptionEmail.mockResolvedValue('user@example.com')
      mockGetGroupInvites.mockResolvedValue([
        { group: null },
      ])

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Will fail when trying to access group properties
      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })
})
