/**
 * Unit tests for /api/accounts/existing endpoint
 */

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/accounts/existing'
import * as database from '@/utils/database'

// Mock the database module
jest.mock('@/utils/database', () => ({
  getExistingAccountsFromDB: jest.fn(),
}))

describe('/api/accounts/existing', () => {
  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let jsonMock: jest.Mock
  let sendMock: jest.Mock

  beforeEach(() => {
    statusMock = jest.fn().mockReturnThis()
    jsonMock = jest.fn().mockReturnThis()
    sendMock = jest.fn().mockReturnThis()

    req = {
      method: 'POST',
      body: {},
    }

    res = {
      status: statusMock,
      json: jsonMock,
      send: sendMock,
    }

    jest.clearAllMocks()
  })

  describe('POST /api/accounts/existing', () => {
    it('should return accounts when valid addresses are provided', async () => {
      const mockAddresses = ['0x123', '0x456']
      const mockAccounts = [
        { address: '0x123', internal_pub_key: 'key1' },
        { address: '0x456', internal_pub_key: 'key2' },
      ]

      req.body = {
        addresses: mockAddresses,
        fullInformation: false,
      }

      ;(database.getExistingAccountsFromDB as jest.Mock).mockResolvedValue(
        mockAccounts
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(database.getExistingAccountsFromDB).toHaveBeenCalledWith(
        mockAddresses,
        false
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockAccounts)
    })

    it('should return full account information when fullInformation is true', async () => {
      const mockAddresses = ['0x123']
      const mockFullAccount = [
        {
          address: '0x123',
          internal_pub_key: 'key1',
          preferences: {},
          nonce: 123,
        },
      ]

      req.body = {
        addresses: mockAddresses,
        fullInformation: true,
      }

      ;(database.getExistingAccountsFromDB as jest.Mock).mockResolvedValue(
        mockFullAccount
      )

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(database.getExistingAccountsFromDB).toHaveBeenCalledWith(
        mockAddresses,
        true
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(mockFullAccount)
    })

    it('should return empty array when no accounts found', async () => {
      req.body = {
        addresses: ['0xnonexistent'],
        fullInformation: false,
      }

      ;(database.getExistingAccountsFromDB as jest.Mock).mockResolvedValue([])

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith([])
    })

    it('should handle database errors', async () => {
      req.body = {
        addresses: ['0x123'],
        fullInformation: false,
      }

      ;(database.getExistingAccountsFromDB as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      await expect(
        handler(req as NextApiRequest, res as NextApiResponse)
      ).rejects.toThrow('Database error')
    })
  })

  describe('Non-POST requests', () => {
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
  })
})
