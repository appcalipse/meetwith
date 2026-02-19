/**
 * Unit tests for /api/secure/group/[group_id]/invite endpoint
 * Testing group invitation functionality
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  isUserAdminOfGroup: jest.fn(),
  getGroup: jest.fn(),
  getGroupUsersInternal: jest.fn(),
  getContactById: jest.fn(),
  addUserToGroup: jest.fn(),
  addUserToGroupInvites: jest.fn(),
  getAccountFromDB: jest.fn(),
  getAccountNotificationSubscriptions: jest.fn(),
}))

jest.mock('@/utils/email_helper', () => ({
  sendInvitationEmail: jest.fn(),
}))

jest.mock('@/utils/user_manager', () => ({
  getAccountDisplayName: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/group/[group_id]/invite'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'
import * as userManager from '@/utils/user_manager'
import { ContactNotFound } from '@/utils/errors'

describe('/api/secure/group/[group_id]/invite', () => {
  const mockIsUserAdminOfGroup = database.isUserAdminOfGroup as jest.Mock
  const mockGetGroup = database.getGroup as jest.Mock
  const mockGetGroupUsersInternal = database.getGroupUsersInternal as jest.Mock
  const mockGetContactById = database.getContactById as jest.Mock
  const mockAddUserToGroup = database.addUserToGroup as jest.Mock
  const mockAddUserToGroupInvites = database.addUserToGroupInvites as jest.Mock
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock
  const mockGetAccountNotificationSubscriptions = database.getAccountNotificationSubscriptions as jest.Mock
  const mockSendInvitationEmail = emailHelper.sendInvitationEmail as jest.Mock
  const mockGetAccountDisplayName = userManager.getAccountDisplayName as jest.Mock

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
      method: 'POST',
      query: { group_id: 'group_123' },
      session: {
        account: {
          address: '0x1234567890abcdef',
          name: 'Test User',
        },
      } as any,
      body: {
        invitees: [],
        message: 'Join our group!',
      },
    }
    
    res = {
      status: statusMock,
    }
    
    mockGetAccountDisplayName.mockReturnValue('Test User')
  })

  describe('Method Validation', () => {
    it('should return 405 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
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

  describe('Authentication and Authorization', () => {
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

    it('should return 401 when group_id is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should return 403 when user is not admin', async () => {
      mockIsUserAdminOfGroup.mockResolvedValue(false)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'User is not a group admin' })
    })
  })

  describe('Successful Invitations', () => {
    beforeEach(() => {
      mockIsUserAdminOfGroup.mockResolvedValue(true)
      mockGetGroup.mockResolvedValue({
        id: 'group_123',
        name: 'Test Group',
      })
      mockGetGroupUsersInternal.mockResolvedValue([])
    })

    it('should send invitation by email successfully', async () => {
      req.body = {
        invitees: [
          {
            email: 'new@example.com',
            role: 'member',
          },
        ],
        message: 'Join us!',
      }
      
      mockAddUserToGroupInvites.mockResolvedValue(true)
      mockSendInvitationEmail.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddUserToGroupInvites).toHaveBeenCalledWith(
        'group_123',
        'member',
        'new@example.com',
        undefined
      )
      expect(mockSendInvitationEmail).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invitations sent successfully.',
        success: true,
      })
    })

    it('should send invitation by address successfully', async () => {
      req.body = {
        invitees: [
          {
            address: '0xabcdef123456',
            role: 'admin',
          },
        ],
      }
      
      mockGetAccountFromDB.mockResolvedValue({ address: '0xabcdef123456' })
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [
          { channel: 'EMAIL', destination: 'user@example.com' },
        ],
      })
      mockAddUserToGroupInvites.mockResolvedValue(true)
      mockSendInvitationEmail.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddUserToGroupInvites).toHaveBeenCalledWith(
        'group_123',
        'admin',
        undefined,
        '0xabcdef123456'
      )
      expect(mockSendInvitationEmail).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should add contact by contactId successfully', async () => {
      req.body = {
        invitees: [
          {
            contactId: 'contact_123',
            role: 'member',
          },
        ],
      }
      
      mockGetContactById.mockResolvedValue({
        id: 'contact_123',
        contact_address: '0xcontact123',
      })
      mockAddUserToGroup.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetContactById).toHaveBeenCalledWith('contact_123', '0x1234567890abcdef')
      expect(mockAddUserToGroup).toHaveBeenCalledWith('group_123', '0xcontact123', 'member')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle multiple invitees', async () => {
      req.body = {
        invitees: [
          { email: 'user1@example.com', role: 'member' },
          { email: 'user2@example.com', role: 'admin' },
          { address: '0xabc123', role: 'member' },
        ],
      }
      
      mockGetAccountFromDB.mockResolvedValue(null)
      mockAddUserToGroupInvites.mockResolvedValue(true)
      mockSendInvitationEmail.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddUserToGroupInvites).toHaveBeenCalledTimes(3)
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Validation Errors', () => {
    beforeEach(() => {
      mockIsUserAdminOfGroup.mockResolvedValue(true)
      mockGetGroup.mockResolvedValue({
        id: 'group_123',
        name: 'Test Group',
      })
    })

    it('should return 400 when inviting already invited user', async () => {
      mockGetGroupUsersInternal.mockResolvedValue([
        { member_id: 'existing@example.com' },
      ])
      
      req.body = {
        invitees: [
          { email: 'existing@example.com', role: 'member' },
        ],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        alreadyInvitedUsers: [{ email: 'existing@example.com', role: 'member' }],
        error: expect.stringContaining('already been invited'),
      })
    })

    it('should return 400 when inviting existing member by address', async () => {
      mockGetGroupUsersInternal.mockResolvedValue([
        { user_id: '0xexisting123' },
      ])
      
      req.body = {
        invitees: [
          { address: '0xEXISTING123', role: 'member' },
        ],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 404 when group not found', async () => {
      mockGetGroup.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Group not found' })
    })

    it('should return 404 when contact not found', async () => {
      mockGetGroupUsersInternal.mockResolvedValue([])
      mockGetGroup.mockResolvedValue({ id: 'group_123', name: 'Test' })
      mockGetContactById.mockRejectedValue(new ContactNotFound('Contact not found'))
      
      req.body = {
        invitees: [
          { contactId: 'invalid_contact', role: 'member' },
        ],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockIsUserAdminOfGroup.mockResolvedValue(true)
      mockGetGroup.mockResolvedValue({
        id: 'group_123',
        name: 'Test Group',
      })
      mockGetGroupUsersInternal.mockResolvedValue([])
    })

    it('should handle invitee without email or address', async () => {
      req.body = {
        invitees: [
          { role: 'member' }, // Missing email and address
        ],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should skip invalid invitee but return success
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(mockAddUserToGroupInvites).not.toHaveBeenCalled()
    })

    it('should continue on email sending failure', async () => {
      req.body = {
        invitees: [
          { email: 'test@example.com', role: 'member' },
        ],
      }
      
      mockAddUserToGroupInvites.mockResolvedValue(true)
      mockSendInvitationEmail.mockRejectedValue(new Error('Email failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should still return success even if email fails
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should use default message when not provided', async () => {
      req.body = {
        invitees: [
          { email: 'test@example.com', role: 'member' },
        ],
      }
      
      mockAddUserToGroupInvites.mockResolvedValue(true)
      mockSendInvitationEmail.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvitationEmail).toHaveBeenCalledWith(
        'test@example.com',
        'Test User',
        expect.stringContaining('Test Group'),
        'group_123',
        expect.any(Object),
        expect.any(String)
      )
    })

    it('should handle account without notification subscriptions', async () => {
      req.body = {
        invitees: [
          { address: '0xabc123', role: 'member' },
        ],
      }
      
      mockGetAccountFromDB.mockResolvedValue({ address: '0xabc123' })
      mockGetAccountNotificationSubscriptions.mockResolvedValue(null)
      mockAddUserToGroupInvites.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvitationEmail).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      mockIsUserAdminOfGroup.mockResolvedValue(true)
      mockGetGroup.mockResolvedValue({
        id: 'group_123',
        name: 'Test Group',
      })
      mockGetGroupUsersInternal.mockResolvedValue([])
    })

    it('should return 500 on unexpected error', async () => {
      mockAddUserToGroupInvites.mockRejectedValue(new Error('Database error'))
      
      req.body = {
        invitees: [
          { email: 'test@example.com', role: 'member' },
        ],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to send invitation' })
    })

    it('should handle database connection errors', async () => {
      mockIsUserAdminOfGroup.mockRejectedValue(new Error('Connection failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })
})
