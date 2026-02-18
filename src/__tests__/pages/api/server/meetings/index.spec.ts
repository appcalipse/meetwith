/**
 * Unit tests for /api/server/meetings/index endpoint
 * Testing meeting scheduling operations
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/pages/api/secure/meetings', () => ({
  handleMeetingSchedule: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/meetings/index'
import * as secureMeetings from '@/pages/api/secure/meetings'

describe('/api/server/meetings/index', () => {
  const mockHandleMeetingSchedule = secureMeetings.handleMeetingSchedule as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>

  const mockMeeting = {
    scheduler_address: '0x1234567890abcdef',
    meeting_type_id: 'type-123',
    start: new Date('2024-02-01T10:00:00Z'),
    end: new Date('2024-02-01T11:00:00Z'),
    participants_mapping: [
      { account_address: '0x1234567890abcdef', name: 'Test User' },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      method: 'POST',
      body: mockMeeting,
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    }
  })

  describe('POST /api/server/meetings/index', () => {
    it('should delegate to handleMeetingSchedule', async () => {
      mockHandleMeetingSchedule.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleMeetingSchedule).toHaveBeenCalledWith(
        mockMeeting.scheduler_address,
        mockMeeting,
        req,
        res
      )
    })

    it('should pass scheduler_address from request body', async () => {
      const customAddress = '0xabcdef'
      req.body = { ...mockMeeting, scheduler_address: customAddress }
      mockHandleMeetingSchedule.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleMeetingSchedule).toHaveBeenCalledWith(
        customAddress,
        expect.objectContaining({ scheduler_address: customAddress }),
        req,
        res
      )
    })

    it('should handle missing scheduler_address', async () => {
      req.body = { ...mockMeeting, scheduler_address: undefined }
      mockHandleMeetingSchedule.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleMeetingSchedule).toHaveBeenCalledWith(
        undefined,
        expect.any(Object),
        req,
        res
      )
    })

    it('should handle complete meeting request', async () => {
      const completeMeeting = {
        ...mockMeeting,
        title: 'Test Meeting',
        description: 'Test description',
        emailToSendReminders: 'test@example.com',
      }
      req.body = completeMeeting
      mockHandleMeetingSchedule.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleMeetingSchedule).toHaveBeenCalledWith(
        completeMeeting.scheduler_address,
        completeMeeting,
        req,
        res
      )
    })

    it('should handle empty request body', async () => {
      req.body = {}
      mockHandleMeetingSchedule.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleMeetingSchedule).toHaveBeenCalled()
    })

    it('should handle null request body', async () => {
      req.body = null
      mockHandleMeetingSchedule.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockHandleMeetingSchedule).toHaveBeenCalled()
    })
  })
})
