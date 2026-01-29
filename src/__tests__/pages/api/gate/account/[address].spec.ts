/**
 * Unit tests for /api/gate/account/[address]
 * Testing gate conditions retrieval for accounts
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

jest.mock('@/utils/database', () => ({
  getGateConditionsForAccount: jest.fn(),
}))

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/gate/account/[address]'
import * as database from '@/utils/database'

describe('/api/gate/account/[address]', () => {
  const mockGetGateConditionsForAccount = database.getGateConditionsForAccount as jest.Mock

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

  describe('GET /api/gate/account/[address]', () => {
    it('should return gate conditions for valid address', async () => {
      const mockGateConditions = {
        conditions: [
          {
            id: 'gate-1',
            type: 'NFT',
            contract: '0xabc123',
            minimum: 1,
          },
          {
            id: 'gate-2',
            type: 'TOKEN',
            contract: '0xdef456',
            minimum: 100,
          },
        ],
        account: '0x1234567890abcdef',
      }

      mockGetGateConditionsForAccount.mockResolvedValue(mockGateConditions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGateConditions)
    })

    it('should return empty conditions array', async () => {
      const mockGateConditions = {
        conditions: [],
        account: '0x1234567890abcdef',
      }

      mockGetGateConditionsForAccount.mockResolvedValue(mockGateConditions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGateConditions)
    })

    it('should handle lowercase address', async () => {
      req.query = { address: '0xabcdef1234567890' }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith('0xabcdef1234567890')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle uppercase address', async () => {
      req.query = { address: '0XABCDEF1234567890' }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith('0XABCDEF1234567890')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle mixed case address', async () => {
      req.query = { address: '0xAbCdEf1234567890' }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle ENS name', async () => {
      req.query = { address: 'vitalik.eth' }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith('vitalik.eth')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle database error gracefully', async () => {
      mockGetGateConditionsForAccount.mockRejectedValue(new Error('Database error'))

      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow('Database error')
    })

    it('should handle null gate conditions', async () => {
      mockGetGateConditionsForAccount.mockResolvedValue(null)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(null)
    })

    it('should handle undefined gate conditions', async () => {
      mockGetGateConditionsForAccount.mockResolvedValue(undefined)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle multiple gate conditions', async () => {
      const mockGateConditions = {
        conditions: Array.from({ length: 10 }, (_, i) => ({
          id: `gate-${i}`,
          type: 'NFT',
        })),
      }

      mockGetGateConditionsForAccount.mockResolvedValue(mockGateConditions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGateConditions)
    })

    it('should handle complex gate condition objects', async () => {
      const mockGateConditions = {
        conditions: [
          {
            id: 'complex-gate',
            type: 'COMPOSITE',
            rules: [
              { type: 'NFT', contract: '0x123' },
              { type: 'TOKEN', contract: '0x456' },
            ],
            operator: 'AND',
          },
        ],
      }

      mockGetGateConditionsForAccount.mockResolvedValue(mockGateConditions)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockGateConditions)
    })
  })

  describe('Unsupported methods', () => {
    it('should return 404 for POST request', async () => {
      req.method = 'POST'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PUT request', async () => {
      req.method = 'PUT'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for DELETE request', async () => {
      req.method = 'DELETE'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for PATCH request', async () => {
      req.method = 'PATCH'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for OPTIONS request', async () => {
      req.method = 'OPTIONS'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
      expect(sendMock).toHaveBeenCalledWith('Not found')
    })

    it('should return 404 for HEAD request', async () => {
      req.method = 'HEAD'

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(404)
    })
  })

  describe('Edge cases and validation', () => {
    it('should handle empty address', async () => {
      req.query = { address: '' }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith('')
    })

    it('should handle missing address parameter', async () => {
      req.query = {}
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith(undefined)
    })

    it('should handle address as array', async () => {
      req.query = { address: ['0x123', '0x456'] }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle very long address', async () => {
      const longAddress = '0x' + 'a'.repeat(100)
      req.query = { address: longAddress }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledWith(longAddress)
    })

    it('should handle special characters in address', async () => {
      req.query = { address: '0x123!@#$%^&*()' }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle null address', async () => {
      req.query = { address: null as any }
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle undefined query', async () => {
      req.query = undefined as any
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      await handler(req as NextApiRequest, res as NextApiResponse)
    })

    it('should handle timeout errors', async () => {
      mockGetGateConditionsForAccount.mockRejectedValue(new Error('Timeout'))

      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow('Timeout')
    })

    it('should handle network errors', async () => {
      mockGetGateConditionsForAccount.mockRejectedValue(new Error('Network error'))

      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow('Network error')
    })
  })

  describe('Response format validation', () => {
    it('should return properly formatted response', async () => {
      const mockResponse = {
        conditions: [{ id: '1', type: 'NFT' }],
        account: '0x123',
      }
      mockGetGateConditionsForAccount.mockResolvedValue(mockResponse)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          conditions: expect.any(Array),
        })
      )
    })

    it('should preserve condition data types', async () => {
      const mockResponse = {
        conditions: [
          {
            id: '1',
            type: 'TOKEN',
            minimum: 100,
            enabled: true,
          },
        ],
      }
      mockGetGateConditionsForAccount.mockResolvedValue(mockResponse)

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(jsonMock).toHaveBeenCalledWith(mockResponse)
    })
  })

  describe('Performance and concurrency', () => {
    it('should handle concurrent requests', async () => {
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      const promises = Array.from({ length: 10 }, () =>
        handler(req as NextApiRequest, res as NextApiResponse)
      )

      await Promise.all(promises)

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledTimes(10)
    })

    it('should handle rapid sequential requests', async () => {
      mockGetGateConditionsForAccount.mockResolvedValue({ conditions: [] })

      for (let i = 0; i < 5; i++) {
        await handler(req as NextApiRequest, res as NextApiResponse)
      }

      expect(mockGetGateConditionsForAccount).toHaveBeenCalledTimes(5)
    })
  })
})
