import {
  getLensHandlesForAddress,
  getLensProfile,
  LensProfile,
} from '@/utils/lens.helper'

// Mock the lens client
jest.mock('@lens-protocol/client', () => {
  const mockFetchAll = jest.fn()
  return {
    LensClient: jest.fn().mockImplementation(() => ({
      profile: {
        fetchAll: mockFetchAll,
      },
    })),
    production: 'production',
    __mockFetchAll: mockFetchAll,
  }
})

// Get the mocked fetchAll function
const getLensMock = () => {
  const { __mockFetchAll } = require('@lens-protocol/client')
  return __mockFetchAll
}

describe('lens.helper', () => {
  const mockAddress = '0x1234567890abcdef1234567890abcdef12345678'

  beforeEach(() => {
    jest.clearAllMocks()
    const mockFetchAll = getLensMock()
    mockFetchAll.mockResolvedValue({ items: [] })
  })

  describe('getLensHandlesForAddress', () => {
    it('should fetch lens profiles for an address', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
            coverPicture: {
              optimized: {
                uri: 'https://example.com/picture.jpg',
              },
            },
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(mockFetchAll).toHaveBeenCalledWith({
        where: { ownedBy: [mockAddress] },
      })
      expect(result).toHaveLength(1)
      expect(result?.[0]).toEqual({
        handle: 'testuser.lens',
        name: 'Test User',
        ownedBy: mockAddress,
        picture: 'https://example.com/picture.jpg',
      })
    })

    it('should return multiple profiles for an address', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'user1',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'User One',
          },
        },
        {
          handle: {
            localName: 'user2',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'User Two',
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result).toHaveLength(2)
      expect(result?.[0].handle).toBe('user1.lens')
      expect(result?.[1].handle).toBe('user2.lens')
    })

    it('should return empty array if no profiles found', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: [] })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result).toEqual([])
    })

    it('should handle profiles without display name', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {},
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result?.[0].name).toBe('')
    })

    it('should handle profiles without picture', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result?.[0].picture).toBeUndefined()
    })

    it('should handle errors gracefully', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockRejectedValue(new Error('API error'))

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const result = await getLensHandlesForAddress(mockAddress)

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBeUndefined()

      consoleErrorSpy.mockRestore()
    })

    it('should handle null metadata', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: null,
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result?.[0].name).toBe('')
    })

    it('should handle null handle ownedBy', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: null,
          },
          metadata: {
            displayName: 'Test User',
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result?.[0].ownedBy).toBe('')
    })
  })

  describe('getLensProfile', () => {
    const mockHandle = 'testuser.lens'

    it('should fetch lens profile by handle', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
            coverPicture: {
              optimized: {
                uri: 'https://example.com/picture.jpg',
              },
            },
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile(mockHandle)

      expect(mockFetchAll).toHaveBeenCalledWith({
        where: { handles: [mockHandle] },
      })
      expect(result).toEqual({
        handle: 'testuser.lens',
        name: 'Test User',
        ownedBy: mockAddress,
        picture: 'https://example.com/picture.jpg',
      })
    })

    it('should return undefined if no profile found', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: [] })

      const result = await getLensProfile(mockHandle)

      expect(result).toBeUndefined()
    })

    it('should return first profile if multiple found', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'First User',
          },
        },
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: '0xother',
          },
          metadata: {
            displayName: 'Second User',
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile(mockHandle)

      expect(result?.name).toBe('First User')
    })

    it('should handle errors gracefully', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockRejectedValue(new Error('API error'))

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const result = await getLensProfile(mockHandle)

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(result).toBeUndefined()

      consoleErrorSpy.mockRestore()
    })

    it('should handle profile without metadata', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: null,
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile(mockHandle)

      expect(result?.name).toBe('')
      expect(result?.picture).toBeUndefined()
    })

    it('should handle different namespaces', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'custom',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile('testuser.custom')

      expect(result?.handle).toBe('testuser.custom')
    })

    it('should handle profile with optimized picture', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
            coverPicture: {
              optimized: {
                uri: 'https://example.com/optimized.jpg',
              },
            },
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile(mockHandle)

      expect(result?.picture).toBe('https://example.com/optimized.jpg')
    })

    it('should handle profile without cover picture', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
            coverPicture: null,
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile(mockHandle)

      expect(result?.picture).toBeUndefined()
    })
  })

  describe('LensProfile type', () => {
    it('should have correct structure', async () => {
      const mockProfiles = [
        {
          handle: {
            localName: 'testuser',
            namespace: 'lens',
            ownedBy: mockAddress,
          },
          metadata: {
            displayName: 'Test User',
            coverPicture: {
              optimized: {
                uri: 'https://example.com/picture.jpg',
              },
            },
          },
        },
      ]

      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: mockProfiles })

      const result = await getLensProfile('testuser.lens')

      expect(result).toHaveProperty('handle')
      expect(result).toHaveProperty('name')
      expect(result).toHaveProperty('ownedBy')
      expect(result).toHaveProperty('picture')
    })
  })

  describe('error scenarios', () => {
    it('should handle network errors', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockRejectedValue(new Error('Network error'))

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const result = await getLensHandlesForAddress(mockAddress)

      expect(result).toBeUndefined()
      consoleErrorSpy.mockRestore()
    })

    it('should handle API timeout', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockRejectedValue(new Error('Timeout'))

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      const result = await getLensProfile('testuser.lens')

      expect(result).toBeUndefined()
      consoleErrorSpy.mockRestore()
    })

    it('should handle invalid response format', async () => {
      const mockFetchAll = getLensMock()
      mockFetchAll.mockResolvedValue({ items: null })

      await expect(getLensHandlesForAddress(mockAddress)).rejects.toThrow()
    })
  })
})
