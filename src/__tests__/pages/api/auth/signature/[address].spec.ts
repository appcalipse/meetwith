/**
 * Unit tests for /api/auth/signature/[address] endpoint
 * Testing GET requests, signature generation, and nonce handling
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock database
jest.mock('@/utils/database', () => ({
  getAccountFromDB: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/auth/signature/[address]'
import * as database from '@/utils/database'

describe('/api/auth/signature/[address]', () => {
  const mockGetAccountFromDB = database.getAccountFromDB as jest.Mock

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
      query: { address: '0x1234567890abcdef' },
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
    it('should return 404 for POST requests', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
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

  describe('Successful Signature Generation', () => {
    it('should return signature message and nonce for existing account', async () => {
      const mockAccount = {
        address: '0x1234567890abcdef',
        nonce: 12345678,
        name: 'Test User',
      }
      
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        message: expect.stringContaining('12345678'),
        nonce: 12345678,
      })
    })

    it('should generate random nonce for non-existent account', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith({
        message: expect.any(String),
        nonce: expect.any(Number),
      })
      
      const sentData = sendMock.mock.calls[0][0]
      expect(sentData.nonce).toBeGreaterThan(0)
      expect(sentData.message).toContain(sentData.nonce.toString())
    })

    it('should convert address to lowercase before lookup', async () => {
      req.query = { address: '0xABCDEF1234567890' }
      
      const mockAccount = {
        address: '0xabcdef1234567890',
        nonce: 99999999,
      }
      
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0xabcdef1234567890')
    })

    it('should handle addresses with different casing', async () => {
      req.query = { address: '0xAbCdEf' }
      
      mockGetAccountFromDB.mockRejectedValue(new Error('Not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('0xabcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty address parameter', async () => {
      req.query = { address: '' }
      
      mockGetAccountFromDB.mockRejectedValue(new Error('Invalid address'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDB).toHaveBeenCalledWith('')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing address parameter', async () => {
      req.query = {}
      
      mockGetAccountFromDB.mockRejectedValue(new Error('Invalid address'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should generate different nonces for multiple failed lookups', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)
      const firstNonce = sendMock.mock.calls[0][0].nonce

      jest.clearAllMocks()
      sendMock = jest.fn()
      statusMock = jest.fn(() => ({ json: jsonMock, send: sendMock }))
      res.status = statusMock

      await handler(req as NextApiRequest, res as NextApiResponse)
      const secondNonce = sendMock.mock.calls[0][0].nonce

      // Nonces should be different (statistically extremely likely)
      expect(firstNonce).not.toBe(secondNonce)
    })

    it('should handle account with nonce of 0', async () => {
      const mockAccount = {
        address: '0x1234567890abcdef',
        nonce: 0,
      }
      
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        message: expect.stringContaining('0'),
        nonce: 0,
      })
    })

    it('should handle very large nonce values', async () => {
      const mockAccount = {
        address: '0x1234567890abcdef',
        nonce: 999999999,
      }
      
      mockGetAccountFromDB.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        message: expect.stringContaining('999999999'),
        nonce: 999999999,
      })
    })
  })

  describe('Error Handling', () => {
    it('should gracefully handle database connection errors', async () => {
      mockGetAccountFromDB.mockRejectedValue(new Error('Database connection failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalled()
    })

    it('should handle null account response', async () => {
      mockGetAccountFromDB.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      // Should fail when trying to access nonce property
      expect(statusMock).toHaveBeenCalled()
    })

    it('should handle undefined method', async () => {
      req.method = undefined

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })
})
