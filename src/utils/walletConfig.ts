import {
  AcceptedToken,
  getChainId,
  getTokenIcon,
  SupportedChain,
  supportedChains,
} from '@/types/chains'
import { supportedPaymentChains } from '@/utils/constants/meeting-types'
import { getPriceForChain } from '@/utils/services/chainlink.service'

import { isProduction } from './constants'
import { zeroAddress } from './generic_utils'

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
  // Dynamic chain information - no more hardcoded chain properties
  chains: {
    [chainName: string]: {
      tokenAddress: string
      chainId: number
    }
  }
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

export const NETWORKS: Network[] = supportedChains
  .filter(
    chain =>
      chain.walletSupported && supportedPaymentChains.includes(chain.chain)
  )
  .map(chain => ({
    name: chain.name,
    icon: chain.image,
    chainId: chain.id,
  }))

export const getCryptoConfig = async (): Promise<CryptoConfig[]> => {
  const walletSupportedChains = supportedChains.filter(
    chain =>
      chain.walletSupported && supportedPaymentChains.includes(chain.chain)
  )

  const configs: CryptoConfig[] = []

  for (const chain of walletSupportedChains) {
    // Get tokens for this chain
    const chainTokens = chain.acceptableTokens.filter(
      token => token.contractAddress !== zeroAddress // Exclude native tokens
    )

    for (const tokenInfo of chainTokens) {
      // Skip tokens that are not wallet-supported
      if (!tokenInfo.walletSupported) {
        continue
      }

      const existingConfig = configs.find(
        config => config.symbol === tokenInfo.token
      )

      if (existingConfig) {
        // Add additional chain info to existing config dynamically
        existingConfig.chains[chain.name] = {
          tokenAddress: tokenInfo.contractAddress,
          chainId: chain.id,
        }

        if (!existingConfig.icon && tokenInfo.icon) {
          existingConfig.icon = tokenInfo.icon
        }

        if (!existingConfig.icon) {
          existingConfig.icon = getTokenIcon(tokenInfo.token) || ''
        }
      } else {
        const price = await getPriceForChain(chain.chain, tokenInfo.token)

        const config: CryptoConfig = {
          name: tokenInfo.displayName || tokenInfo.token,
          symbol: tokenInfo.token,
          icon: tokenInfo.icon || getTokenIcon(tokenInfo.token) || '',
          price: price,
          chains: {
            [chain.name]: {
              tokenAddress: tokenInfo.contractAddress,
              chainId: chain.id,
            },
          },
        }
        configs.push(config)
      }
    }
  }

  return configs
}

export const getCryptoAssetsForNetwork = async (
  networkName: string
): Promise<CryptoAsset[]> => {
  const network = NETWORKS.find(n => n.name === networkName)
  if (!network) return []

  try {
    const cryptoConfig = await getCryptoConfig()
    return cryptoConfig.map(crypto => {
      const chainInfo = crypto.chains[networkName]
      return {
        ...crypto,
        balance: '0 ' + crypto.symbol,
        usdValue: '$0',
        fullBalance: '0',
        currencyIcon:
          crypto.icon || getTokenIcon(crypto.symbol as AcceptedToken) || '',
        tokenAddress: chainInfo?.tokenAddress || '',
        chainId: chainInfo?.chainId || network.chainId,
        networkName: networkName,
      }
    })
  } catch (error) {
    console.warn('Failed to get dynamic crypto config:', error)
    return []
  }
}

export const getTokenAddressForNetwork = async (
  tokenSymbol: string,
  networkName: string
): Promise<string> => {
  try {
    const configs = await getCryptoConfig()
    const config = configs.find(c => c.symbol === tokenSymbol)
    if (!config || !config.chains[networkName]) return ''
    return config.chains[networkName].tokenAddress
  } catch {
    return ''
  }
}

// Helper function to get chain ID for a specific network and token
export const getChainIdForNetwork = async (
  tokenSymbol: string,
  networkName: string
): Promise<number> => {
  try {
    const configs = await getCryptoConfig()
    const config = configs.find(c => c.symbol === tokenSymbol)
    if (!config || !config.chains[networkName])
      return getChainId(SupportedChain.ARBITRUM)
    return config.chains[networkName].chainId
  } catch {
    return getChainId(SupportedChain.ARBITRUM)
  }
}

// Helper function to get supported tokens for a network
export const getSupportedTokensForNetwork = (networkName: string): string[] => {
  const chain = supportedChains.find(
    c => c.name === networkName && c.walletSupported
  )
  if (!chain) return []

  return chain.acceptableTokens
    .filter(token => token.contractAddress !== zeroAddress) // Exclude native tokens
    .map(token => token.token)
}
