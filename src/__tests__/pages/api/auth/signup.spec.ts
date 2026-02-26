/**
 * Unit tests for /api/auth/signup endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  initAccountDBForWallet: jest.fn(),
  createVerification: jest.fn(),
}))

jest.mock('@/utils/cryptography', () => ({
  checkSignature: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

jest.mock('luxon', () => ({
  DateTime: {
    now: jest.fn(() => ({
      plus: jest.fn(() => ({
        toJSDate: jest.fn(() => new Date('2024-01-30')),
      })),
    })),
  },
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/auth/signup'
import * as database from '@/utils/database'
import * as crypto from '@/utils/cryptography'
import * as Sentry from '@sentry/nextjs'
import { MeetingProvider } from '@/types/Meeting'
import { VerificationChannel } from '@/types/AccountNotifications'

describe('/api/auth/signup', () => {
  const mockInitAccountDBForWallet = database.initAccountDBForWallet as jest.Mock
  const mockCreateVerification = database.createVerification as jest.Mock
  const mockCheckSignature = crypto.checkSignature as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockAccount = {
    address: '0x1234567890abcdef',
    nonce: 12345,
    internal_pub_key: 'pubkey123',
    preferences: {
      name: 'Test User',
      timezone: 'America/New_York',
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        address: '0x1234567890abcdef',
        signature: 'valid-signature',
        timezone: 'America/New_York',
        nonce: 12345,
      },
      session: {
        account: undefined,
        save: jest.fn().mockResolvedValue(undefined),
      } as any,
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/auth/signup', () => {
    it('should signup successfully with valid data', async () => {
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)
      mockCreateVerification.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCheckSignature).toHaveBeenCalledWith('valid-signature', 12345)
      expect(mockInitAccountDBForWallet).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'valid-signature',
        'America/New_York',
        12345
      )
      expect(req.session!.account).toEqual({
        ...mockAccount,
        signature: 'valid-signature',
        preferences: {
          availabilities: [],
          meetingProviders: [MeetingProvider.GOOGLE_MEET],
          timezone: '',
        },
      })
      expect(req.session!.save).toHaveBeenCalled()
      expect(mockCreateVerification).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        expect.stringMatching(/^0x1234567890abcdef-\d+-[a-z0-9]+$/),
        VerificationChannel.RESET_EMAIL,
        new Date('2024-01-30')
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        ...mockAccount,
        jti: expect.any(String),
      })
    })

    it('should return 401 when signature does not match address', async () => {
      mockCheckSignature.mockReturnValue('0xdifferentaddress')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(sendMock).toHaveBeenCalledWith('Not authorized')
      expect(mockInitAccountDBForWallet).not.toHaveBeenCalled()
    })

    it('should handle case-insensitive address matching', async () => {
      req.body.address = '0xABCDEF123456'
      mockCheckSignature.mockReturnValue('0xabcdef123456')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 500 on database error', async () => {
      const dbError = new Error('Database connection failed')
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(500)
      expect(sendMock).toHaveBeenCalledWith('Internal server error')
    })

    it('should handle verification creation errors', async () => {
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)
      mockCreateVerification.mockRejectedValue(new Error('Verification failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should generate unique jti for each signup', async () => {
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)
      mockCreateVerification.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      const firstJti = jsonMock.mock.calls[0][0].jti

      jest.clearAllMocks()
      jsonMock = jest.fn()
      statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))
      res.status = statusMock

      await handler(req as NextApiRequest, res as NextApiResponse)

      const secondJti = jsonMock.mock.calls[0][0].jti

      expect(firstJti).not.toEqual(secondJti)
    })

    it('should handle missing signature', async () => {
      req.body.signature = undefined
      mockCheckSignature.mockImplementation(() => {
        throw new Error('Invalid signature')
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle missing address', async () => {
      req.body.address = undefined
      mockCheckSignature.mockReturnValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
    })

    it('should handle missing timezone', async () => {
      req.body.timezone = undefined
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)
      mockCreateVerification.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockInitAccountDBForWallet).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'valid-signature',
        undefined,
        12345
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing nonce', async () => {
      req.body.nonce = undefined
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)
      mockCreateVerification.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle session save errors', async () => {
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockInitAccountDBForWallet.mockResolvedValue(mockAccount)
      req.session!.save = jest.fn().mockRejectedValue(new Error('Session save failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(500)
    })
  })

  describe('Non-POST methods', () => {
    it('should return 404 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
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
