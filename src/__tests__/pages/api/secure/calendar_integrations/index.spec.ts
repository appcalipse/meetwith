/**
 * Unit tests for /api/secure/calendar_integrations endpoint
 * Testing calendar integration listing and management
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock dependencies
jest.mock('@/utils/database', () => ({
  getConnectedCalendars: jest.fn(),
  countCalendarIntegrations: jest.fn(),
  countCalendarSyncs: jest.fn(),
  syncConnectedCalendars: jest.fn(),
  isProAccountAsync: jest.fn(),
  addOrUpdateConnectedCalendar: jest.fn(),
  removeConnectedCalendar: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/calendar_integrations/index'
import * as database from '@/utils/database'
import { CalendarSyncLimitExceededError } from '@/utils/errors'
import { TimeSlotSource } from '@/types/Meeting'
import * as Sentry from '@sentry/nextjs'

describe('/api/secure/calendar_integrations', () => {
  const mockGetConnectedCalendars = database.getConnectedCalendars as jest.Mock
  const mockCountCalendarIntegrations = database.countCalendarIntegrations as jest.Mock
  const mockCountCalendarSyncs = database.countCalendarSyncs as jest.Mock
  const mockSyncConnectedCalendars = database.syncConnectedCalendars as jest.Mock
  const mockIsProAccountAsync = database.isProAccountAsync as jest.Mock
  const mockAddOrUpdateConnectedCalendar = database.addOrUpdateConnectedCalendar as jest.Mock
  const mockRemoveConnectedCalendar = database.removeConnectedCalendar as jest.Mock
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
      query: {},
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

  describe('Authentication', () => {
    it('should return 400 when session is missing', async () => {
      req.session = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'SHOULD BE LOGGED IN' })
    })

    it('should return 400 when account is missing', async () => {
      req.session = {} as any

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
    })
  })

  describe('GET - List Calendar Integrations', () => {
    it('should return list of connected calendars', async () => {
      const mockCalendars = [
        {
          id: 'cal_1',
          provider: TimeSlotSource.GOOGLE,
          email: 'user@gmail.com',
          calendars: [{ id: 'primary', name: 'Primary' }],
          payload: JSON.stringify({ scope: 'https://www.googleapis.com/auth/calendar.readonly' }),
        },
      ]
      
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockResolvedValue(mockCalendars)
      mockCountCalendarIntegrations.mockResolvedValue(1)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetConnectedCalendars).toHaveBeenCalledWith('0x1234567890abcdef', {
        syncOnly: false,
      })
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        calendars: expect.arrayContaining([
          expect.objectContaining({
            id: 'cal_1',
            provider: TimeSlotSource.GOOGLE,
            email: 'user@gmail.com',
          }),
        ]),
        isPro: true,
        total: 1,
        upgradeRequired: false,
      })
    })

    it('should filter sync-only calendars when requested', async () => {
      req.query = { syncOnly: 'true' }
      
      mockIsProAccountAsync.mockResolvedValue(false)
      mockGetConnectedCalendars.mockResolvedValue([])
      mockCountCalendarIntegrations.mockResolvedValue(0)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetConnectedCalendars).toHaveBeenCalledWith('0x1234567890abcdef', {
        syncOnly: true,
      })
    })

    it('should return upgradeRequired for free users with 2+ integrations', async () => {
      mockIsProAccountAsync.mockResolvedValue(false)
      mockGetConnectedCalendars.mockResolvedValue([])
      mockCountCalendarIntegrations.mockResolvedValue(3)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          upgradeRequired: true,
        })
      )
    })

    it('should not require upgrade for pro users', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockResolvedValue([])
      mockCountCalendarIntegrations.mockResolvedValue(10)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          upgradeRequired: false,
        })
      )
    })

    it('should trigger background calendar sync', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockResolvedValue([])
      mockCountCalendarIntegrations.mockResolvedValue(0)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSyncConnectedCalendars).toHaveBeenCalledWith('0x1234567890abcdef')
    })

    it('should return 500 on error', async () => {
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'An unexpected error occurred.' })
      expect(mockSentry).toHaveBeenCalled()
    })
  })

  describe('PUT - Update Calendar Integration', () => {
    beforeEach(() => {
      req.method = 'PUT'
    })

    it('should update calendar integration successfully for pro user', async () => {
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
        calendars: [
          { id: 'primary', name: 'Primary', sync: true },
        ],
      }
      
      mockIsProAccountAsync.mockResolvedValue(true)
      mockAddOrUpdateConnectedCalendar.mockResolvedValue({ id: 'cal_1' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockAddOrUpdateConnectedCalendar).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'user@gmail.com',
        TimeSlotSource.GOOGLE,
        [{ id: 'primary', name: 'Primary', sync: true }]
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should enforce sync limit for free users', async () => {
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
        calendars: [
          { id: 'cal1', sync: true },
          { id: 'cal2', sync: true },
          { id: 'cal3', sync: true }, // 3 synced calendars
        ],
      }
      
      mockIsProAccountAsync.mockResolvedValue(false)
      mockCountCalendarSyncs.mockResolvedValue(0)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        error: expect.stringContaining('limit'),
      })
    })

    it('should allow up to 2 synced calendars for free users', async () => {
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
        calendars: [
          { id: 'cal1', sync: true },
          { id: 'cal2', sync: true },
        ],
      }
      
      mockIsProAccountAsync.mockResolvedValue(false)
      mockCountCalendarSyncs.mockResolvedValue(0)
      mockAddOrUpdateConnectedCalendar.mockResolvedValue({ id: 'cal_1' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should count existing syncs from other integrations', async () => {
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
        calendars: [
          { id: 'cal1', sync: true },
        ],
      }
      
      mockIsProAccountAsync.mockResolvedValue(false)
      mockCountCalendarSyncs.mockResolvedValue(2) // Already has 2 syncs
      mockAddOrUpdateConnectedCalendar.mockResolvedValue({ id: 'cal_1' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 500 on update error', async () => {
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
        calendars: [],
      }
      
      mockIsProAccountAsync.mockResolvedValue(true)
      mockAddOrUpdateConnectedCalendar.mockRejectedValue(new Error('Update failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(mockSentry).toHaveBeenCalled()
    })
  })

  describe('DELETE - Remove Calendar Integration', () => {
    beforeEach(() => {
      req.method = 'DELETE'
    })

    it('should delete calendar integration successfully', async () => {
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
      }
      
      mockRemoveConnectedCalendar.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockRemoveConnectedCalendar).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'user@gmail.com',
        TimeSlotSource.GOOGLE
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({})
    })

    it('should handle deletion with Office365', async () => {
      req.body = {
        email: 'user@outlook.com',
        provider: TimeSlotSource.OFFICE,
      }
      
      mockRemoveConnectedCalendar.mockResolvedValue(true)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockRemoveConnectedCalendar).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'user@outlook.com',
        TimeSlotSource.OFFICE
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle calendars with parsed JSON payload', async () => {
      const mockCalendars = [
        {
          id: 'cal_1',
          provider: TimeSlotSource.GOOGLE,
          email: 'user@gmail.com',
          calendars: [],
          payload: { scope: 'calendar.readonly' }, // Already parsed
        },
      ]
      
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockResolvedValue(mockCalendars)
      mockCountCalendarIntegrations.mockResolvedValue(1)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle calendars without payload', async () => {
      const mockCalendars = [
        {
          id: 'cal_1',
          provider: TimeSlotSource.WEBCAL,
          email: 'user@example.com',
          calendars: [],
          payload: null,
        },
      ]
      
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockResolvedValue(mockCalendars)
      mockCountCalendarIntegrations.mockResolvedValue(1)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle Office365 permission calculation', async () => {
      const mockCalendars = [
        {
          id: 'cal_1',
          provider: TimeSlotSource.OFFICE,
          email: 'user@outlook.com',
          calendars: [],
          payload: JSON.stringify({ scope: 'Calendars.Read offline_access' }),
        },
      ]
      
      mockIsProAccountAsync.mockResolvedValue(true)
      mockGetConnectedCalendars.mockResolvedValue(mockCalendars)
      mockCountCalendarIntegrations.mockResolvedValue(1)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          calendars: expect.arrayContaining([
            expect.objectContaining({
              provider: TimeSlotSource.OFFICE,
              grantedPermissions: expect.any(Number),
              expectedPermissions: expect.any(Number),
            }),
          ]),
        })
      )
    })

    it('should handle calendars with non-sync calendars for free users', async () => {
      req.method = 'PUT'
      req.body = {
        email: 'user@gmail.com',
        provider: TimeSlotSource.GOOGLE,
        calendars: [
          { id: 'cal1', sync: false },
          { id: 'cal2', sync: false },
          { id: 'cal3', sync: false },
        ],
      }
      
      mockIsProAccountAsync.mockResolvedValue(false)
      mockCountCalendarSyncs.mockResolvedValue(0)
      mockAddOrUpdateConnectedCalendar.mockResolvedValue({ id: 'cal_1' })

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should succeed since no calendars are synced
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Unsupported Methods', () => {
    it('should handle POST requests gracefully', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Handler doesn't explicitly handle POST, so it should complete without error
      expect(statusMock).not.toHaveBeenCalledWith(405)
    })

    it('should handle PATCH requests gracefully', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalledWith(405)
    })
  })
})
