/**
 * Unit tests for /api/secure/availabilities/[id] endpoint
 * Testing availability block CRUD operations
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getAvailabilityBlock: jest.fn(),
  updateAvailabilityBlock: jest.fn(),
  deleteAvailabilityBlock: jest.fn(),
  duplicateAvailabilityBlock: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/availabilities/[id]'
import * as database from '@/utils/database'
import {
  AvailabilityBlockNotFoundError,
  DefaultAvailabilityBlockError,
  InvalidAvailabilityBlockError,
  UnauthorizedError,
} from '@/utils/errors'
import * as Sentry from '@sentry/node'

describe('/api/secure/availabilities/[id]', () => {
  const mockGetAvailabilityBlock = database.getAvailabilityBlock as jest.Mock
  const mockUpdateAvailabilityBlock = database.updateAvailabilityBlock as jest.Mock
  const mockDeleteAvailabilityBlock = database.deleteAvailabilityBlock as jest.Mock
  const mockDuplicateAvailabilityBlock = database.duplicateAvailabilityBlock as jest.Mock
  const mockSentry = Sentry.captureException as jest.Mock

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
      query: { id: 'avail_123' },
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
    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method not allowed' })
    })

    it('should return 405 for unsupported methods', async () => {
      req.method = 'OPTIONS'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
    })
  })

  describe('Validation', () => {
    it('should return 400 when id is missing', async () => {
      req.query = {}

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid availability block ID' })
    })

    it('should return 400 when id is not a string', async () => {
      req.query = { id: ['avail_1', 'avail_2'] }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 401 when session is missing', async () => {
      req.session = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should return 401 when account is missing', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })
  })

  describe('GET - Retrieve Availability Block', () => {
    it('should return availability block successfully', async () => {
      const mockBlock = {
        id: 'avail_123',
        title: 'Work Hours',
        timezone: 'America/New_York',
        weekly_availability: [
          { day: 'monday', start: '09:00', end: '17:00' },
        ],
        is_default: false,
      }
      
      mockGetAvailabilityBlock.mockResolvedValue(mockBlock)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAvailabilityBlock).toHaveBeenCalledWith('avail_123', '0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        ...mockBlock,
        availabilities: mockBlock.weekly_availability,
      })
    })

    it('should return 404 when block not found', async () => {
      mockGetAvailabilityBlock.mockRejectedValue(
        new AvailabilityBlockNotFoundError('Block not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Block not found' })
    })
  })

  describe('PUT - Update Availability Block', () => {
    beforeEach(() => {
      req.method = 'PUT'
    })

    it('should update availability block successfully', async () => {
      req.body = {
        title: 'Updated Hours',
        timezone: 'UTC',
        weekly_availability: [
          { day: 'monday', start: '10:00', end: '18:00' },
        ],
        is_default: false,
      }
      
      const mockUpdated = {
        id: 'avail_123',
        title: 'Updated Hours',
        timezone: 'UTC',
        weekly_availability: [
          { day: 'monday', start: '10:00', end: '18:00' },
        ],
        is_default: false,
      }
      
      mockUpdateAvailabilityBlock.mockResolvedValue(mockUpdated)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateAvailabilityBlock).toHaveBeenCalledWith(
        'avail_123',
        '0x1234567890abcdef',
        'Updated Hours',
        'UTC',
        [{ day: 'monday', start: '10:00', end: '18:00' }],
        false
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        ...mockUpdated,
        availabilities: mockUpdated.weekly_availability,
        isDefault: false,
      })
    })

    it('should return 400 when title is missing', async () => {
      req.body = {
        timezone: 'UTC',
        weekly_availability: [],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required fields' })
    })

    it('should return 400 when timezone is missing', async () => {
      req.body = {
        title: 'Test',
        weekly_availability: [],
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 400 when weekly_availability is missing', async () => {
      req.body = {
        title: 'Test',
        timezone: 'UTC',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 404 when block not found', async () => {
      req.body = {
        title: 'Test',
        timezone: 'UTC',
        weekly_availability: [],
      }
      
      mockUpdateAvailabilityBlock.mockRejectedValue(
        new AvailabilityBlockNotFoundError('Not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('DELETE - Remove Availability Block', () => {
    beforeEach(() => {
      req.method = 'DELETE'
    })

    it('should delete availability block successfully', async () => {
      mockDeleteAvailabilityBlock.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDeleteAvailabilityBlock).toHaveBeenCalledWith(
        'avail_123',
        '0x1234567890abcdef'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 409 when trying to delete default block', async () => {
      mockDeleteAvailabilityBlock.mockRejectedValue(
        new DefaultAvailabilityBlockError("Cannot delete default block")
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(409)
      expect(jsonMock).toHaveBeenCalledWith({ error: "Cannot delete default block" })
    })

    it('should return 404 when block not found', async () => {
      mockDeleteAvailabilityBlock.mockRejectedValue(
        new AvailabilityBlockNotFoundError('Not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('POST - Duplicate Availability Block', () => {
    beforeEach(() => {
      req.method = 'POST'
    })

    it('should duplicate availability block successfully', async () => {
      req.body = {
        title: 'Copy of Work Hours',
        is_default: false,
      }
      
      const mockDuplicated = {
        id: 'avail_456',
        title: 'Copy of Work Hours',
        timezone: 'UTC',
        weekly_availability: [
          { day: 'monday', start: '09:00', end: '17:00' },
        ],
        is_default: false,
      }
      
      mockDuplicateAvailabilityBlock.mockResolvedValue(mockDuplicated)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockDuplicateAvailabilityBlock).toHaveBeenCalledWith(
        'avail_123',
        '0x1234567890abcdef',
        req.body
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        ...mockDuplicated,
        availabilities: mockDuplicated.weekly_availability,
        isDefault: false,
      })
    })

    it('should handle duplication with minimal data', async () => {
      req.body = {}
      
      const mockDuplicated = {
        id: 'avail_789',
        title: 'Copy',
        timezone: 'UTC',
        weekly_availability: [],
        is_default: false,
      }
      
      mockDuplicateAvailabilityBlock.mockResolvedValue(mockDuplicated)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 404 when source block not found', async () => {
      req.body = {}
      
      mockDuplicateAvailabilityBlock.mockRejectedValue(
        new AvailabilityBlockNotFoundError('Source not found')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('Error Handling', () => {
    it('should return 401 for UnauthorizedError', async () => {
      mockGetAvailabilityBlock.mockRejectedValue(new UnauthorizedError('No access'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'No access' })
    })

    it('should return 400 for InvalidAvailabilityBlockError', async () => {
      req.method = 'PUT'
      req.body = {
        title: 'Test',
        timezone: 'UTC',
        weekly_availability: [],
      }
      
      mockUpdateAvailabilityBlock.mockRejectedValue(
        new InvalidAvailabilityBlockError('Invalid data')
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should return 500 and capture exception for unknown errors', async () => {
      mockGetAvailabilityBlock.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'An error occurred' })
      expect(mockSentry).toHaveBeenCalled()
    })

    it('should handle null errors', async () => {
      mockGetAvailabilityBlock.mockRejectedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty id string', async () => {
      req.query = { id: '' }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })

    it('should handle complex weekly_availability data', async () => {
      req.method = 'PUT'
      req.body = {
        title: 'Complex Schedule',
        timezone: 'America/New_York',
        weekly_availability: [
          { day: 'monday', start: '09:00', end: '12:00' },
          { day: 'monday', start: '13:00', end: '17:00' },
          { day: 'tuesday', start: '10:00', end: '16:00' },
          { day: 'wednesday', start: '09:00', end: '17:00' },
        ],
        is_default: false,
      }
      
      mockUpdateAvailabilityBlock.mockResolvedValue({
        id: 'avail_123',
        ...req.body,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle setting block as default', async () => {
      req.method = 'PUT'
      req.body = {
        title: 'Default Hours',
        timezone: 'UTC',
        weekly_availability: [],
        is_default: true,
      }
      
      mockUpdateAvailabilityBlock.mockResolvedValue({
        id: 'avail_123',
        ...req.body,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockUpdateAvailabilityBlock).toHaveBeenCalledWith(
        'avail_123',
        '0x1234567890abcdef',
        'Default Hours',
        'UTC',
        [],
        true
      )
    })
  })
})
