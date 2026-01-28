import {
  AcceptedToken,
  getChainId,
  getTokenIcon,
  SupportedChain,
  supportedChains,
} from '@/types/chains'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'
import { getPriceForChain } from '@/utils/services/chainlink.service'
import {
  CURRENCIES,
  CryptoAsset,
  CryptoConfig,
  Currency,
  getChainIdForNetwork,
  getCryptoAssetsForNetwork,
  getCryptoConfig,
  getSupportedTokensForNetwork,
  getTokenAddressForNetwork,
  Network,
  NETWORKS,
} from '@/utils/walletConfig'

jest.mock('@/utils/services/chainlink.service')
jest.mock('@/types/chains', () => ({
  ...jest.requireActual('@/types/chains'),
  getChainId: jest.fn(),
  getTokenIcon: jest.fn(),
  supportedChains: [
    {
      acceptableTokens: [
        {
          contractAddress: '0xusdc',
          displayName: 'USD Coin',
          icon: '/usdc.png',
          token: 'USDC',
          walletSupported: true,
        },
        {
          contractAddress: '0xusdt',
          displayName: 'Tether',
          icon: '/usdt.png',
          token: 'USDT',
          walletSupported: true,
        },
      ],
      chain: 'arbitrum',
      id: 42161,
      image: '/arbitrum.png',
      name: 'Arbitrum',
      nativeTokenSymbol: 'ETH',
      walletSupported: true,
    },
    {
      acceptableTokens: [
        {
          contractAddress: '0xusdc',
          displayName: 'USD Coin',
          token: 'USDC',
          walletSupported: true,
        },
      ],
      chain: 'ethereum',
      id: 1,
      image: '/ethereum.png',
      name: 'Ethereum',
      nativeTokenSymbol: 'ETH',
      walletSupported: true,
    },
    {
      acceptableTokens: [
        {
          contractAddress: '0x0000000000000000000000000000000000000000',
          token: 'ETH',
          walletSupported: false,
        },
      ],
      chain: 'polygon',
      id: 137,
      image: '/polygon.png',
      name: 'Polygon',
      walletSupported: false,
    },
  ],
}))

jest.mock('@/utils/constants/meeting-types', () => ({
  supportedPaymentChains: ['arbitrum', 'ethereum', 'polygon'],
}))

describe('walletConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getPriceForChain as jest.Mock).mockResolvedValue('$1.00')
    ;(getTokenIcon as jest.Mock).mockReturnValue('/token-icon.png')
    ;(getChainId as jest.Mock).mockReturnValue(42161)
  })

  describe('CURRENCIES', () => {
    it('should export currency configurations', () => {
      expect(CURRENCIES).toBeDefined()
      expect(Array.isArray(CURRENCIES)).toBe(true)
      expect(CURRENCIES.length).toBeGreaterThan(0)
    })

    it('should include USD', () => {
      const usd = CURRENCIES.find(c => c.code === 'USD')
      expect(usd).toBeDefined()
      expect(usd?.name).toBe('US Dollar')
      expect(usd?.flag).toBe('/assets/currencies/usd.png')
    })

    it('should include EUR', () => {
      const eur = CURRENCIES.find(c => c.code === 'EUR')
      expect(eur).toBeDefined()
      expect(eur?.name).toBe('Euro')
      expect(eur?.flag).toBe('/assets/currencies/euro.png')
    })

    it('should include GBP', () => {
      const gbp = CURRENCIES.find(c => c.code === 'GBP')
      expect(gbp).toBeDefined()
      expect(gbp?.name).toBe('Pounds sterling')
      expect(gbp?.flag).toBe('/assets/currencies/pounds.png')
    })
  })

  describe('NETWORKS', () => {
    it('should export network configurations', () => {
      expect(NETWORKS).toBeDefined()
      expect(Array.isArray(NETWORKS)).toBe(true)
    })

    it('should include only wallet-supported chains', () => {
      const networkNames = NETWORKS.map(n => n.name)
      expect(networkNames).toContain('Arbitrum')
      expect(networkNames).toContain('Ethereum')
      expect(networkNames).not.toContain('Polygon')
    })

    it('should have correct structure for networks', () => {
      const network = NETWORKS[0]
      expect(network).toHaveProperty('name')
      expect(network).toHaveProperty('icon')
      expect(network).toHaveProperty('chainId')
    })

    it('should filter out chains without wallet-supported tokens', () => {
      const polygon = NETWORKS.find(n => n.name === 'Polygon')
      expect(polygon).toBeUndefined()
    })
  })

  describe('getCryptoConfig', () => {
    it('should return crypto configurations for wallet-supported chains', async () => {
      const result = await getCryptoConfig()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should fetch prices for tokens', async () => {
      await getCryptoConfig()

      expect(getPriceForChain).toHaveBeenCalled()
    })

    it('should group tokens by symbol across chains', async () => {
      const result = await getCryptoConfig()

      const usdc = result.find(c => c.symbol === 'USDC')
      expect(usdc).toBeDefined()
      expect(usdc?.chains).toBeDefined()
      expect(Object.keys(usdc?.chains || {}).length).toBeGreaterThan(0)
    })

    it('should include chain-specific token addresses', async () => {
      const result = await getCryptoConfig()

      const usdc = result.find(c => c.symbol === 'USDC')
      expect(usdc?.chains['Arbitrum']).toBeDefined()
      expect(usdc?.chains['Arbitrum'].tokenAddress).toBe('0xusdc')
      expect(usdc?.chains['Arbitrum'].chainId).toBe(42161)
    })

    it('should skip non-wallet-supported tokens', async () => {
      const result = await getCryptoConfig()

      const eth = result.find(c => c.symbol === 'ETH')
      expect(eth).toBeUndefined()
    })

    it('should use token icon from token info', async () => {
      const result = await getCryptoConfig()

      const usdc = result.find(c => c.symbol === 'USDC')
      expect(usdc?.icon).toBe('/usdc.png')
    })

    it('should fallback to getTokenIcon if no icon provided', async () => {
      ;(getTokenIcon as jest.Mock).mockReturnValue('/fallback-icon.png')

      const result = await getCryptoConfig()

      expect(result.length).toBeGreaterThan(0)
    })

    it('should include display name', async () => {
      const result = await getCryptoConfig()

      const usdc = result.find(c => c.symbol === 'USDC')
      expect(usdc?.name).toBe('USD Coin')
    })

    it('should add tokens from multiple chains', async () => {
      const result = await getCryptoConfig()

      const usdc = result.find(c => c.symbol === 'USDC')
      expect(usdc?.chains['Arbitrum']).toBeDefined()
      expect(usdc?.chains['Ethereum']).toBeDefined()
    })

    it('should include price from chainlink service', async () => {
      ;(getPriceForChain as jest.Mock).mockResolvedValue('$2.50')

      const result = await getCryptoConfig()

      expect(result[0].price).toBeDefined()
    })
  })

  describe('getCryptoAssetsForNetwork', () => {
    it('should return assets for valid network', async () => {
      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should return empty array for invalid network', async () => {
      const result = await getCryptoAssetsForNetwork('InvalidNetwork')

      expect(result).toEqual([])
    })

    it('should include zero balances', async () => {
      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(result[0].balance).toBe('0 USDC')
      expect(result[0].fullBalance).toBe('0')
      expect(result[0].usdValue).toBe('$0')
    })

    it('should include network name in assets', async () => {
      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(result[0].networkName).toBe('Arbitrum')
    })

    it('should include correct chainId', async () => {
      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(result[0].chainId).toBe(42161)
    })

    it('should include token address', async () => {
      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(result[0].tokenAddress).toBe('0xusdc')
    })

    it('should handle errors gracefully', async () => {
      jest.spyOn(console, 'warn').mockImplementation()
      ;(getPriceForChain as jest.Mock).mockRejectedValue(
        new Error('Price fetch failed')
      )

      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(console.warn).toHaveBeenCalledWith(
        'Failed to get dynamic crypto config:',
        expect.any(Error)
      )
      expect(result).toEqual([])
    })

    it('should include currency icon', async () => {
      const result = await getCryptoAssetsForNetwork('Arbitrum')

      expect(result[0].currencyIcon).toBeDefined()
    })
  })

  describe('getTokenAddressForNetwork', () => {
    it('should return token address for valid token and network', async () => {
      const result = await getTokenAddressForNetwork('USDC', 'Arbitrum')

      expect(result).toBe('0xusdc')
    })

    it('should return empty string for invalid token', async () => {
      const result = await getTokenAddressForNetwork('INVALID', 'Arbitrum')

      expect(result).toBe('')
    })

    it('should return empty string for invalid network', async () => {
      const result = await getTokenAddressForNetwork('USDC', 'InvalidNetwork')

      expect(result).toBe('')
    })

    it('should handle errors and return empty string', async () => {
      ;(getPriceForChain as jest.Mock).mockRejectedValue(
        new Error('Fetch failed')
      )

      const result = await getTokenAddressForNetwork('USDC', 'Arbitrum')

      expect(result).toBe('')
    })
  })

  describe('getChainIdForNetwork', () => {
    it('should return chainId for valid token and network', async () => {
      const result = await getChainIdForNetwork('USDC', 'Arbitrum')

      expect(result).toBe(42161)
    })

    it('should return default chainId for invalid token', async () => {
      ;(getChainId as jest.Mock).mockReturnValue(42161)

      const result = await getChainIdForNetwork('INVALID', 'Arbitrum')

      expect(result).toBe(42161)
      expect(getChainId).toHaveBeenCalledWith(SupportedChain.ARBITRUM)
    })

    it('should return default chainId for invalid network', async () => {
      ;(getChainId as jest.Mock).mockReturnValue(42161)

      const result = await getChainIdForNetwork('USDC', 'InvalidNetwork')

      expect(result).toBe(42161)
    })

    it('should handle errors and return default chainId', async () => {
      ;(getPriceForChain as jest.Mock).mockRejectedValue(
        new Error('Fetch failed')
      )
      ;(getChainId as jest.Mock).mockReturnValue(42161)

      const result = await getChainIdForNetwork('USDC', 'Arbitrum')

      expect(result).toBe(42161)
    })
  })

  describe('getSupportedTokensForNetwork', () => {
    it('should return token symbols for valid network', () => {
      const result = getSupportedTokensForNetwork('Arbitrum')

      expect(Array.isArray(result)).toBe(true)
      expect(result).toContain('USDC')
      expect(result).toContain('USDT')
    })

    it('should return empty array for invalid network', () => {
      const result = getSupportedTokensForNetwork('InvalidNetwork')

      expect(result).toEqual([])
    })

    it('should exclude native tokens (zero address)', () => {
      const result = getSupportedTokensForNetwork('Polygon')

      expect(result).not.toContain('ETH')
    })

    it('should only include wallet-supported chains', () => {
      const result = getSupportedTokensForNetwork('Polygon')

      expect(result).toEqual([])
    })

    it('should include all non-native tokens', () => {
      const result = getSupportedTokensForNetwork('Arbitrum')

      expect(result.length).toBe(2)
    })
  })

  describe('Type definitions', () => {
    it('should have Currency type', () => {
      const currency: Currency = {
        code: 'USD',
        flag: '/flag.png',
        name: 'US Dollar',
      }

      expect(currency.code).toBe('USD')
    })

    it('should have Network type', () => {
      const network: Network = {
        chainId: 1,
        icon: '/icon.png',
        name: 'Ethereum',
      }

      expect(network.chainId).toBe(1)
    })

    it('should have CryptoAsset type', () => {
      const asset: CryptoAsset = {
        balance: '0',
        chainId: 1,
        icon: '/icon.png',
        name: 'USDC',
        price: '$1.00',
        symbol: 'USDC',
        tokenAddress: '0xtoken',
        usdValue: '$0',
      }

      expect(asset.symbol).toBe('USDC')
    })

    it('should have CryptoConfig type', () => {
      const config: CryptoConfig = {
        chains: {
          Arbitrum: {
            chainId: 42161,
            tokenAddress: '0xtoken',
          },
        },
        icon: '/icon.png',
        name: 'USDC',
        price: '$1.00',
        symbol: 'USDC',
      }

      expect(config.chains['Arbitrum']).toBeDefined()
    })
  })
})
