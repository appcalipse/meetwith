import { useQueries } from '@tanstack/react-query'
import { useMemo } from 'react'

import useAccountContext from '@/hooks/useAccountContext'
import { getTokenIcon, SupportedChain, supportedChains } from '@/types/chains'
import { zeroAddress } from '@/utils/generic_utils'
import { getCryptoTokenBalance } from '@/utils/token.service'
import { CryptoConfig } from '@/utils/walletConfig'

import { useCryptoConfig } from './useCryptoConfig'

interface UseCryptoBalancesProps {
  selectedChain: SupportedChain
}

export const useCryptoBalances = ({
  selectedChain,
}: UseCryptoBalancesProps) => {
  const { data: cryptoConfig, isLoading: isConfigLoading } = useCryptoConfig()
  const currentAccount = useAccountContext()

  const config = cryptoConfig || []

  const chainInfo = useMemo(() => {
    if (!selectedChain) return null
    return supportedChains.find(chain => chain.chain === selectedChain)
  }, [selectedChain])

  // Filter chains to only include wallet-supported ones
  const walletSupportedChains = useMemo(() => {
    return supportedChains.filter(chain => chain.walletSupported)
  }, [])

  // Map network display names to SupportedChain enum using chains.ts data
  const networkMap: Record<string, SupportedChain> = useMemo(() => {
    const map: Record<string, SupportedChain> = {}
    walletSupportedChains.forEach(chain => {
      map[chain.name] = chain.chain
    })
    return map
  }, [walletSupportedChains])

  const chainTokens = useMemo(() => {
    if (!chainInfo || !selectedChain) {
      return []
    }

    return chainInfo.acceptableTokens
      .filter(tokenInfo => tokenInfo.contractAddress !== zeroAddress) // Exclude native tokens
      .filter(tokenInfo => tokenInfo.walletSupported) // Only include wallet-supported tokens
      .map(tokenInfo => ({
        chain: selectedChain,
        chainId: chainInfo.id,
        token: tokenInfo.token,
        tokenAddress: tokenInfo.contractAddress,
      }))
  }, [chainInfo, selectedChain])

  // Fetch all balances in parallel using useQueries
  const balanceQueries = useQueries({
    queries: chainTokens.map(tokenInfo => ({
      cacheTime: 0,
      enabled:
        !!currentAccount?.address &&
        !!tokenInfo.tokenAddress &&
        tokenInfo.chainId !== 0,
      queryFn: async () => {
        return getCryptoTokenBalance(
          currentAccount?.address || '',
          tokenInfo.tokenAddress,
          tokenInfo.chain
        )
      },
      queryKey: [
        'token-balance',
        currentAccount?.address,
        tokenInfo.tokenAddress,
        tokenInfo.chainId,
      ],
      refetchInterval: 10000,
      staleTime: 0,
    })),
  })

  // Combine crypto assets with real balances
  const cryptoAssetsWithBalances = useMemo(() => {
    if (
      !config ||
      config.length === 0 ||
      isConfigLoading ||
      !chainInfo ||
      !selectedChain
    ) {
      return []
    }

    return chainTokens.map((tokenInfo, index) => {
      const balanceQuery = balanceQueries[index]
      const balance = balanceQuery?.data?.balance || 0
      const isLoading = balanceQuery?.isLoading || false
      const error = balanceQuery?.error

      // Find the corresponding config item based on token type
      const configItem = config.find((item: CryptoConfig) => {
        return item.symbol === tokenInfo.token
      }) as CryptoConfig | undefined

      const tokenAddress = tokenInfo.tokenAddress
      const chainId = tokenInfo.chainId

      return {
        balance: balance
          ? `${balance.toLocaleString()} ${tokenInfo.token}`
          : `0 ${tokenInfo.token}`,
        chainId,
        currencyIcon: configItem?.icon || getTokenIcon(tokenInfo.token) || '',
        error,
        fullBalance: balance ? balance.toString() : '0',
        icon: configItem?.icon || getTokenIcon(tokenInfo.token) || '',
        isLoading: isLoading || isConfigLoading,
        name: configItem?.name || tokenInfo.token,
        networkName: chainInfo?.name || selectedChain,
        price: configItem?.price || '0',
        symbol: configItem?.symbol || tokenInfo.token,
        tokenAddress,
        usdValue: balance ? `$${balance.toLocaleString()}` : '$0',
      }
    })
  }, [
    selectedChain,
    config,
    isConfigLoading,
    chainInfo,
    chainTokens,
    balanceQueries,
    networkMap,
  ])

  return {
    balances: {
      ...chainTokens.reduce((acc, tokenInfo, index) => {
        const balanceQuery = balanceQueries[index]
        const key = `${tokenInfo.tokenAddress.toLowerCase()}${
          chainInfo?.name?.replace(/\s+/g, '') || selectedChain
        }Balance`
        acc[key] = balanceQuery?.data || { balance: 0 }
        return acc
      }, {} as Record<string, { balance: number }>),
    },
    cryptoAssetsWithBalances,
  }
}
