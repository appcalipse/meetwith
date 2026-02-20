/**
 * Tests for wallet-kit
 * Testing WalletConnect integration utilities
 */

// Mock @reown/walletkit
jest.mock('@reown/walletkit', () => ({
  WalletKit: {
    init: jest.fn(),
  },
}))

// Mock @walletconnect/core
jest.mock('@walletconnect/core', () => ({
  Core: jest.fn().mockImplementation(() => ({
    projectId: 'test-project-id',
  })),
}))

describe('wallet-kit', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  describe('getWalletKit', () => {
    it('should initialize WalletKit on first call', async () => {
      const { WalletKit } = require('@reown/walletkit')
      const mockWalletKit = {
        pair: jest.fn(),
        disconnect: jest.fn(),
      }

      ;(WalletKit.init as jest.Mock).mockResolvedValue(mockWalletKit)

      const { getWalletKit } = require('@/utils/wallet-kit')
      const result = await getWalletKit()

      expect(WalletKit.init).toHaveBeenCalledWith({
        core: expect.any(Object),
        metadata: expect.objectContaining({
          name: 'Meetwith',
          description: 'Meetwith Wallet Connect client',
          url: 'https://meetwith.xyz',
        }),
      })

      expect(result).toBe(mockWalletKit)
    })

    it('should return cached instance on subsequent calls', async () => {
      const { WalletKit } = require('@reown/walletkit')
      const mockWalletKit = {
        pair: jest.fn(),
        disconnect: jest.fn(),
      }

      ;(WalletKit.init as jest.Mock).mockResolvedValue(mockWalletKit)

      const { getWalletKit } = require('@/utils/wallet-kit')
      const first = await getWalletKit()
      const second = await getWalletKit()

      expect(WalletKit.init).toHaveBeenCalledTimes(1)
      expect(first).toBe(second)
    })

    it('should include correct metadata', async () => {
      const { WalletKit } = require('@reown/walletkit')
      const mockWalletKit = {}

      ;(WalletKit.init as jest.Mock).mockResolvedValue(mockWalletKit)

      const { getWalletKit } = require('@/utils/wallet-kit')
      await getWalletKit()

      const initCall = (WalletKit.init as jest.Mock).mock.calls[0][0]
      
      expect(initCall.metadata.name).toBe('Meetwith')
      expect(initCall.metadata.url).toBe('https://meetwith.xyz')
      expect(initCall.metadata.icons).toHaveLength(1)
      expect(initCall.metadata.icons[0]).toContain('logo_mail.png')
    })

    it('should handle initialization errors', async () => {
      const { WalletKit } = require('@reown/walletkit')
      ;(WalletKit.init as jest.Mock).mockRejectedValue(
        new Error('Init failed')
      )

      const { getWalletKit } = require('@/utils/wallet-kit')
      await expect(getWalletKit()).rejects.toThrow('Init failed')
    })

    it('should initialize Core with project ID', async () => {
      const { WalletKit } = require('@reown/walletkit')
      const { Core } = require('@walletconnect/core')
      const mockWalletKit = {}

      ;(WalletKit.init as jest.Mock).mockResolvedValue(mockWalletKit)

      const { getWalletKit } = require('@/utils/wallet-kit')
      await getWalletKit()

      expect(Core).toHaveBeenCalledWith({
        projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
      })
    })
  })

  describe('singleton behavior', () => {
    it('should maintain singleton across module', async () => {
      const { WalletKit } = require('@reown/walletkit')
      const mockWalletKit1 = { id: 'wallet1' }
      const mockWalletKit2 = { id: 'wallet2' }

      ;(WalletKit.init as jest.Mock)
        .mockResolvedValueOnce(mockWalletKit1)
        .mockResolvedValueOnce(mockWalletKit2)

      const { getWalletKit } = require('@/utils/wallet-kit')
      const result1 = await getWalletKit()
      const result2 = await getWalletKit()
      const result3 = await getWalletKit()

      // Should only initialize once
      expect(WalletKit.init).toHaveBeenCalledTimes(1)
      // All results should be the same instance
      expect(result1).toBe(result2)
      expect(result2).toBe(result3)
      expect(result1).toBe(mockWalletKit1)
    })
  })
})
