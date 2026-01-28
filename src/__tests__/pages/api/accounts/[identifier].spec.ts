/**
 * Unit tests for /api/accounts/[identifier] endpoint
 * Testing GET requests and error handling
 */

// Set environment variables
process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock database
jest.mock('@/utils/database', () => ({
  getAccountFromDBPublic: jest.fn(),
}))

// Mock iron session
jest.mock('@/ironAuth/withSessionApiRoute', () => ({
  withSessionRoute: jest.fn((handler) => handler),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/accounts/[identifier]'
import * as database from '@/utils/database'
import * as sessionRoute from '@/ironAuth/withSessionApiRoute'

describe('/api/accounts/[identifier]', () => {
  const mockGetAccountFromDBPublic = database.getAccountFromDBPublic as jest.Mock
  const mockWithSessionRoute = sessionRoute.withSessionRoute as jest.Mock

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
      query: { identifier: '0x1234567890abcdef' },
    }
    
    res = {
      status: statusMock,
    }
  })

  describe('Method Validation', () => {
    it('should return 404 for non-GET requests', async () => {
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

  describe('Successful Account Retrieval', () => {
    it('should return account data for valid identifier', async () => {
      const mockAccount = {
        address: '0x1234567890abcdef',
        name: 'John Doe',
        email: 'john@example.com',
        bio: 'Software Engineer',
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockAccount)
    })

    it('should handle ethereum address identifiers', async () => {
      const ethAddress = '0xABCDEF1234567890'
      req.query = { identifier: ethAddress }
      
      const mockAccount = {
        address: ethAddress,
        name: 'Eth User',
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith(ethAddress)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle custom domain identifiers', async () => {
      const domain = 'johndoe'
      req.query = { identifier: domain }
      
      const mockAccount = {
        address: '0x123',
        name: 'John Doe',
        custom_domain: domain,
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith(domain)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockAccount)
    })

    it('should handle email identifiers', async () => {
      const email = 'user@example.com'
      req.query = { identifier: email }
      
      const mockAccount = {
        address: '0x456',
        name: 'Email User',
        email: email,
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith(email)
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Error Handling', () => {
    it('should return 404 when account not found', async () => {
      mockGetAccountFromDBPublic.mockRejectedValue(new Error('Account not found'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for database errors', async () => {
      mockGetAccountFromDBPublic.mockRejectedValue(new Error('Database connection failed'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should handle null account gracefully', async () => {
      mockGetAccountFromDBPublic.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(null)
    })

    it('should handle unexpected errors', async () => {
      mockGetAccountFromDBPublic.mockRejectedValue('Unexpected error')

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty identifier', async () => {
      req.query = { identifier: '' }
      mockGetAccountFromDBPublic.mockRejectedValue(new Error('Invalid identifier'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith('')
      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle special characters in identifier', async () => {
      const specialId = 'user+special@example.com'
      req.query = { identifier: specialId }
      
      const mockAccount = {
        address: '0x789',
        email: specialId,
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith(specialId)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle very long identifiers', async () => {
      const longId = 'a'.repeat(500)
      req.query = { identifier: longId }
      mockGetAccountFromDBPublic.mockRejectedValue(new Error('Invalid'))

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })

    it('should handle mixed case addresses', async () => {
      const mixedCase = '0xAbCdEf1234567890'
      req.query = { identifier: mixedCase }
      
      const mockAccount = {
        address: mixedCase.toLowerCase(),
        name: 'Mixed Case User',
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith(mixedCase)
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle ENS names', async () => {
      const ensName = 'vitalik.eth'
      req.query = { identifier: ensName }
      
      const mockAccount = {
        address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        name: 'Vitalik',
        ens: ensName,
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(mockAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountFromDBPublic).toHaveBeenCalledWith(ensName)
      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Response Data Validation', () => {
    it('should return complete account object', async () => {
      const completeAccount = {
        address: '0x123',
        name: 'Complete User',
        email: 'complete@example.com',
        bio: 'Test bio',
        avatar: 'https://example.com/avatar.jpg',
        banner: 'https://example.com/banner.jpg',
        timezone: 'America/New_York',
        created_at: new Date().toISOString(),
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(completeAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(completeAccount)
    })

    it('should return partial account object', async () => {
      const partialAccount = {
        address: '0x456',
        name: 'Partial User',
      }
      
      mockGetAccountFromDBPublic.mockResolvedValue(partialAccount)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(partialAccount)
    })
  })

  describe('Session Middleware', () => {
    it('should wrap handler with session route', () => {
      expect(mockWithSessionRoute).toHaveBeenCalled()
    })
  })
})
