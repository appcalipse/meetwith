/**
 * Unit tests for /api/secure/stripe/status endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getActivePaymentAccountDB: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/secure/stripe/status'
import * as database from '@/utils/database'
import * as Sentry from '@sentry/nextjs'
import { PaymentProvider, PaymentAccountStatus } from '@/types/PaymentAccount'

describe('/api/secure/stripe/status', () => {
  const mockGetActivePaymentAccountDB = database.getActivePaymentAccountDB as jest.Mock

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
      session: {
        account: {
          address: '0x1234567890abcdef',
        },
      } as any,
    }

    res = {
      status: statusMock,
    }
  })

  describe('GET /api/secure/stripe/status', () => {
    it('should return payment account status', async () => {
      const mockPaymentAccount = {
        id: 'payment-1',
        account_address: '0x1234567890abcdef',
        provider: PaymentProvider.STRIPE,
        status: PaymentAccountStatus.CONNECTED,
      }

      mockGetActivePaymentAccountDB.mockResolvedValue(mockPaymentAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetActivePaymentAccountDB).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        PaymentProvider.STRIPE
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(PaymentAccountStatus.CONNECTED)
    })

    it('should return null when no payment account exists', async () => {
      mockGetActivePaymentAccountDB.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(undefined)
    })

    it('should handle pending status', async () => {
      const mockPaymentAccount = {
        id: 'payment-1',
        status: PaymentAccountStatus.PENDING,
      }

      mockGetActivePaymentAccountDB.mockResolvedValue(mockPaymentAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(PaymentAccountStatus.PENDING)
    })

    it('should handle disconnected status', async () => {
      const mockPaymentAccount = {
        id: 'payment-1',
        status: PaymentAccountStatus.DISCONNECTED,
      }

      mockGetActivePaymentAccountDB.mockResolvedValue(mockPaymentAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(PaymentAccountStatus.DISCONNECTED)
    })

    it('should handle database errors', async () => {
      const dbError = new Error('Database error')
      mockGetActivePaymentAccountDB.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('An unexpected error occurred.')
    })

    it('should handle missing account in session', async () => {
      req.session = { account: undefined } as any

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow()
    })
  })

  describe('Non-GET methods', () => {
    it('should return 404 for POST', async () => {
      req.method = 'POST'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE', async () => {
      req.method = 'DELETE'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PATCH', async () => {
      req.method = 'PATCH'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should return 404 for PUT', async () => {
      req.method = 'PUT'
      await handler(req as NextApiRequest, res as NextApiResponse)
      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
