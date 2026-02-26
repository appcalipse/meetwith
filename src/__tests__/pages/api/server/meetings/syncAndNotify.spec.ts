/**
 * Unit tests for /api/server/meetings/syncAndNotify endpoint
 * Testing meeting synchronization and notification operations
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('@/utils/notification_helper', () => ({
  notifyForMeetingCancellation: jest.fn(),
  notifyForOrUpdateNewMeeting: jest.fn(),
}))

jest.mock('@/utils/sync_helper', () => ({
  ExternalCalendarSync: {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

import * as Sentry from '@sentry/nextjs'
import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/meetings/syncAndNotify'
import { MeetingChangeType } from '@/types/Meeting'
import * as notificationHelper from '@/utils/notification_helper'
import * as syncHelper from '@/utils/sync_helper'

describe('/api/server/meetings/syncAndNotify', () => {
  const mockNotifyForOrUpdateNewMeeting = notificationHelper.notifyForOrUpdateNewMeeting as jest.Mock
  const mockNotifyForMeetingCancellation = notificationHelper.notifyForMeetingCancellation as jest.Mock
  const mockExternalCalendarSync = syncHelper.ExternalCalendarSync as jest.Mocked<
    typeof syncHelper.ExternalCalendarSync
  >
  const mockCaptureException = Sentry.captureException as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let sendMock: jest.Mock

  const mockMeetingRequest = {
    meeting_id: 'meeting-123',
    title: 'Test Meeting',
    start: '2024-02-01T10:00:00Z',
    end: '2024-02-01T11:00:00Z',
    created_at: '2024-01-01T00:00:00Z',
    participants: ['0x123', '0x456'],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))

    req = {
      method: 'POST',
      body: { ...mockMeetingRequest },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/meetings/syncAndNotify - Create Meeting', () => {
    it('should create calendar event and send notifications', async () => {
      mockExternalCalendarSync.create.mockResolvedValue(undefined)
      mockNotifyForOrUpdateNewMeeting.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExternalCalendarSync.create).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting_id: 'meeting-123',
          start: expect.any(Date),
          end: expect.any(Date),
        })
      )
      expect(mockNotifyForOrUpdateNewMeeting).toHaveBeenCalledWith(
        MeetingChangeType.CREATE,
        expect.any(Object)
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(true)
    })

    it('should continue on calendar sync error and still notify', async () => {
      const syncError = new Error('Calendar sync failed')
      mockExternalCalendarSync.create.mockRejectedValue(syncError)
      mockNotifyForOrUpdateNewMeeting.mockResolvedValue(undefined)
      console.error = jest.fn()

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(console.error).toHaveBeenCalledWith(syncError)
      expect(mockNotifyForOrUpdateNewMeeting).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should continue on notification error after successful sync', async () => {
      const notifyError = new Error('Notification failed')
      mockExternalCalendarSync.create.mockResolvedValue(undefined)
      mockNotifyForOrUpdateNewMeeting.mockRejectedValue(notifyError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledWith(notifyError)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(true)
    })

    it('should convert date strings to Date objects', async () => {
      mockExternalCalendarSync.create.mockResolvedValue(undefined)
      mockNotifyForOrUpdateNewMeeting.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExternalCalendarSync.create).toHaveBeenCalledWith(
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date),
          created_at: expect.any(Date),
        })
      )
    })
  })

  describe('PATCH /api/server/meetings/syncAndNotify - Update Meeting', () => {
    beforeEach(() => {
      req.method = 'PATCH'
    })

    it('should update calendar event and send notifications', async () => {
      mockExternalCalendarSync.update.mockResolvedValue(undefined)
      mockNotifyForOrUpdateNewMeeting.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExternalCalendarSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          meeting_id: 'meeting-123',
          start: expect.any(Date),
          end: expect.any(Date),
        })
      )
      expect(mockNotifyForOrUpdateNewMeeting).toHaveBeenCalledWith(
        MeetingChangeType.UPDATE,
        expect.any(Object)
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(true)
    })

    it('should handle sync error gracefully', async () => {
      mockExternalCalendarSync.update.mockRejectedValue(new Error('Update failed'))
      mockNotifyForOrUpdateNewMeeting.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalled()
      expect(mockNotifyForOrUpdateNewMeeting).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle notification error', async () => {
      mockExternalCalendarSync.update.mockResolvedValue(undefined)
      mockNotifyForOrUpdateNewMeeting.mockRejectedValue(new Error('Notify failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('DELETE /api/server/meetings/syncAndNotify - Cancel Meeting', () => {
    beforeEach(() => {
      req.method = 'DELETE'
      req.body = {
        addressesToRemove: ['0x123', '0x456'],
        meeting_id: 'meeting-123',
      }
    })

    it('should delete calendar events and send cancellation notifications', async () => {
      mockExternalCalendarSync.delete.mockResolvedValue(undefined)
      mockNotifyForMeetingCancellation.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExternalCalendarSync.delete).toHaveBeenCalledTimes(2)
      expect(mockExternalCalendarSync.delete).toHaveBeenCalledWith('0x123', ['meeting-123'])
      expect(mockExternalCalendarSync.delete).toHaveBeenCalledWith('0x456', ['meeting-123'])
      expect(mockNotifyForMeetingCancellation).toHaveBeenCalledWith(req.body)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(true)
    })

    it('should handle deletion errors for individual addresses', async () => {
      mockExternalCalendarSync.delete
        .mockRejectedValueOnce(new Error('Delete failed for first'))
        .mockResolvedValueOnce(undefined)
      mockNotifyForMeetingCancellation.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalledTimes(1)
      expect(mockExternalCalendarSync.delete).toHaveBeenCalledTimes(2)
      expect(mockNotifyForMeetingCancellation).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle notification error after deletions', async () => {
      mockExternalCalendarSync.delete.mockResolvedValue(undefined)
      mockNotifyForMeetingCancellation.mockRejectedValue(new Error('Notify failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCaptureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle empty addressesToRemove array', async () => {
      req.body = { addressesToRemove: [], meeting_id: 'meeting-123' }
      mockNotifyForMeetingCancellation.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExternalCalendarSync.delete).not.toHaveBeenCalled()
      expect(mockNotifyForMeetingCancellation).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle single address removal', async () => {
      req.body = { addressesToRemove: ['0x123'], meeting_id: 'meeting-123' }
      mockExternalCalendarSync.delete.mockResolvedValue(undefined)
      mockNotifyForMeetingCancellation.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockExternalCalendarSync.delete).toHaveBeenCalledTimes(1)
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockExternalCalendarSync.create).not.toHaveBeenCalled()
    })

    it('should return 404 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for undefined method', async () => {
      req.method = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
