/**
 * Unit tests for /api/server/accounts/check endpoint
 * Testing POST requests for account signature verification
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/cryptography', () => ({
  checkSignature: jest.fn(),
}))

jest.mock('@/utils/database', () => ({
  getAccountNonce: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/server/accounts/check'
import * as cryptography from '@/utils/cryptography'
import * as database from '@/utils/database'
import { AccountNotFoundError } from '@/utils/errors'

describe('/api/server/accounts/check', () => {
  const mockCheckSignature = cryptography.checkSignature as jest.Mock
  const mockGetAccountNonce = database.getAccountNonce as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  const mockAddress = '0x1234567890abcdef'
  const mockSignature = '0xsignature123'
  const mockNonce = 'test-nonce-123'

  beforeEach(() => {
    jest.clearAllMocks()

    jsonMock = jest.fn()
    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))

    req = {
      method: 'POST',
      body: {
        address: mockAddress,
        signature: mockSignature,
      },
    }

    res = {
      status: statusMock,
    }
  })

  describe('POST /api/server/accounts/check', () => {
    it('should return "Authorized" for valid signature', async () => {
      mockGetAccountNonce.mockResolvedValue(mockNonce)
      mockCheckSignature.mockReturnValue(mockAddress)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountNonce).toHaveBeenCalledWith(mockAddress)
      expect(mockCheckSignature).toHaveBeenCalledWith(mockSignature, mockNonce)
      expect(sendMock).toHaveBeenCalledWith('Authorized')
    })

    it('should return 401 when signature does not match address', async () => {
      mockGetAccountNonce.mockResolvedValue(mockNonce)
      mockCheckSignature.mockReturnValue('0xdifferentaddress')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Unauthorized: Signature does not match address',
      })
    })

    it('should return 404 when account not found', async () => {
      mockGetAccountNonce.mockRejectedValue(new AccountNotFoundError('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Account not found' })
    })

    it('should return 500 on internal server error', async () => {
      mockGetAccountNonce.mockRejectedValue(new Error('Database error'))
      console.error = jest.fn()

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(500)
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Internal server error' })
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle case-insensitive address matching', async () => {
      const upperAddress = mockAddress.toUpperCase()
      req.body = { address: upperAddress, signature: mockSignature }
      mockGetAccountNonce.mockResolvedValue(mockNonce)
      mockCheckSignature.mockReturnValue(mockAddress.toLowerCase())

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(sendMock).toHaveBeenCalledWith('Authorized')
    })

    it('should handle missing address in request body', async () => {
      req.body = { signature: mockSignature }
      mockGetAccountNonce.mockRejectedValue(new AccountNotFoundError('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle missing signature in request body', async () => {
      req.body = { address: mockAddress }
      mockGetAccountNonce.mockResolvedValue(mockNonce)
      mockCheckSignature.mockReturnValue('0xdifferent')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should handle empty request body', async () => {
      req.body = {}
      mockGetAccountNonce.mockRejectedValue(new AccountNotFoundError('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle invalid signature format', async () => {
      req.body = { address: mockAddress, signature: 'invalid' }
      mockGetAccountNonce.mockResolvedValue(mockNonce)
      mockCheckSignature.mockReturnValue('0xdifferent')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should handle null nonce', async () => {
      mockGetAccountNonce.mockResolvedValue(null)
      mockCheckSignature.mockReturnValue(mockAddress)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(sendMock).toHaveBeenCalledWith('Authorized')
    })
  })

  describe('Invalid HTTP methods', () => {
    it('should return 405 for GET requests', async () => {
      req.method = 'GET'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
      expect(mockGetAccountNonce).not.toHaveBeenCalled()
    })

    it('should return 405 for PUT requests', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
    })

    it('should return 405 for DELETE requests', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
    })

    it('should return 405 for PATCH requests', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(405)
      expect(sendMock).toHaveBeenCalledWith('Method not allowed')
    })
  })
})
