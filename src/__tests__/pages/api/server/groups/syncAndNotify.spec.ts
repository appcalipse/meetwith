/**
 * Unit tests for /api/server/groups/syncAndNotify endpoint
 * Testing group invitation notifications
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/notification_helper', () => ({
  notifyForGroupInviteJoinOrReject: jest.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/groups/syncAndNotify'
import * as notificationHelper from '@/utils/notification_helper'

describe('/api/server/groups/syncAndNotify', () => {
  const mockNotifyForGroupInviteJoinOrReject = notificationHelper.notifyForGroupInviteJoinOrReject as jest.Mock
  const mockCaptureException = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let sendMock: jest.Mock

  const mockGroupRequest = {
    accountsToNotify: ['0x123', '0x456', '0x789'],
    group_id: 'group-123',
    notifyType: 'invite',
  }

  beforeEach(() => {
    jest.clearAllMocks()

    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))

    req = {
      method: 'POST',
      body: { ...mockGroupRequest },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/groups/syncAndNotify', () => {
    it('should send group invite notifications successfully', async () => {
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        mockGroupRequest.accountsToNotify,
        mockGroupRequest.group_id,
        mockGroupRequest.notifyType
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(true)
    })

    it('should handle notification errors gracefully', async () => {
      const notifyError = new Error('Notification failed')
      mockNotifyForGroupInviteJoinOrReject.mockRejectedValue(notifyError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(notifyError)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(true)
    })

    it('should handle join notification type', async () => {
      req.body = { ...mockGroupRequest, notifyType: 'join' }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        mockGroupRequest.accountsToNotify,
        mockGroupRequest.group_id,
        'join'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle reject notification type', async () => {
      req.body = { ...mockGroupRequest, notifyType: 'reject' }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        mockGroupRequest.accountsToNotify,
        mockGroupRequest.group_id,
        'reject'
      )
    })

    it('should handle single account notification', async () => {
      req.body = {
        accountsToNotify: ['0x123'],
        group_id: 'group-123',
        notifyType: 'invite',
      }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        ['0x123'],
        'group-123',
        'invite'
      )
    })

    it('should handle empty accounts array', async () => {
      req.body = { accountsToNotify: [], group_id: 'group-123', notifyType: 'invite' }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        [],
        'group-123',
        'invite'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing accountsToNotify', async () => {
      req.body = { group_id: 'group-123', notifyType: 'invite' }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        undefined,
        'group-123',
        'invite'
      )
    })

    it('should handle missing group_id', async () => {
      req.body = { accountsToNotify: ['0x123'], notifyType: 'invite' }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        ['0x123'],
        undefined,
        'invite'
      )
    })

    it('should handle missing notifyType', async () => {
      req.body = { accountsToNotify: ['0x123'], group_id: 'group-123' }
      mockNotifyForGroupInviteJoinOrReject.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockNotifyForGroupInviteJoinOrReject).toHaveBeenCalledWith(
        ['0x123'],
        'group-123',
        undefined
      )
    })

    it('should handle network errors', async () => {
      const networkError = new Error('Network timeout')
      mockNotifyForGroupInviteJoinOrReject.mockRejectedValue(networkError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(networkError)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection lost')
      mockNotifyForGroupInviteJoinOrReject.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(dbError)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockNotifyForGroupInviteJoinOrReject).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
