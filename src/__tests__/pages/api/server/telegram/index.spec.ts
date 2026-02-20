/**
 * Unit tests for /api/server/telegram/index endpoint
 * Testing Telegram notification configuration
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'
process.env.NEXT_PUBLIC_ENV_CONFIG = 'test'

jest.mock('@/utils/database', () => ({
  getTgConnectionByTgId: jest.fn(),
  getAccountNotificationSubscriptions: jest.fn(),
  setAccountNotificationSubscriptions: jest.fn(),
  deleteAllTgConnections: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/telegram/index'
import * as database from '@/utils/database'
import { NotificationChannel } from '@/types/AccountNotifications'

describe('/api/server/telegram', () => {
  const mockGetTgConnectionByTgId = database.getTgConnectionByTgId as jest.Mock
  const mockGetAccountNotificationSubscriptions =
    database.getAccountNotificationSubscriptions as jest.Mock
  const mockSetAccountNotificationSubscriptions =
    database.setAccountNotificationSubscriptions as jest.Mock
  const mockDeleteAllTgConnections = database.deleteAllTgConnections as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockTgConnection = {
    tg_id: 'tg-123',
    account_address: '0x123',
  }

  const mockSubscriptions = {
    notification_types: [
      {
        channel: NotificationChannel.EMAIL,
        destination: 'user@example.com',
        disabled: false,
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        tg_id: 'tg-123',
        chat_id: 'chat-456',
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/telegram', () => {
    it('should add Telegram notification successfully', async () => {
      mockGetTgConnectionByTgId.mockResolvedValue(mockTgConnection)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(mockSubscriptions)
      mockSetAccountNotificationSubscriptions.mockResolvedValue(undefined)
      mockDeleteAllTgConnections.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetTgConnectionByTgId).toHaveBeenCalledWith('tg-123')
      expect(mockGetAccountNotificationSubscriptions).toHaveBeenCalledWith('0x123')
      expect(mockSetAccountNotificationSubscriptions).toHaveBeenCalledWith('0x123', {
        notification_types: expect.arrayContaining([
          expect.objectContaining({
            channel: NotificationChannel.EMAIL,
            destination: 'user@example.com',
            disabled: false,
          }),
          expect.objectContaining({
            channel: NotificationChannel.TELEGRAM,
            destination: 'chat-456',
            disabled: false,
          }),
        ]),
      })
      expect(mockDeleteAllTgConnections).toHaveBeenCalledWith('0x123')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        account_address: '0x123',
        message: 'Telegram notification added successfully',
        success: true,
      })
    })

    it('should return 404 when Telegram connection not found', async () => {
      mockGetTgConnectionByTgId.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith({
        message: 'Telegram connection not found',
        success: false,
      })
      expect(mockGetAccountNotificationSubscriptions).not.toHaveBeenCalled()
    })

    it('should return 400 when Telegram notification already exists', async () => {
      const existingSubscriptions = {
        notification_types: [
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'existing-chat',
            disabled: false,
          },
        ],
      }
      mockGetTgConnectionByTgId.mockResolvedValue(mockTgConnection)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(existingSubscriptions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Telegram notification already added',
        success: false,
      })
      expect(mockSetAccountNotificationSubscriptions).not.toHaveBeenCalled()
    })

    it('should add Telegram notification when disabled one exists', async () => {
      const existingSubscriptions = {
        notification_types: [
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'old-chat',
            disabled: true,
          },
        ],
      }
      mockGetTgConnectionByTgId.mockResolvedValue(mockTgConnection)
      mockGetAccountNotificationSubscriptions.mockResolvedValue(existingSubscriptions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Handler finds existing TELEGRAM channel (regardless of disabled flag)
      // and returns 400
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Telegram notification already added',
        success: false,
      })
    })

    it('should handle empty notification types', async () => {
      mockGetTgConnectionByTgId.mockResolvedValue(mockTgConnection)
      mockGetAccountNotificationSubscriptions.mockResolvedValue({
        notification_types: [],
      })
      mockSetAccountNotificationSubscriptions.mockResolvedValue(undefined)
      mockDeleteAllTgConnections.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(mockSetAccountNotificationSubscriptions).toHaveBeenCalledWith('0x123', {
        notification_types: [
          {
            channel: NotificationChannel.TELEGRAM,
            destination: 'chat-456',
            disabled: false,
          },
        ],
      })
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetTgConnectionByTgId).not.toHaveBeenCalled()
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

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })
  })
})
