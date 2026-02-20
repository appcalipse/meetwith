/**
 * Unit tests for /api/server/webhook/tg-reminder endpoint
 * Testing Telegram reminder webhook functionality
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getAccountsWithTgConnected: jest.fn(),
  getSlotsForAccountMinimal: jest.fn(),
  getConferenceDataBySlotId: jest.fn(),
}))

jest.mock('@/utils/services/telegram.helper', () => ({
  sendDm: jest.fn(),
}))

jest.mock('@/utils/calendar_manager', () => ({
  dateToLocalizedRange: jest.fn(() => '10:15 AM - 11:15 AM'),
}))

jest.mock('@sentry/node', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import * as Sentry from '@sentry/node'
import handler from '@/pages/api/server/webhook/tg-reminder'
import * as database from '@/utils/database'
import { sendDm } from '@/utils/services/telegram.helper'

describe('/api/server/webhook/tg-reminder', () => {
  const mockGetAccountsWithTgConnected = database.getAccountsWithTgConnected as jest.Mock
  const mockGetSlotsForAccountMinimal = database.getSlotsForAccountMinimal as jest.Mock
  const mockGetConferenceDataBySlotId = database.getConferenceDataBySlotId as jest.Mock
  const mockSendDm = sendDm as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let sendMock: jest.Mock
  let consoleInfoSpy: jest.SpyInstance
  let consoleErrorSpy: jest.SpyInstance

  const mockTgAccounts = [
    {
      account_address: '0x123',
      telegram_id: 'tg-123',
      timezone: 'America/New_York',
    },
  ]

  const fakeNow = new Date('2024-01-01T10:00:00Z')

  const mockSlots = [
    {
      id: 'slot-123',
      start: new Date(fakeNow.getTime() + 15 * 60 * 1000).toISOString(),
      end: new Date(fakeNow.getTime() + 75 * 60 * 1000).toISOString(),
    },
  ]

  const mockMeeting = {
    title: 'Test Meeting',
    meeting_url: 'https://meet.example.com/123',
    reminders: [2],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-01T10:00:00Z'))

    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))

    req = {
      method: 'POST',
    }

    res = {
      status: statusMock,
    }

    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.useRealTimers()
    consoleInfoSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('POST /api/server/webhook/tg-reminder', () => {
    it('should send Telegram reminders successfully', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue(mockMeeting)
      mockSendDm.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountsWithTgConnected).toHaveBeenCalled()
      expect(mockGetSlotsForAccountMinimal).toHaveBeenCalledWith(
        '0x123',
        expect.any(Date)
      )
      expect(mockGetConferenceDataBySlotId).toHaveBeenCalledWith('slot-123')
      expect(mockSendDm).toHaveBeenCalledWith(
        'tg-123',
        expect.stringContaining('Test Meeting')
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith('OK')
    })

    it('should handle accounts with no slots', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue([])

      const handlerPromise = handler(req as NextApiRequest, res as NextApiResponse)
      await jest.advanceTimersByTimeAsync(20000)
      await handlerPromise

      expect(mockGetConferenceDataBySlotId).not.toHaveBeenCalled()
      expect(mockSendDm).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle slots without IDs', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue([
        { id: null, start: new Date(), end: new Date() },
      ])

      const handlerPromise = handler(req as NextApiRequest, res as NextApiResponse)
      await jest.advanceTimersByTimeAsync(20000)
      await handlerPromise

      expect(mockGetConferenceDataBySlotId).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle meetings without reminders', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue({
        ...mockMeeting,
        reminders: [],
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendDm).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle empty telegram accounts', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetSlotsForAccountMinimal).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle errors and continue processing', async () => {
      const error = new Error('Telegram API error')
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue(mockMeeting)
      mockSendDm.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(503)
    })

    it('should handle timeout', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve([]), 25000))
      )

      const handlerPromise = handler(req as NextApiRequest, res as NextApiResponse)
      await jest.advanceTimersByTimeAsync(20000)
      await handlerPromise

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle database errors', async () => {
      const error = new Error('Database error')
      mockGetAccountsWithTgConnected.mockRejectedValue(error)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(consoleErrorSpy).toHaveBeenCalledWith(error)
      expect(statusMock).toHaveBeenCalledWith(503)
      expect(sendMock).toHaveBeenCalledWith('Resource Unavailable')
    })

    it('should send message with meeting details', async () => {
      mockGetAccountsWithTgConnected.mockResolvedValue(mockTgAccounts)
      mockGetSlotsForAccountMinimal.mockResolvedValue(mockSlots)
      mockGetConferenceDataBySlotId.mockResolvedValue(mockMeeting)
      mockSendDm.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendDm).toHaveBeenCalledWith(
        'tg-123',
        expect.stringContaining('Test Meeting')
      )
      expect(mockSendDm).toHaveBeenCalledWith(
        'tg-123',
        expect.stringContaining('https://meet.example.com/123')
      )
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetAccountsWithTgConnected).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
