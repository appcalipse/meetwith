/**
 * Unit tests for /api/transactions/invoice endpoint
 * Testing invoice email generation and sending
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getMeetingTypeFromDB: jest.fn(),
}))

jest.mock('@/utils/email_helper', () => ({
  sendInvoiceEmail: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/transactions/invoice'
import * as database from '@/utils/database'
import * as emailHelper from '@/utils/email_helper'

describe('/api/transactions/invoice', () => {
  const mockGetMeetingTypeFromDB = database.getMeetingTypeFromDB as jest.Mock
  const mockSendInvoiceEmail = emailHelper.sendInvoiceEmail as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockInvoiceRequest = {
    meeting_type_id: 'meeting-type-123',
    guest_email: 'guest@example.com',
    guest_name: 'Guest User',
    payment_method: 'credit_card',
    url: 'https://example.com/meeting',
  }

  const mockMeetingType = {
    id: 'meeting-type-123',
    title: 'Consultation',
    plan: {
      price_per_slot: 100,
      no_of_slot: 2,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: { ...mockInvoiceRequest },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/transactions/invoice', () => {
    it('should send invoice email successfully', async () => {
      mockGetMeetingTypeFromDB.mockResolvedValue(mockMeetingType)
      mockSendInvoiceEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetMeetingTypeFromDB).toHaveBeenCalledWith('meeting-type-123')
      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        'guest@example.com',
        'Guest User',
        {
          email_address: 'guest@example.com',
          full_name: 'Guest User',
          number_of_sessions: '2',
          payment_method: 'credit_card',
          plan: 'Consultation',
          price: '200',
          url: 'https://example.com/meeting',
        }
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({ success: true })
    })

    it('should return 404 when meeting type not found', async () => {
      mockGetMeetingTypeFromDB.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Meeting type not found' })
      expect(mockSendInvoiceEmail).not.toHaveBeenCalled()
    })

    it('should return 500 on email sending error', async () => {
      mockGetMeetingTypeFromDB.mockResolvedValue(mockMeetingType)
      mockSendInvoiceEmail.mockRejectedValue(new Error('Email service error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error sending transaction invoice' })
    })

    it('should calculate total amount correctly', async () => {
      const meetingType = {
        ...mockMeetingType,
        plan: { price_per_slot: 50, no_of_slot: 3 },
      }
      mockGetMeetingTypeFromDB.mockResolvedValue(meetingType)
      mockSendInvoiceEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          price: '150',
          number_of_sessions: '3',
        })
      )
    })

    it('should handle single slot meeting', async () => {
      const singleSlotMeeting = {
        ...mockMeetingType,
        plan: { price_per_slot: 100, no_of_slot: 1 },
      }
      mockGetMeetingTypeFromDB.mockResolvedValue(singleSlotMeeting)
      mockSendInvoiceEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          price: '100',
          number_of_sessions: '1',
        })
      )
    })

    it('should handle null plan price', async () => {
      const freeMeeting = {
        ...mockMeetingType,
        plan: { price_per_slot: null, no_of_slot: 1 },
      }
      mockGetMeetingTypeFromDB.mockResolvedValue(freeMeeting)
      mockSendInvoiceEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          price: '0',
        })
      )
    })

    it('should handle null plan slots', async () => {
      const noSlotMeeting = {
        ...mockMeetingType,
        plan: { price_per_slot: 100, no_of_slot: null },
      }
      mockGetMeetingTypeFromDB.mockResolvedValue(noSlotMeeting)
      mockSendInvoiceEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          number_of_sessions: '0',
          price: '0',
        })
      )
    })

    it('should handle different payment methods', async () => {
      const paymentMethods = ['credit_card', 'bank_transfer', 'crypto', 'paypal']

      for (const method of paymentMethods) {
        jest.clearAllMocks()
        req.body = { ...mockInvoiceRequest, payment_method: method }
        mockGetMeetingTypeFromDB.mockResolvedValue(mockMeetingType)
        mockSendInvoiceEmail.mockResolvedValue(undefined)

        await handler(req as NextApiRequest, res as NextApiResponse)

        expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.objectContaining({ payment_method: method })
        )
      }
    })

    it('should handle missing guest email', async () => {
      req.body = { ...mockInvoiceRequest, guest_email: undefined }
      mockGetMeetingTypeFromDB.mockResolvedValue(mockMeetingType)
      mockSendInvoiceEmail.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockSendInvoiceEmail).toHaveBeenCalledWith(
        undefined,
        expect.any(String),
        expect.any(Object)
      )
    })

    it('should handle database errors', async () => {
      mockGetMeetingTypeFromDB.mockRejectedValue(new Error('Database error'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Error sending transaction invoice' })
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
      expect(mockGetMeetingTypeFromDB).not.toHaveBeenCalled()
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
