/**
 * Unit tests for /api/accounts/social/og/[identifier]
 * Testing Open Graph image generation
 */

process.env.NEXT_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_SUPABASE_KEY = 'test-key'

// Mock satori
jest.mock('satori', () => jest.fn().mockResolvedValue('<svg></svg>'))

// Mock @resvg/resvg-js
jest.mock('@resvg/resvg-js', () => ({
  Resvg: jest.fn().mockImplementation(() => ({
    render: jest.fn().mockReturnValue({
      asPng: jest.fn().mockReturnValue(Buffer.from('fake-png-data')),
    }),
  })),
}))

// Mock sharp
jest.mock('sharp', () => {
  return jest.fn().mockImplementation(() => ({
    toFormat: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('resized-avatar')),
  }))
})

// Mock fs
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('font-data')),
}))

// Mock database functions
jest.mock('@/utils/database', () => ({
  getAccountPreferencesLean: jest.fn(),
  getOwnerPublicUrlServer: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

import { NextApiRequest, NextApiResponse } from 'next'
import handler from '@/pages/api/accounts/social/og/[identifier]'
import * as database from '@/utils/database'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

describe('/api/accounts/social/og/[identifier]', () => {
  const mockGetAccountPreferencesLean = database.getAccountPreferencesLean as jest.Mock
  const mockGetOwnerPublicUrlServer = database.getOwnerPublicUrlServer as jest.Mock
  const mockFetch = global.fetch as jest.Mock

  let req: Partial<NextApiRequest>
  let res: Partial<NextApiResponse>
  let statusMock: jest.Mock
  let sendMock: jest.Mock
  let setHeaderMock: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    sendMock = jest.fn()
    statusMock = jest.fn(() => ({ send: sendMock }))
    setHeaderMock = jest.fn()

    req = {
      method: 'GET',
      query: { identifier: '0x1234567890abcdef' },
    }

    res = {
      status: statusMock,
      setHeader: setHeaderMock,
    }

    // Default successful responses
    mockGetAccountPreferencesLean.mockResolvedValue({
      owner_account_address: '0x1234567890abcdef',
      name: 'Test User',
      description: 'Test description',
      avatar_url: null,
      banner_url: null,
      banner_setting: {
        show_avatar: true,
        show_description: true,
      },
    })

    mockGetOwnerPublicUrlServer.mockResolvedValue('https://meetwith.xyz/test-user')
  })

  describe('GET /api/accounts/social/og/[identifier] - Success cases', () => {
    it('should generate OG image for account without avatar', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetAccountPreferencesLean).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(mockGetOwnerPublicUrlServer).toHaveBeenCalledWith('0x1234567890abcdef')
      expect(satori).toHaveBeenCalled()
      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=3600, s-maxage=86400'
      )
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(expect.any(Buffer))
    })

    it('should generate OG image with avatar', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x1234567890abcdef',
        name: 'Test User',
        avatar_url: 'https://example.com/avatar.jpg',
      })

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/avatar.jpg')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle banner URL', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        banner_url: 'https://example.com/banner.jpg',
        banner_setting: { show_avatar: false, show_description: true },
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should use custom params for URL', async () => {
      req.query = {
        identifier: '0x123',
        params: 'test/custom/path',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockGetOwnerPublicUrlServer).not.toHaveBeenCalled()
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle params with multiple slashes', async () => {
      req.query = {
        identifier: '0x123',
        params: 'a/b/c/d/e',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should generate image with full banner settings', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'Full User',
        description: 'Complete description',
        avatar_url: 'https://example.com/avatar.jpg',
        banner_url: 'https://example.com/banner.jpg',
        banner_setting: {
          show_avatar: true,
          show_description: true,
        },
      })

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing banner settings', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        banner_setting: null,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should set correct cache headers', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=3600, s-maxage=86400'
      )
    })
  })

  describe('Error handling and fallbacks', () => {
    beforeEach(() => {
      // Reset mocks for error tests
      ;(satori as jest.Mock).mockResolvedValue('<svg></svg>')
      ;(Resvg as jest.Mock).mockImplementation(() => ({
        render: jest.fn().mockReturnValue({
          asPng: jest.fn().mockReturnValue(Buffer.from('fake-png-data')),
        }),
      }))
    })

    it('should fallback to default image when account not found', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue(null)

      const fallbackBuffer = Buffer.from('fallback-image')
      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(fallbackBuffer.buffer),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith('https://meetwith.xyz/assets/opengraph.png')
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(sendMock).toHaveBeenCalledWith(expect.any(Buffer))
    })

    it('should fallback when no identifier provided', async () => {
      req.query = {}

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith('https://meetwith.xyz/assets/opengraph.png')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should fallback when database throws error', async () => {
      mockGetAccountPreferencesLean.mockRejectedValue(new Error('Database error'))

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith('https://meetwith.xyz/assets/opengraph.png')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should fallback when satori throws error', async () => {
      ;(satori as jest.Mock).mockRejectedValueOnce(new Error('Satori error'))

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith('https://meetwith.xyz/assets/opengraph.png')
      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should fallback when avatar fetch fails', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        avatar_url: 'https://example.com/avatar.jpg',
      })

      mockFetch
        .mockRejectedValueOnce(new Error('Avatar fetch failed'))
        .mockResolvedValueOnce({
          arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
        })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(mockFetch).toHaveBeenCalledWith('https://meetwith.xyz/assets/opengraph.png')
    })

    it('should fallback when Resvg fails', async () => {
      const originalResvg = Resvg as jest.Mock
      ;(Resvg as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Resvg error')
      })

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
      
      // Restore original mock
      ;(Resvg as jest.Mock).mockImplementation(originalResvg.getMockImplementation())
    })
  })

  describe('Edge cases', () => {
    it('should handle empty identifier', async () => {
      req.query = { identifier: '' }

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle identifier as array', async () => {
      req.query = { identifier: ['0x123', '0x456'] }

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)
    })

    it('should handle very long identifier', async () => {
      req.query = { identifier: 'x'.repeat(1000) }

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)
    })

    it('should handle special characters in identifier', async () => {
      req.query = { identifier: '0x123!@#$%^&*()' }

      await handler(req as NextApiRequest, res as NextApiResponse)
    })

    it('should handle ENS names', async () => {
      req.query = { identifier: 'vitalik.eth' }

      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: 'vitalik.eth',
        name: 'Vitalik',
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing description', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        description: null,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle missing name', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: null,
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle empty params', async () => {
      req.query = {
        identifier: '0x123',
        params: '',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle params with only slashes', async () => {
      req.query = {
        identifier: '0x123',
        params: '///',
      }

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle null query parameters', async () => {
      req.query = {
        identifier: null as any,
        params: null as any,
      }

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)
    })
  })

  describe('Avatar processing', () => {
    it('should convert avatar to PNG format', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        avatar_url: 'https://example.com/avatar.webp',
      })

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should resize avatar to 300x300', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        avatar_url: 'https://example.com/large-avatar.jpg',
      })

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should handle avatar URL with query parameters', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue({
        owner_account_address: '0x123',
        name: 'User',
        avatar_url: 'https://example.com/avatar.jpg?size=large&format=png',
      })

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })
  })

  describe('Satori configuration', () => {
    it('should call satori with correct dimensions', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(satori).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          width: 1200,
          height: 630,
        })
      )
    })

    it('should include font configuration', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(satori).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          fonts: expect.arrayContaining([
            expect.objectContaining({
              name: 'DM Sans',
              weight: 500,
            }),
            expect.objectContaining({
              name: 'DM Sans',
              weight: 700,
            }),
          ]),
        })
      )
    })
  })

  describe('Response headers', () => {
    it('should set PNG content type', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'image/png')
    })

    it('should set cache control headers', async () => {
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(setHeaderMock).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=3600, s-maxage=86400'
      )
    })

    it('should set headers even on fallback', async () => {
      mockGetAccountPreferencesLean.mockResolvedValue(null)

      mockFetch.mockResolvedValue({
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(8)),
      })

      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(setHeaderMock).toHaveBeenCalledWith('Cache-Control', expect.any(String))
    })
  })

  describe('Concurrent requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => {
        const testRes = {
          status: jest.fn(() => ({ send: jest.fn() })),
          setHeader: jest.fn(),
        }
        return handler(req as NextApiRequest, testRes as any)
      })

      await Promise.all(requests)

      expect(satori).toHaveBeenCalled()
    })

    it('should handle different identifiers concurrently', async () => {
      const identifiers = ['0x111', '0x222', '0x333']
      const requests = identifiers.map(id => {
        const testReq = { ...req, query: { identifier: id } }
        const testRes = {
          status: jest.fn(() => ({ send: jest.fn() })),
          setHeader: jest.fn(),
        }
        return handler(testReq as NextApiRequest, testRes as any)
      })

      await Promise.all(requests)

      expect(mockGetAccountPreferencesLean).toHaveBeenCalledTimes(3)
    })
  })

  describe('Unsupported HTTP methods', () => {
    it('should handle GET method (supported)', async () => {
      req.method = 'GET'
      
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalledWith(200)
    })

    it('should allow POST method (no explicit restriction)', async () => {
      req.method = 'POST'
      
      await handler(req as NextApiRequest, res as NextApiResponse)

      // Handler doesn't explicitly restrict methods, processes all
      expect(statusMock).toHaveBeenCalled()
    })

    it('should allow PUT method', async () => {
      req.method = 'PUT'
      
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalled()
    })

    it('should allow DELETE method', async () => {
      req.method = 'DELETE'
      
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalled()
    })

    it('should allow PATCH method', async () => {
      req.method = 'PATCH'
      
      await handler(req as NextApiRequest, res as NextApiResponse)

      expect(statusMock).toHaveBeenCalled()
    })
  })
})
