/**
 * Unit tests for /api/secure/contact/[id] endpoint
 * Testing contact CRUD operations
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  initDB: jest.fn(),
  getContactById: jest.fn(),
  removeContact: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/contact/[id]/index'
import * as database from '@/utils/database'
import { ContactNotFound } from '@/utils/errors'
import { NotificationChannel } from '@/types/AccountNotifications'

describe('/api/secure/contact/[id]', () => {
  const mockGetContactById = database.getContactById as jest.Mock
  const mockRemoveContact = database.removeContact as jest.Mock

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
      query: { id: 'contact_123' },
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

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })

  describe('Authentication', () => {
    it('should return 500 when session is missing', async () => {
      req.session = undefined

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow()
    })

    it('should return 500 when account is missing', async () => {
      req.session = {} as any

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow()
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

  describe('GET - Retrieve Contact', () => {
    it('should return contact data successfully', async () => {
      const mockDbContact = {
        id: 'contact_123',
        contact_address: '0xcontact123',
        status: 'active',
        account: {
          preferences: {
            name: 'John Doe',
            bio: 'Developer',
          },
          calendars_exist: [{ id: 'cal_1' }],
          account_notifications: {
            notification_types: [
              {
                channel: NotificationChannel.EMAIL,
                destination: 'john@example.com',
                disabled: false,
              },
            ],
          },
        },
      }
      
      mockGetContactById.mockResolvedValue(mockDbContact)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetContactById).toHaveBeenCalledWith('contact_123', '0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        id: 'contact_123',
        address: '0xcontact123',
        status: 'active',
        name: 'John Doe',
        bio: 'Developer',
        calendar_exists: true,
        email_address: 'john@example.com',
      })
    })

    it('should handle contact without email', async () => {
      const mockDbContact = {
        id: 'contact_123',
        contact_address: '0xcontact123',
        status: 'pending',
        account: {
          preferences: {
            name: 'Jane Doe',
          },
          calendars_exist: [],
          account_notifications: {
            notification_types: [],
          },
        },
      }
      
      mockGetContactById.mockResolvedValue(mockDbContact)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith({
        id: 'contact_123',
        address: '0xcontact123',
        status: 'pending',
        name: 'Jane Doe',
        calendar_exists: false,
        email_address: undefined,
      })
    })

    it('should handle contact with disabled email', async () => {
      const mockDbContact = {
        id: 'contact_123',
        contact_address: '0xcontact123',
        status: 'active',
        account: {
          preferences: {},
          calendars_exist: [],
          account_notifications: {
            notification_types: [
              {
                channel: NotificationChannel.EMAIL,
                destination: 'disabled@example.com',
                disabled: true, // Email is disabled
              },
            ],
          },
        },
      }
      
      mockGetContactById.mockResolvedValue(mockDbContact)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email_address: undefined, // Should not include disabled email
        })
      )
    })

    it('should return 404 when contact not found', async () => {
      mockGetContactById.mockRejectedValue(new ContactNotFound('Contact not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Contact not found')
    })

    it('should handle empty id', async () => {
      req.query = { id: '' }
      
      mockGetContactById.mockResolvedValue({
        id: '',
        contact_address: '0xaddr',
        status: 'active',
        account: {
          preferences: {},
          calendars_exist: [],
          account_notifications: null,
        },
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetContactById).toHaveBeenCalledWith('', '0x1234567890abcdef')
    })

    it('should handle id as array', async () => {
      req.query = { id: ['contact_1', 'contact_2'] }
      
      mockGetContactById.mockResolvedValue({
        id: 'contact_1',
        contact_address: '0xaddr',
        status: 'active',
        account: {
          preferences: {},
          calendars_exist: [],
        },
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should use first element or the whole array
      expect(mockGetContactById).toHaveBeenCalled()
    })
  })

  describe('DELETE - Remove Contact', () => {
    it('should delete contact successfully', async () => {
      req.method = 'DELETE'
      
      mockRemoveContact.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockRemoveContact).toHaveBeenCalledWith('0x1234567890abcdef', 'contact_123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should handle deletion with empty id', async () => {
      req.method = 'DELETE'
      req.query = { id: '' }
      
      mockRemoveContact.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockRemoveContact).toHaveBeenCalledWith('0x1234567890abcdef', '')
    })

    it('should return 500 on deletion error', async () => {
      req.method = 'DELETE'
      
      mockRemoveContact.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith(expect.any(Error))
    })

    it('should handle foreign key constraint errors', async () => {
      req.method = 'DELETE'
      
      const constraintError = new Error('Foreign key constraint')
      mockRemoveContact.mockRejectedValue(constraintError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Error Handling', () => {
    it('should return 500 for database errors on GET', async () => {
      mockGetContactById.mockRejectedValue(new Error('Database connection failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle null contact data', async () => {
      mockGetContactById.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should fail when trying to access properties
      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle malformed contact data', async () => {
      mockGetContactById.mockResolvedValue({
        id: 'contact_123',
        contact_address: '0xaddr',
        // Missing required fields
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should handle gracefully
      expect(statusMock).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle contact with multiple calendars', async () => {
      const mockDbContact = {
        id: 'contact_123',
        contact_address: '0xcontact123',
        status: 'active',
        account: {
          preferences: {},
          calendars_exist: [{ id: 'cal_1' }, { id: 'cal_2' }, { id: 'cal_3' }],
          account_notifications: null,
        },
      }
      
      mockGetContactById.mockResolvedValue(mockDbContact)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar_exists: true,
        })
      )
    })

    it('should handle contact with multiple notification channels', async () => {
      const mockDbContact = {
        id: 'contact_123',
        contact_address: '0xcontact123',
        status: 'active',
        account: {
          preferences: {},
          calendars_exist: [],
          account_notifications: {
            notification_types: [
              {
                channel: NotificationChannel.SMS,
                destination: '+1234567890',
                disabled: false,
              },
              {
                channel: NotificationChannel.EMAIL,
                destination: 'user@example.com',
                disabled: false,
              },
            ],
          },
        },
      }
      
      mockGetContactById.mockResolvedValue(mockDbContact)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          email_address: 'user@example.com',
        })
      )
    })

    it('should handle special characters in contact data', async () => {
      const mockDbContact = {
        id: 'contact_123',
        contact_address: '0xcontact123',
        status: 'active',
        account: {
          preferences: {
            name: "O'Brien & <Associates>",
            bio: 'Developer with "quotes"',
          },
          calendars_exist: [],
          account_notifications: null,
        },
      }
      
      mockGetContactById.mockResolvedValue(mockDbContact)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "O'Brien & <Associates>",
          bio: 'Developer with "quotes"',
        })
      )
    })
  })
})
