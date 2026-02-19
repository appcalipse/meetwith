/**
 * Unit tests for /api/auth/login endpoint
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getAccountFromDB: jest.fn(),
  initDB: jest.fn(),
}))

jest.mock('@/utils/cryptography', () => ({
  checkSignature: jest.fn(),
  encryptContent: jest.fn(),
}))

jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

jest.mock('eth-crypto', () => ({
  createIdentity: jest.fn(),
}))

jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/auth/login'
import * as database from '@/utils/database'
import * as crypto from '@/utils/cryptography'
import EthCrypto from 'eth-crypto'
import * as Sentry from '@sentry/nextjs'
import { MeetingProvider } from '@/types/Meeting'

describe('/api/auth/login', () => {
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock
  const mockInitDB = database.initDB as jest.Mock
  const mockCheckSignature = crypto.checkSignature as jest.Mock
  const mockEncryptContent = crypto.encryptContent as jest.Mock
  const mockCreateIdentity = EthCrypto.createIdentity as jest.Mock

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
      timezone: 'UTC',
      availabilities: [],
      meetingProviders: [MeetingProvider.GOOGLE_MEET],
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
        identifier: '0x1234567890abcdef',
        signature: 'valid-signature',
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

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef', true)
      expect(mockCheckSignature).toHaveBeenCalledWith('valid-signature', 12345)
      expect(req.session.account).toEqual({
        ...mockAccount,
        signature: 'valid-signature',
        preferences: {
          availabilities: [],
          meetingProviders: [MeetingProvider.GOOGLE_MEET],
          name: 'Test User',
          timezone: '',
        },
      })
      expect(req.session.save).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockAccount)
    })

    it('should return 401 when signature does not match identifier', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockCheckSignature.mockReturnValue('0xdifferentaddress')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(sendMock).toHaveBeenCalledWith('Not authorized')
      expect(req.session.save).not.toHaveBeenCalled()
    })

    it('should create internal keys for migrated account without pub key', async () => {
      const accountWithoutPubKey = { ...mockAccount, internal_pub_key: null }
      const mockIdentity = {
        privateKey: 'private-key',
        publicKey: 'public-key',
      }
      const mockSupabase = {
        from: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockGetAccountFromDB.mockResolvedValue(accountWithoutPubKey)
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      mockCreateIdentity.mockReturnValue(mockIdentity)
      mockEncryptContent.mockReturnValue('encrypted-key')
      mockInitDB.mockReturnValue({ supabase: mockSupabase })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockCreateIdentity).toHaveBeenCalled()
      expect(mockEncryptContent).toHaveBeenCalledWith('valid-signature', 'private-key')
      expect(mockSupabase.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabase.upsert).toHaveBeenCalledWith(
        [
          {
            address: '0x1234567890abcdef',
            encoded_signature: 'encrypted-key',
            internal_pub_key: 'public-key',
            is_invited: false,
            nonce: 12345,
          },
        ],
        { onConflict: 'address' }
      )
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle lowercase identifier properly', async () => {
      req.body = {
        identifier: '0xABCDEF123456',
        signature: 'valid-signature',
      }
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockCheckSignature.mockReturnValue('0xabcdef123456')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should return 404 when account not found', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      mockGetAccountFromDB.mockRejectedValue(dbError)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(Sentry.captureException).toHaveBeenCalledWith(dbError)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should limit session preferences to avoid cookie bloat', async () => {
      const accountWithLargePrefs = {
        ...mockAccount,
        preferences: {
          ...mockAccount.preferences,
          availabilities: new Array(100).fill({ day: 1, start: '09:00', end: '17:00' }),
        },
      }
      mockGetAccountFromDB.mockResolvedValue(accountWithLargePrefs)
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(req.session.account.preferences.availabilities).toEqual([])
      expect(req.session.account.preferences.meetingProviders).toEqual([MeetingProvider.GOOGLE_MEET])
    })

    it('should handle missing signature', async () => {
      req.body = {
        identifier: '0x1234567890abcdef',
        signature: null,
      }
      mockGetAccountFromDB.mockRejectedValue(new Error('Invalid signature'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle missing identifier', async () => {
      req.body = {
        identifier: null,
        signature: 'valid-signature',
      }
      mockGetAccountFromDB.mockRejectedValue(new Error('Invalid identifier'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle session save errors', async () => {
      mockGetAccountFromDB.mockResolvedValue(mockAccount)
      mockCheckSignature.mockReturnValue('0x1234567890abcdef')
      req.session.save = jest.fn().mockRejectedValue(new Error('Session save failed'))

      await expect(handler(req as NextApiRequest, res as NextApiResponse)).rejects.toThrow()
    })
  })

  describe('Non-POST methods', () => {
    it('should not handle GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should not handle PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should not handle DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should not handle PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).not.toHaveBeenCalled()
    })
  })
})
