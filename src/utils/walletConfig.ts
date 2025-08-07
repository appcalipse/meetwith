import {
  AcceptedToken,
  getChainId,
  getChainInfo,
  getNetworkDisplayName,
  getTokenAddress,
  SupportedChain,
} from '@/types/chains'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'
import { getPriceForChain } from '@/utils/services/chainlink.service'

export interface Currency {
  name: string
  code: string
  flag: string
}

export interface Network {
  name: string
  icon: string
  chainId: number
}

export interface CryptoAsset {
  name: string
  symbol: string
  icon: string
  price: string
  balance: string
  usdValue: string
  tokenAddress: string
  chainId: number
  fullBalance?: string
  currencyIcon?: string
  networkName?: string
  isLoading?: boolean
  error?: unknown
}

export interface CryptoConfig {
  name: string
  symbol: string
  icon: string
  price: string
  tokenAddress: string
  celoChainId: number
  arbitrumTokenAddress?: string
  arbitrumChainId?: number
  arbitrumSepoliaTokenAddress?: string
  arbitrumSepoliaChainId?: number
}

// Centralized currency configuration
export const CURRENCIES: Currency[] = [
  { name: 'US Dollar', code: 'USD', flag: '/assets/currencies/usd.png' },
  { name: 'Euro', code: 'EUR', flag: '/assets/currencies/euro.png' },
  {
    name: 'Pounds sterling',
    code: 'GBP',
    flag: '/assets/currencies/pounds.png',
  },
]

export const NETWORKS: Network[] = supportedPaymentChains.map(chain => {
  const chainInfo = getChainInfo(chain)
  return {
    name: getNetworkDisplayName(chain),
    icon: chainInfo?.image || '/assets/chains/Arbitrum.svg',
    chainId: getChainId(chain),
  }
})

export const getCryptoConfig = async (): Promise<CryptoConfig[]> => {
  return [
    {
      name: 'Celo Dollar',
      symbol: 'cUSD',
      icon: '/assets/tokens/CUSD.png',
      price: await getPriceForChain(SupportedChain.CELO, AcceptedToken.CUSD),
      tokenAddress: getTokenAddress(SupportedChain.CELO, AcceptedToken.CUSD),
      celoChainId: getChainId(SupportedChain.CELO),
    },
    {
      name: 'US Dollar Coin',
      symbol: 'USDC',
      icon: '/assets/tokens/USDC.svg',
      price: await getPriceForChain(SupportedChain.CELO, AcceptedToken.USDC),
      tokenAddress: getTokenAddress(SupportedChain.CELO, AcceptedToken.USDC),
      celoChainId: getChainId(SupportedChain.CELO),
      arbitrumTokenAddress: getTokenAddress(
        SupportedChain.ARBITRUM,
        AcceptedToken.USDC
      ),
      arbitrumChainId: getChainId(SupportedChain.ARBITRUM),
      arbitrumSepoliaTokenAddress: getTokenAddress(
        SupportedChain.ARBITRUM_SEPOLIA,
        AcceptedToken.USDC
      ),
      arbitrumSepoliaChainId: getChainId(SupportedChain.ARBITRUM_SEPOLIA),
    },
    {
      name: 'Tether',
      symbol: 'USDT',
      icon: '/assets/tokens/USDT.svg',
      price: await getPriceForChain(SupportedChain.CELO, AcceptedToken.USDT),
      tokenAddress: getTokenAddress(SupportedChain.CELO, AcceptedToken.USDT),
      celoChainId: getChainId(SupportedChain.CELO),
      arbitrumTokenAddress: getTokenAddress(
        SupportedChain.ARBITRUM,
        AcceptedToken.USDT
      ),
      arbitrumChainId: getChainId(SupportedChain.ARBITRUM),
    },
  ]
}

export const getCryptoAssetsForNetwork = async (
  networkName: string
): Promise<CryptoAsset[]> => {
  const network = NETWORKS.find(n => n.name === networkName)
  if (!network) return []

  try {
    const cryptoConfig = await getCryptoConfig()
    return cryptoConfig.map(crypto => ({
      ...crypto,
      balance: '0 ' + crypto.symbol,
      usdValue: '$0',
      fullBalance: '0',
      currencyIcon: crypto.icon,
      chainId: network.chainId,
      networkName: networkName,
    }))
  } catch (error) {
    console.warn('Failed to get dynamic crypto config:', error)
    return []
  }
}

export const getTokenAddressForNetwork = (
  tokenSymbol: string,
  networkName: string
): string => {
  // Map token symbols to AcceptedToken enum
  const tokenMap: Record<string, AcceptedToken> = {
    cUSD: AcceptedToken.CUSD,
    USDC: AcceptedToken.USDC,
    USDT: AcceptedToken.USDT,
  }

  const token = tokenMap[tokenSymbol]
  if (!token) return ''

  // Map network names to SupportedChain enum
  const networkMap: Record<string, SupportedChain> = {
    Celo: SupportedChain.CELO,
    Arbitrum: SupportedChain.ARBITRUM,
    'Arbitrum Sepolia': SupportedChain.ARBITRUM_SEPOLIA,
  }

  const chain = networkMap[networkName]
  if (!chain) return ''

  return getTokenAddress(chain, token)
}

// Helper function to get chain ID for a specific network and token
export const getChainIdForNetwork = (
  tokenSymbol: string,
  networkName: string
): number => {
  // Map network names to SupportedChain enum
  const networkMap: Record<string, SupportedChain> = {
    Celo: SupportedChain.CELO,
    Arbitrum: SupportedChain.ARBITRUM,
    'Arbitrum Sepolia': SupportedChain.ARBITRUM_SEPOLIA,
  }

  const chain = networkMap[networkName]
  if (!chain) return getChainId(SupportedChain.ARBITRUM)

  return getChainId(chain)
}

// Helper function to get supported tokens for a network
export const getSupportedTokensForNetwork = (networkName: string): string[] => {
  switch (networkName) {
    case 'Celo':
      return ['cUSD', 'USDC', 'USDT']
    case 'Arbitrum':
      return ['USDC', 'USDT']
    case 'Arbitrum Sepolia':
      return ['USDC']
    default:
      return []
  }
}
